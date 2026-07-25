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
};

export type TerritoryShare = {
  /** Token aleatorio de 192 bits; es también el ID del documento. */
  token: string;
  /** La regla de seguridad lo usa para comprobar que la asignación sigue abierta. */
  assignmentId: string;
  territoryId: string;
  /** Solo revocación manual: la caducidad por cierre la decide la regla. */
  revoked: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  /** `"v1." + base64url(iv‖ciphertext)`. */
  payload: string;
  /** La clave del enlace, envuelta con la clave maestra de la congregación. */
  keyWrapped: string;
  /** Huella del contenido en claro, para detectar que el snapshot quedó viejo. */
  contentHash: string;
};
