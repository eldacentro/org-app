/**
 * Tipos del módulo de Territorios.
 *
 * Modelo de datos en Firestore bajo `congregation/{congId}/...`, replicando el
 * patrón de Documentos (sync en tiempo real con onSnapshot + Storage para
 * ficheros). Los campos de texto libre sensibles (direcciones "No visitar",
 * notas) se cifran en cliente con la master key de la congregación antes de
 * subir; el resto va en claro. Las asignaciones guardan solo `personUid`: el
 * nombre se resuelve en cliente desde la tabla `persons` (ya cifrada E2E).
 */
import type {
  FeatureCollection,
  Geometry,
  Polygon,
  MultiPolygon,
} from 'geojson';

export type { FeatureCollection, Geometry, Polygon, MultiPolygon };

/** Zona o tipo de territorio (ej. "Elda - Urbano", "Elda - Rural"). */
export type TerritoryZone = {
  id: string;
  nombre: string;
  /** Color HEX aplicado a todos los territorios de la zona. */
  color: string;
  orden: number;
  updatedAt: string;
};

/** Un territorio concreto que se entrega a los publicadores. */
export type Territory = {
  id: string;
  zoneId: string;
  /** Número visible del territorio dentro de su zona (ej. "1", "12"). */
  numero: string;
  nombre?: string;
  /** Geometría del territorio (importada de KML → GeoJSON). */
  geometry: Polygon | MultiPolygon | null;
  /** PNG del formulario del territorio (Firebase Storage). */
  imageURL?: string;
  imageFileName?: string;
  /** KML/KMZ original (Firebase Storage), por si se quiere reexportar. */
  kmlURL?: string;
  /** Notas del territorio — cifrado en Firestore, descifrado en cliente. */
  notas?: string;
  /** Número aproximado de viviendas del territorio (dato informativo). */
  numeroViviendas?: number;
  /** ids de TerritoryTag. */
  tags: string[];
  /**
   * Trozos en los que está dividido para repartirlo dentro de una salida.
   *
   * Ausente o vacío = el territorio va entero, que es lo normal. Solo los
   * grandes —los rurales y los de Salinas— piden partirse: en una salida el
   * conductor le dice a un grupo que se lleve una parte y él se va con la
   * otra, y hasta ahora eso se explicaba señalando con el dedo.
   *
   * Las secciones SIEMPRE suman el territorio entero (ver `territory_split`):
   * se hacen cortando, no dibujando, justo para que no quede ni un portal
   * fuera de ninguna.
   */
  secciones?: TerritorySection[];
  /** Última fecha en que el territorio fue devuelto como trabajado (ISO). */
  lastWorkedAt?: string;
  /**
   * Id de la TerritoryAssignment abierta que "tiene" este territorio ahora
   * mismo (normal o de campaña) — actúa como candado dentro de una
   * transacción de Firestore para que dos responsables no puedan asignarlo
   * a la vez. `null`/ausente = libre. Territorios creados antes de este
   * campo no lo tienen todavía; un efecto de backfill lo repara la primera
   * vez que alguien con rol de responsable carga la app (ver useTerritories.tsx).
   */
  openAssignmentId?: string | null;
  updatedAt: string;
};

/** Un trozo de territorio, para repartirlo dentro de una salida. */
export type TerritorySection = {
  id: string;
  /** "A", "B"… o lo que le ponga quien divide. */
  nombre: string;
  /** Color con el que se pinta en el mapa. Es un dato, no un token. */
  color: string;
  geometry: Polygon | MultiPolygon;
};

export type TerritoryAssignmentStatus =
  | 'asignado'
  | 'trabajado'
  | 'no_trabajado';

