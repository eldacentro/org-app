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

/** Fecha de "Vence" (ISO) a partir de la entrega y los días de "atrasado" —
 *  mismo umbral que isOverdue, para que al pasar "Vence" la asignación
 *  quede directamente como "Atrasada" (antes había un umbral intermedio
 *  "Vencido" separado y más corto, que solo generaba confusión). */
export const computeDueAt = (
  assignedAt: string,
  daysUntilOverdue: number
): string => {
  return addDays(new Date(assignedAt), daysUntilOverdue).toISOString();
};

/** ¿Está atrasada una asignación abierta? (según días de "atrasado"). */
export const isOverdue = (
  assignedAt: string,
  daysUntilOverdue: number,
  now: Date = new Date()
): boolean => {
  return addDays(new Date(assignedAt), daysUntilOverdue) < now;
};

/**
 * ¿Está un territorio libre "en descanso" tras devolverse trabajado? Es
 * decir: no tiene asignación abierta, y no ha pasado todavía el tiempo de
 * descanso configurado desde su último trabajo (lastWorkedAt). Un
 * territorio sin lastWorkedAt (nunca trabajado) nunca está en descanso.
 */
export const isInCooldown = (
  territory: Territory,
  daysUntilReassignable: number,
  now: Date = new Date()
): boolean => {
  if (territory.openAssignmentId || !territory.lastWorkedAt) return false;
  return addDays(new Date(territory.lastWorkedAt), daysUntilReassignable) > now;
};

/**
 * ¿Ya terminó la campaña? `fechaFin` se guarda como el INSTANTE que devuelve
 * el selector de fecha (medianoche del día elegido), así que comparar
 * directamente `fechaFin < ahora` daba la campaña por terminada al empezar
 * su último día — se perdía esa jornada completa de predicación. Aquí se
 * compara contra el FINAL de ese día.
 */
export const isCampaignOver = (
  fechaFin: string,
  now: Date = new Date()
): boolean => {
  const end = new Date(fechaFin);
  end.setHours(23, 59, 59, 999);
  return end < now;
};

/** ¿La campaña está en curso ahora mismo (ya empezó y aún no ha terminado)? */
export const isCampaignRunning = (
  fechaInicio: string,
  fechaFin: string,
  now: Date = new Date()
): boolean => new Date(fechaInicio) <= now && !isCampaignOver(fechaFin, now);

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
