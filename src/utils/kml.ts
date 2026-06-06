/**
 * Utilidades para importar/exportar geometría de territorios desde/hacia KML.
 * KMZ = zip que contiene un .kml (se descomprime con jszip, ya instalado).
 */
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import JSZip from 'jszip';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';

export type ParsedTerritory = {
  /** Nombre del Placemark (suele ser el número/nombre del territorio). */
  name: string;
  geometry: Polygon | MultiPolygon;
};

const parseKmlString = (text: string): ParsedTerritory[] => {
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  const geojson = kmlToGeoJson(dom) as FeatureCollection;

  return geojson.features
    .filter(
      (f): f is Feature<Polygon | MultiPolygon> =>
        !!f.geometry &&
        (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
    )
    .map((f) => ({
      name: String(f.properties?.name ?? f.properties?.Name ?? '').trim(),
      geometry: f.geometry,
    }));
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

const placemark = (name: string, geometry: Polygon | MultiPolygon) =>
  `<Placemark><name>${name}</name>${geometryKml(geometry)}</Placemark>`;

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