/** Una asignación (histórica o actual) de un territorio a un publicador. */
export type TerritoryAssignment = {
  id: string;
  territoryId: string;
  /** person_uid del publicador. El nombre se resuelve en cliente. */
  personUid: string;
  /** ISO date — fecha de entrega. */
  assignedAt: string;
  /** ISO date — fecha de vencimiento calculada (assignedAt + días config). */
  dueAt?: string;
  /** ISO date — fecha de devolución. null/undefined = sigue asignado.
   *  Las asignaciones nuevas escriben null explícito (no se omite el campo)
   *  para que una consulta where('returnedAt','==',null) pueda encontrarlas;
   *  undefined solo aparece en documentos antiguos previos a esa migración. */
  returnedAt?: string | null;
  status: TerritoryAssignmentStatus;
  /** true si la asignación pertenece a una campaña (se marca con "(C)"). */
  isCampaign: boolean;
  campaignId?: string;
  /** Nota de asignación — cifrada en Firestore. */
  notas?: string;
  /** person_uid de quien realizó la asignación. */
  assignedBy?: string;
  /**
   * A quién se lo ha PRESTADO quien lo tiene, y hasta cuándo.
   *
   * Para la salida: el hermano que lleva el territorio le enseña una parte a
   * otro y quiere que la vea en su móvil, no que se la explique señalando.
   * El prestado ve el territorio entero —mapa, partes, direcciones de "No
   * visitar"— pero no puede entregarlo, ni dividirlo, ni prestarlo a su vez:
   * el territorio sigue siendo de quien lo tiene, y en el S-13 y en el
   * historial esto no aparece por ningún lado.
   *
   * Se cae solo al llegar la hora, y también cuando el territorio se
   * entrega, porque entonces la asignación deja de estar abierta.
   */
  compartidoCon?: { personUid: string; hasta: string }[];
  updatedAt: string;
};

