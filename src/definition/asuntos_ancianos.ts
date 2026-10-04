/**
 * EL TABLÓN DEL CUERPO DE ANCIANOS.
 *
 * Un sitio común donde apuntar lo que hay que tratar, para que no se pierda
 * entre una reunión de ancianos y la siguiente: quién lo propuso, a quién se le
 * encarga, cuándo se trató y en qué quedó.
 *
 * QUIÉN LO VE: solo quien tiene el nombramiento de anciano. No es cosa de la
 * interfaz: el servidor ni se lo manda ni se lo acepta a nadie más (ver
 * `users_controller` y `Congregation.saveBackup` en `sws2apps-api`), y el
 * contenido viaja cifrado con la llave maestra, que una cuenta de publicador no
 * tiene. El límite honesto está escrito en `AsuntosAncianos` (la página).
 *
 * UN REGISTRO POR ASUNTO, no una lista dentro de un documento. Así dos ancianos
 * pueden apuntar cosas a la vez desde sus móviles sin pisarse: la fusión es por
 * `id`, y gana el `updatedAt` más nuevo de cada asunto por separado. Por eso
 * `id` y `updatedAt` van EN CLARO — el servidor tiene que poder compararlos—, y
 * todo lo demás cifrado. Ver la memoria de fusión por registro.
 */

export type AsuntoAncianosType = {
  /** En claro: es la clave con la que fusiona el servidor. */
  id: string;
  /** En claro: es lo que el servidor compara para saber cuál es más nuevo. */
  updatedAt: string;
  /** En claro: una lápida tiene que llegar aunque no se pueda leer el resto. */
  _deleted: boolean;

  /** Lo que se va a tratar, en una línea. */
  titulo: string;
  /** El contexto, si hace falta. Puede quedar vacío. */
  detalle: string;

  /** Quién lo apuntó (person_uid) y cuándo. */
  propuestoPor: string;
  propuestoEl: string;

  /** A quién se le ha encargado, si se ha encargado a alguien (person_uid). */
  asignadoA: string;

  /** Vacío mientras esté pendiente; con fecha, ya está tratado. */
  tratadoEl: string;
  /** Quién lo trató (person_uid). */
  tratadoPor: string;
  /** En qué quedó. Es lo que sirve dentro de un año. */
  acuerdo: string;

  /** Lo que no puede esperar a la próxima reunión. */
  urgente: boolean;
};

export type AsuntoEstado = 'pendiente' | 'asignado' | 'tratado';
