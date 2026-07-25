/**
 * Utilidades para importar/exportar geometría de territorios desde/hacia KML.
 * KMZ = zip que contiene un .kml (se descomprime con jszip, ya instalado).
 */
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import JSZip from 'jszip';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';

export type ParsedTerritory = {
  /** Nombre del Placemark (suele ser el número/nombre del territorio). */
  name: string;
  geometry: Polygon | MultiPolygon;
};

/**
 * Extrae los polígonos de CUALQUIER geometría de un Placemark.
 *
 * Un territorio partido en varias piezas (por una avenida o una vía) se
 * escribe en KML como `<MultiGeometry>`, y togeojson lo devuelve como
 * `GeometryCollection` — nunca como `MultiPolygon`. Como antes solo se
 * aceptaban `Polygon`/`MultiPolygon`, esos territorios se perdían EN
 * SILENCIO al importar: ni salían en la lista ni se avisaba de nada. Y era
 * el propio KML que exporta esta app (y el de Territory Helper), así que
 * exportar e importar de vuelta perdía datos.
 *
 * También ignora los puntos/líneas que algunas herramientas añaden dentro
 * del mismo Placemark para colocar la etiqueta.
 */
const collectPolygons = (geometry: Geometry | null): number[][][][] => {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.flatMap((g) => collectPolygons(g));
  }
  return [];
};

/** Un anillo válido tiene al menos 4 posiciones (la última cierra) y
 *  coordenadas dentro del rango geográfico. Un KML con coordenadas
 *  proyectadas (UTM en metros) pasaba el parseo sin quejarse y creaba los
 *  territorios en un punto absurdo del planeta. */
const isValidRing = (ring: number[][]): boolean =>
  Array.isArray(ring) &&
  ring.length >= 4 &&
  ring.every(
    (p) =>
      Array.isArray(p) &&
      p.length >= 2 &&
      Number.isFinite(p[0]) &&
      Number.isFinite(p[1]) &&
      p[0] >= -180 &&
      p[0] <= 180 &&
      p[1] >= -90 &&
      p[1] <= 90
  );

const parseKmlString = (text: string): ParsedTerritory[] => {
  const dom = new DOMParser().parseFromString(text, 'text/xml');

  // DOMParser nunca lanza con XML inválido: en su lugar devuelve un
  // documento cuyo root es un <parsererror>. Sin este chequeo, un archivo
  // corrupto o con la extensión equivocada termina mostrando el genérico
  // "no se encontraron polígonos", indistinguible de un KML válido sin
  // polígonos.
  if (dom.getElementsByTagName('parsererror').length > 0) {
    throw new Error('El archivo KML no es válido o está dañado.');
  }

  const geojson = kmlToGeoJson(dom) as FeatureCollection;

  return geojson.features
    .map((f: Feature) => {
      const polys = collectPolygons(f.geometry).filter((rings) =>
        rings.every(isValidRing)
      );
      if (polys.length === 0) return null;
      return {
        name: String(f.properties?.name ?? f.properties?.Name ?? '').trim(),
        // Una sola pieza sigue siendo Polygon (no cambia nada de lo que ya
        // funcionaba); varias piezas se unen en un MultiPolygon.
        geometry:
          polys.length === 1
            ? ({ type: 'Polygon', coordinates: polys[0] } as Polygon)
            : ({ type: 'MultiPolygon', coordinates: polys } as MultiPolygon),
      };
    })
    .filter((t): t is ParsedTerritory => t !== null);
};

/** Parsea un fichero KML o KMZ a una lista de territorios (nombre + geometría). */
export const parseKmlFile = async (
  file: File
): Promise<ParsedTerritory[]> => {
  const isKmz =
    file.name.toLowerCase().endsWith('.kmz') ||
    file.type === 'application/vnd.google-earth.kmz';

  if (!isKmz) {
    return parseKmlString(await file.text());
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const kmlEntry = Object.values(zip.files).find((f) =>
    f.name.toLowerCase().endsWith('.kml')
  );
  if (!kmlEntry) throw new Error('El archivo KMZ no contiene ningún .kml');
  return parseKmlString(await kmlEntry.async('text'));
};

const ringToCoords = (ring: number[][]) =>
  ring.map(([lng, lat]) => `${lng},${lat},0`).join(' ');

const polygonKml = (coords: number[][][]) => {
  const [outer, ...inners] = coords;
  const inner = inners
    .map(
      (r) =>
        `<innerBoundaryIs><LinearRing><coordinates>${ringToCoords(
          r
        )}</coordinates></LinearRing></innerBoundaryIs>`
    )
    .join('');
  return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ringToCoords(
    outer
  )}</coordinates></LinearRing></outerBoundaryIs>${inner}</Polygon>`;
};

const geometryKml = (geometry: Polygon | MultiPolygon) =>
  geometry.type === 'Polygon'
    ? polygonKml(geometry.coordinates)
    : `<MultiGeometry>${geometry.coordinates.map((p) => polygonKml(p)).join('')}</MultiGeometry>`;

/** Escapa el texto que va dentro de un nodo XML. Sin esto, un solo nombre
 *  de territorio con "&" (p. ej. "12 — Barrio Nuevo & La Estación") producía
 *  un KML inválido que Google Earth, Territory Helper y la propia app
 *  rechazaban al abrirlo — y el error aparecía lejos de la causa. */
const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const placemark = (name: string, geometry: Polygon | MultiPolygon) =>
  `<Placemark><name>${xmlEscape(name)}</name>${geometryKml(geometry)}</Placemark>`;

/** Convierte una geometría de territorio a un documento KML (export). */
export const geometryToKml = (
  name: string,
  geometry: Polygon | MultiPolygon
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemark(
    name,
    geometry
  )}</Document></kml>`;

/** Convierte varios territorios a un único documento KML (export masivo). */
export const territoriesToKml = (
  items: { name: string; geometry: Polygon | MultiPolygon }[]
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${items
    .map((it) => placemark(it.name, it.geometry))
    .join('')}</Document></kml>`;