/** Dirección "No visitar" dentro de un territorio. */
export type TerritoryLocation = {
  id: string;
  territoryId: string;
  etiqueta: 'NO_VISITAR';
  /** Dirección (calle + número) — cifrada en Firestore. */
  direccion: string;
  /** Nota opcional — cifrada en Firestore. */
  nota?: string;
  /** false = pendiente de aprobación por un responsable. */
  aprobada: boolean;
  /** person_uid de quien la añadió. */
  addedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type TerritoryCampaignEstado = 'planificada' | 'activa' | 'pasada';

/** Campaña especial de predicación. */
export type TerritoryCampaign = {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: TerritoryCampaignEstado;
  /** ids de los territorios incluidos en la campaña. */
  territoryIds: string[];
  updatedAt: string;
};

/** Solicitud de territorio hecha por un publicador. */
export type TerritoryRequest = {
  id: string;
  /** person_uid del solicitante. */
  personUid: string;
  /** Nota libre del publicador (ej. "prefiero rural"). */
  nota?: string;
  /**
   * La campaña para la que se pide, si el publicador lo indicó.
   *
   * Lo elige él al solicitar, no se deduce de la fecha: puede haber una
   * campaña abierta que todavía no ha empezado y el hermano querer un
   * territorio normal para estas dos semanas de en medio. Con esto el
   * responsable lo sabe antes de asignar y el asignador le ofrece
   * directamente los territorios de esa campaña.
   */
  campaignId?: string;
  /**
   * Zona que prefiere, si dijo alguna. Es una PREFERENCIA, no una condición:
   * el responsable ve de cuál la pidió y el selector se le abre por ahí, pero
   * puede darle uno de otra zona sin más.
   */
  zoneId?: string;
  createdAt: string;
  /** person_uid del responsable que la atendió — al rellenarse desaparece
   *  para los demás responsables (patrón vistoPor de Documentos). */
  atendidaPor?: string;
  atendidaAt?: string;
  /**
   * Cómo se cerró: dándole un territorio o descartándola.
   *
   * Sin esto solo constaba QUE se atendió, y en el historial una solicitud a
   * la que se dio territorio y otra que se descartó se veían exactamente
   * igual. Las solicitudes cerradas antes de este campo no lo traen y se
   * muestran como "Atendida" a secas.
   */
  atendidaComo?: 'asignada' | 'descartada';
};

/** Aviso dirigido a un publicador (ej. territorio atrasado). Llega al instante
 *  a su dispositivo vía la suscripción en tiempo real. */
export type TerritoryNotice = {
  id: string;
  /** person_uid destinatario. */
  personUid: string;
  title?: string;
  mensaje: string;
  /** territorio relacionado (opcional). */
  territoryId?: string;
  /**
   * El territorio, escrito: "Elda - Urbano 12".
   *
   * Va guardado en el propio aviso y no se resuelve al leerlo a propósito: la
   * campanita y el panel de inicio viven fuera de Territorios y ahí no están
   * cargados ni los territorios ni las zonas, así que sin esto no habría con
   * qué escribir el nombre. Los avisos anteriores a este campo no lo traen y
   * se muestran como antes.
   */
  territoryLabel?: string;
  /** quién lo envió (person_uid). */
  sentBy?: string;
  createdAt: string;
  /** marcado como leído por el destinatario. */
  leido?: boolean;
};

/** Etiqueta de territorio (ej. "con escaleras", "casas"). */
export type TerritoryTag = {
  id: string;
  nombre: string;
  color: string;
  updatedAt: string;
};

export type TerritoryStatsRange = 'service_year' | 'one_year' | 'all';
export type TerritoryStatsGrouping = 'zone' | 'none';

/** Configuración del módulo (réplica de los ajustes de Territory Helper). */
export type TerritorySettings = {
  id: string; // documento único, id fijo "settings"
  // ── Ajustes de asignación ──
  dateFormat: string; // ej. "dd-MM-yyyy"
  statsIncludeCampaigns: boolean;
  assignedCountsAsWorked: boolean;
  // ── Dashboard ──
  daysUntilOverdue: number; // def. 120
  overdueMessage: string;
  statsRange: TerritoryStatsRange;
  statsGrouping: TerritoryStatsGrouping;
  // ── Vista del territorio (qué se expande por defecto) ──
  // "expandInfo" cubre la pestaña combinada Info + Direcciones.
  expandInfo: boolean;
  expandMap: boolean;
  expandImage: boolean;
  // ── Descanso antes de reasignar ──
  // Tras devolverse un territorio como trabajado (Territory.lastWorkedAt),
  // cuántos días debe "descansar" antes de ofrecerse para reasignar a otro
  // publicador. Antes existía un campo "daysUntilExpiration" que generaba un
  // estado "Vencido" separado de "Atrasado" (dos umbrales para lo mismo,
  // confuso) — se retiró: "Vence"/dueAt ahora comparte el mismo umbral que
  // "Atrasado" (daysUntilOverdue), y este campo pasa a significar solo esto.
  daysUntilReassignable: number; // def. 30
  // ── Configuración de publicador ──
  publishersCanReturn: boolean;
  publishersCanSeeGroup: boolean;
  publishersCanAddLocations: boolean;
  // ── Configuración de ubicación ──
  locationsRequireApproval: boolean;
  managers?: { uid: string; email: string; name: string }[];
  updatedAt: string;
};

export const DEFAULT_TERRITORY_SETTINGS: Omit<TerritorySettings, 'updatedAt'> =
  {
    id: 'settings',
    dateFormat: 'dd-MM-yyyy',
    statsIncludeCampaigns: false,
    assignedCountsAsWorked: false,
    daysUntilOverdue: 120,
    overdueMessage:
      'Tu territorio está atrasado. Por favor, indícanos si lo has terminado, ' +
      'si lo devuelves sin trabajar, o si deseas renovarlo. ¡Gracias!',
    statsRange: 'service_year',
    statsGrouping: 'zone',
    expandInfo: false,
    expandMap: true,
    expandImage: true,
    daysUntilReassignable: 30,
    publishersCanReturn: true,
    publishersCanSeeGroup: false,
    publishersCanAddLocations: true,
    locationsRequireApproval: true,
  };

// ── Registros de caché local en IndexedDB (por dispositivo) ──

/** Cachea localmente el KML/PNG de un territorio descargado. */
export type TerritoryFileDbRecord = {
  id: string; // territoryId
  territoryId: string;
  imageData?: string; // base64
  kmlData?: string;
};
