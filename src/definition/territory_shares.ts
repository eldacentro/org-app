/**
 * Enlaces públicos de territorio.
 *
 * Un enlace permite que alguien SIN cuenta (el superintendente de circuito, su
 * esposa, un invitado puntual) vea un territorio concreto. Vive en Firestore,
 * en `congregation/{congId}/territory_shares/{token}`, donde el token es el ID
 * del documento.
 *
 * El contenido va en `payload`, cifrado con una clave AES-GCM propia de cada
 * enlace que viaja solo en el fragmento (#) de la URL — ver
 * `@services/encryption/share`. Los metadatos van en claro porque los necesita
 * la regla de seguridad y la lista de enlaces activos.
 */

/**
 * Qué secciones incluye un enlace. Se elige al crearlo: por defecto solo el
 * mapa, porque las notas y sobre todo las direcciones "No visitar" son datos
 * personales de vecinos y el enlace se reenvía con un toque.
 */
export type TerritoryShareIncludes = {
  /** El plano dibujado, con sus etiquetas y el número de viviendas. */
  mapa: boolean;
  /**
   * La foto de la tarjeta del territorio (el S-12 escaneado). Va SEPARADA
   * del mapa a propósito: hay hermanos que se guían por el plano, otros por
   * la tarjeta de siempre, y otros por las dos.
   */
  imagen: boolean;
  /** Notas del territorio. */
  notas: boolean;
  /** Direcciones "No visitar" (datos de terceros). */
  noVisitar: boolean;
};

export const DEFAULT_SHARE_INCLUDES: TerritoryShareIncludes = {
  mapa: true,
  imagen: true,
  notas: false,
  noVisitar: false,
};

/** Opciones de caducidad ofrecidas al crear el enlace. */
export const SHARE_DURATIONS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

export const DEFAULT_SHARE_DAYS = 30;

/** Lo que ve quien abre el enlace. Sin datos personales de terceros. */
export type TerritorySharePayload = {
  /** Versión del formato, para poder evolucionarlo sin romper enlaces vivos. */
  v: 1;
  generatedAt: string;
  /** "Territorio 45" o "45 · Centro", ya compuesto. */
  label: string;
  congName: string;
  zoneName: string;
  zoneColor: string;
  /** GeoJSON ya parseado (en Firestore se guarda como string). */
  geometry: unknown | null;
  /** URL de descarga de Firebase Storage (lleva su propio token, es pública). */
  imageURL?: string;
  numeroViviendas?: number;
  /** Ya descifrada. Vacía si quien comparte no tiene la clave maestra. */
  notas?: string;
  tags: { nombre: string; color?: string }[];
  /** Solo las aprobadas, ya descifradas. */
  locations: { direccion: string; nota?: string }[];
  /**
   * Los trozos en los que está dividido, si lo está. Van en el enlace para
   * que el reparto de una salida se pueda pasar por QR: quien lo abre ve el
   * mapa con los trozos y sus nombres, y sabe cuál le toca sin preguntar.
   * Como el resto del contenido, es una foto del momento — pero la app
   * reescribe los enlaces vivos sola cuando el territorio cambia.
   */
  secciones?: {
    nombre: string;
    color: string;
    geometry: unknown;
    /** Ya hecha. Va en el enlace para que el otro grupo lo vea. */
    hecha?: boolean;
  }[];
  /** Hasta cuándo vale (ISO). Va DENTRO del contenido cifrado para poder
   *  decírselo al invitado: el documento en claro solo lo puede leer quien
   *  tenga sesión. */
  expiresAt?: string;
  /** `true` si además muere al entregar el territorio. */
  tiedToAssignment?: boolean;
};

export type TerritoryShare = {
  /** Token aleatorio de 192 bits; es también el ID del documento. */
  token: string;
  /**
   * Asignación a la que va atado, si la hay. Cuando existe, la regla de
   * seguridad corta el enlace en cuanto se entrega el territorio.
   *
   * Es `null` cuando un responsable comparte un territorio que NO está
   * asignado (p. ej. para dárselo por WhatsApp a alguien sin cuenta): en ese
   * caso solo lo limitan la fecha de caducidad y la revocación manual.
   */
  assignmentId: string | null;
  territoryId: string;
  /** Caduca aquí pase lo que pase. Lo comprueba la regla de seguridad, no el
   *  cliente. Es un Timestamp de Firestore para poder compararlo con
   *  `request.time`. */
  expiresAt: import('firebase/firestore').Timestamp;
  /** Qué secciones se compartieron (para poder mostrarlo en la lista). */
  includes: TerritoryShareIncludes;
  /** Revocación manual. */
  revoked: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  /** `"v1." + base64url(iv‖ciphertext)`. */
  payload: string;
  /**
   * ¿Se guardó la clave envuelta? Solo un booleano: la clave EN SÍ vive en un
   * documento aparte que exige sesión, porque este documento se lee sin
   * autenticar y servir ahí un criptograma hecho con la contraseña maestra
   * de la congregación permitía atacarla por fuerza bruta sin conexión.
   *
   * `false` cuando quien lo creó no tenía esa contraseña (un publicador): el
   * enlace funciona igual, pero solo se puede copiar al crearlo.
   */
  hasWrappedKey: boolean;
  /** Huella del contenido en claro, para detectar que el snapshot quedó viejo. */
  contentHash: string;
};
