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
 * ¿Cuántos días lleva descansando?
 *
 * La cuenta arranca en `lastWorkedAt` —la fecha en que se devolvió trabajado—
 * y no en `updatedAt`, que es la del último cambio del registro: `updatedAt`
 * se mueve al editar las notas, al cambiar las etiquetas o al retocar el mapa,
 * y entonces el número diría cuándo se tocó la ficha, no cuánto lleva
 * descansando. Es además la MISMA fecha desde la que cuenta `isInCooldown`,
 * así que el número y la etiqueta no pueden contradecirse.
 *
 * Devuelve null si nunca se ha trabajado (y entonces nunca está en descanso).
 */
export const daysInCooldown = (territory: Territory): number | null => {
  if (!territory.lastWorkedAt) return null;
  return Math.max(0, daysSince(territory.lastWorkedAt));
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

/**
 * Cuándo vence una asignación.
 *
 * Las normales, a los días de "atrasado" que diga la configuración. Las de
 * CAMPAÑA, el día que termina la campaña: es su último día para hacerlo, y
 * decirle a un hermano "vence el 24 de diciembre" por un territorio de una
 * campaña que acaba en septiembre es decirle que tiene tres meses cuando
 * tiene dos semanas.
 *
 * Devuelve el final de ese día, no su medianoche: si no, la asignación
 * vencería al empezar su último día y se perdería la jornada entera —el
 * mismo cuidado que se tiene en `isCampaignOver`.
 */
export const dueAtDeAsignacion = (
  assignment: { assignedAt: string; campaignId?: string },
  campaigns: { id: string; fechaFin: string }[],
  daysUntilOverdue: number
): string => {
  const campana = assignment.campaignId
    ? campaigns.find((c) => c.id === assignment.campaignId)
    : undefined;

  if (!campana) return computeDueAt(assignment.assignedAt, daysUntilOverdue);

  const fin = new Date(campana.fechaFin);
  fin.setHours(23, 59, 59, 999);
  return fin.toISOString();
};

/**
 * ¿Está atrasada esta asignación?
 *
 * Por su fecha de vencimiento si la tiene —que en las de campaña es el fin de
 * la campaña, no los días de la configuración— y por la fórmula solo cuando
 * falta (registros anteriores a que existiera `dueAt`).
 */
export const estaAtrasada = (
  assignment: { assignedAt: string; dueAt?: string; returnedAt?: string | null },
  daysUntilOverdue: number,
  now: Date = new Date()
): boolean => {
  if (assignment.returnedAt) return false;
  if (assignment.dueAt) return new Date(assignment.dueAt) < now;
  return isOverdue(assignment.assignedAt, daysUntilOverdue, now);
};

/** ¿La campaña está en curso ahora mismo (ya empezó y aún no ha terminado)? */
export const isCampaignRunning = (
  fechaInicio: string,
  fechaFin: string,
  now: Date = new Date()
): boolean => new Date(fechaInicio) <= now && !isCampaignOver(fechaFin, now);

/**
 * Título del aviso de "territorio atrasado".
 *
 * Es una constante y no un texto suelto porque lo escriben y lo LEEN sitios
 * distintos: quien manda el aviso, quien mira si ya se mandó (para apagar el
 * botón durante unos días) y la campanita, que por él decide si ofrecer
 * "Entregar territorio" o solo "Ver territorio". Escrito a mano en cuatro
 * ficheros, el día que alguien lo retoque en uno los otros tres dejan de
 * reconocerlo sin que falle nada.
 *
 * El CUERPO del mensaje sí lo escribe el responsable en Configuración; el
 * título no.
 */
export const AVISO_ATRASADO_TITULO = 'Territorio atrasado';

/** Títulos de los avisos que van a un RESPONSABLE, no al publicador. */
export const AVISO_DEVUELTO_TITULO = 'Territorio devuelto';
export const AVISO_DIRECCION_TITULO = 'Dirección pendiente de aprobar';

/**
 * ¿Este aviso es solo para enterarse?
 *
 * Los que le llegan a un responsable —"X devolvió el 12 sin trabajar", "X
 * añadió una dirección"— son un parte de lo que ha pasado: no hay nada que
 * hacer al leerlos. Los del publicador, en cambio, siempre piden algo (entrega
 * este territorio, mira el que te acaban de dar).
 *
 * De esa diferencia dependen dos cosas: qué botón lleva el aviso en la
 * campanita (enterarse y quitarlo, en vez de ir a algún sitio) y si además
 * sale en el panel de inicio (solo lo del publicador; un responsable que abre
 * la aplicación no necesita una tira roja porque alguien devolvió algo).
 *
 * Se distingue por el título porque es lo que llevan TODOS los avisos, también
 * los guardados antes de que existiera esta distinción. Los títulos son
 * constantes de este mismo fichero, así que quien los escribe y quien los
 * clasifica no pueden separarse.
 */
export const esAvisoInformativo = (titulo?: string): boolean =>
  titulo === AVISO_DEVUELTO_TITULO || titulo === AVISO_DIRECCION_TITULO;

/** Días transcurridos desde una fecha ISO. */
export const daysSince = (iso: string, now: Date = new Date()): number => {
  return Math.floor(
    (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
};

/**
 * "hoy", "ayer", "anteayer", "hace 5 días" — y a partir de ahí, la fecha.
 *
 * Para marcas de días, no de meses: una división no vive más que lo que dura
 * la asignación, así que lo relativo se lee mejor que un 23/08 que hay que
 * traducir mentalmente. Pasada una semana ya no se dice "hace nueve días",
 * se mira el día.
 */
export const cuandoSeHizo = (
  iso: string,
  dateFormat = 'dd/MM/yyyy',
  now: Date = new Date()
): string => {
  const dias = daysSince(iso, now);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias === 2) return 'anteayer';
  if (dias <= 7) return `hace ${dias} días`;
  return formatTerritoryDate(iso, dateFormat);
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

// ─── Campos cifrados que no se pueden leer en este dispositivo ────────────
/** Prefijo con el que se guardan los campos cifrados (notas, direcciones). */
export const ENC_PREFIX = 'enc::';

/**
 * ¿Este valor sigue cifrado porque este dispositivo no tiene la clave (o no
 * es la correcta)? `dec` conserva el texto cifrado en ese caso, en vez de
 * devolver '' — así un guardado de ida y vuelta no destruye el dato. Pero
 * entonces la interfaz NO debe mostrarlo en crudo ni dejar editarlo: al
 * volver a cifrarlo con otra clave quedaría cifrado dos veces.
 */
export const isStillEncrypted = (value?: string): boolean =>
  !!value && value.startsWith(ENC_PREFIX);

/** Texto que se muestra en lugar de un campo cifrado ilegible. */
export const ENCRYPTED_LABEL = 'No se puede mostrar en este dispositivo';

/** Devuelve el texto si es legible; si no, el aviso. */
export const displayText = (value?: string): string =>
  isStillEncrypted(value) ? ENCRYPTED_LABEL : (value ?? '');

/**
 * ¿Este color es lo bastante claro como para que el texto blanco encima no
 * se lea? El color de zona lo elige un responsable en un selector libre, así
 * que puede ser un amarillo o un cian: con texto blanco encima el contraste
 * baja de 2:1 y el botón principal queda ilegible al sol, de forma
 * permanente y para todos los territorios de esa zona.
 *
 * Usa la luminancia relativa de WCAG. Acepta #rgb y #rrggbb; ante cualquier
 * otro formato devuelve false (se mantiene el texto blanco de siempre).
 */
export const isLightColor = (color: string): boolean => {
  const hex = color.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex.length === 6
        ? hex
        : null;
  if (!full || !/^[0-9a-fA-F]{6}$/.test(full)) return false;

  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(parseInt(full.slice(0, 2), 16));
  const g = toLinear(parseInt(full.slice(2, 4), 16));
  const b = toLinear(parseInt(full.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Umbral: por encima de esto, el blanco da menos de 3:1 de contraste.
  return luminance > 0.4;
};
