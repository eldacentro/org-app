/**
 * Lógica pura del módulo de Territorios: vencimientos, estados, colores y
 * helpers de geometría. Sin dependencias de React/Firestore para poder testear.
 */
import { addDays, format, subMonths } from 'date-fns';
import type { MultiPolygon, Polygon } from 'geojson';
import {
  Territory,
  TerritoryStatsRange,
  TerritoryZone,
} from '@definition/territories';

/** Fecha de vencimiento (ISO) a partir de la entrega y los días configurados. */
export const computeDueAt = (
  assignedAt: string,
  daysUntilExpiration: number
): string => {
  return addDays(new Date(assignedAt), daysUntilExpiration).toISOString();
};

/** ¿Está atrasada una asignación abierta? (según días de "atrasado"). */
export const isOverdue = (
  assignedAt: string,
  daysUntilOverdue: number,
  now: Date = new Date()
): boolean => {
  return addDays(new Date(assignedAt), daysUntilOverdue) < now;
};

/** Días transcurridos desde una fecha ISO. */
export const daysSince = (iso: string, now: Date = new Date()): number => {
  return Math.floor(
    (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
};

export const getZoneColor = (
  zoneId: string,
  zones: TerritoryZone[]
): string => {
  return zones.find((z) => z.id === zoneId)?.color ?? '#306CB4';
};

export const getZoneName = (
  zoneId: string,
  zones: TerritoryZone[]
): string => {
  return zones.find((z) => z.id === zoneId)?.nombre ?? '—';
};

/** Etiqueta de un territorio: "número — nombre" o solo número. */
export const territoryLabel = (t: Territory): string => {
  return t.nombre ? `${t.numero} — ${t.nombre}` : t.numero;
};

// ── Geometría ──

const eachCoord = (
  geometry: Polygon | MultiPolygon,
  fn: (lng: number, lat: number) => void
) => {
  const rings =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flat();
  rings.forEach((ring) =>
    (ring as number[][]).forEach(([lng, lat]) => fn(lng, lat))
  );
};

/** Bounding box [[south, west], [north, east]] en orden lat/lng (Leaflet). */
export const geometryBounds = (
  geometry: Polygon | MultiPolygon
): [[number, number], [number, number]] | null => {
  let minLat = Infinity,
    minLng = Infinity,
    maxLat = -Infinity,
    maxLng = -Infinity;
  let any = false;
  eachCoord(geometry, (lng, lat) => {
    any = true;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  if (!any) return null;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
};

/** Centroide aproximado (media de vértices) en orden lat/lng (Leaflet). */
export const geometryCenter = (
  geometry: Polygon | MultiPolygon
): [number, number] | null => {
  let sumLat = 0,
    sumLng = 0,
    n = 0;
  eachCoord(geometry, (lng, lat) => {
    sumLat += lat;
    sumLng += lng;
    n += 1;
  });
  if (n === 0) return null;
  return [sumLat / n, sumLng / n];
};

/** Fecha de inicio del rango de estadísticas seleccionado. */
export const statsRangeStart = (
  range: TerritoryStatsRange,
  now: Date = new Date()
): Date => {
  if (range === 'one_year') return subMonths(now, 12);
  if (range === 'service_year') return serviceYearRange(now).start;
  return new Date(0);
};

/** Formatea una fecha ISO según el formato configurado (ej. dd-MM-yyyy). */
export const formatTerritoryDate = (
  iso: string | undefined,
  dateFormat: string
): string => {
  if (!iso) return '—';
  try {
    return format(new Date(iso), dateFormat);
  } catch {
    return iso.slice(0, 10);
  }
};

/** Año de servicio (Sep→Ago) de una fecha. Devuelve [inicio, fin) en ISO. */
export const serviceYearRange = (
  ref: Date = new Date()
): { start: Date; end: Date; label: string } => {
  const year = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1;
  return {
    start: new Date(year, 8, 1), // 1 sep
    end: new Date(year + 1, 8, 1), // 1 sep siguiente
    label: `${year}/${year + 1}`,
  };
};
