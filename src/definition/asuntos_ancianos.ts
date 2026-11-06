/**
 * NECESIDADES DE LA CONGREGACIÓN (antes «Asuntos del cuerpo de ancianos»).
 *
 * Un sitio común donde apuntar lo que la congregación necesita, para que no se
 * pierda entre una reunión de ancianos y la siguiente. Se simplificó el
 * 2026-11 a lo que de verdad se usa: el tema, algún detalle, a quién le podría
 * tocar y una fecha posible. Cuando se trata, pasa al ARCHIVO, y lo archivado
 * se borra solo pasado un tiempo (ver `services/app/necesidades`).
 *
 * El nombre interno de la tabla (`asuntos_ancianos`) se queda como estaba:
 * cambiarlo obligaría a migrar la base local, el mapa de cifrado y el
 * servidor, y no lo ve nadie.
 *
 * QUIÉN LO VE: solo quien tiene el nombramiento de anciano. No es cosa de la
 * interfaz: el servidor ni se lo manda ni se lo acepta a nadie más (ver
 * `users_controller` y `Congregation.saveBackup` en `sws2apps-api`), y el
 * contenido viaja cifrado con la llave maestra, que una cuenta de publicador no
 * tiene.
 *
 * UN REGISTRO POR NECESIDAD, no una lista dentro de un documento. Así dos
 * ancianos pueden apuntar cosas a la vez desde sus móviles sin pisarse: la
 * fusión es por `id`, y gana el `updatedAt` más nuevo de cada una por separado.
 * Por eso `id` y `updatedAt` van EN CLARO —el servidor tiene que poder
 * compararlos—, y todo lo demás cifrado.
 */

export type AsuntoAncianosType = {
  /** En claro: es la clave con la que fusiona el servidor. */
  id: string;
  /** En claro: es lo que el servidor compara para saber cuál es más nuevo. */
  updatedAt: string;
  /** En claro: una lápida tiene que llegar aunque no se pueda leer el resto. */
  _deleted: boolean;

  /** El tema, en una línea. */
  titulo: string;
  /** Algún detalle, si hace falta. Puede quedar vacío. */
  detalle: string;

  /** A quién le podría tocar (person_uid). Vacío si no se sabe. */
  asignadoA: string;

  /**
   * Una fecha posible para hacerlo, 'YYYY/MM/DD' (sin hora, para que no la
   * mueva la zona horaria). Vacía si no se sabe.
   */
  fechaPosible?: string;

  /** Vacío mientras esté pendiente; con fecha, ya está tratada y archivada. */
  tratadoEl: string;

  /** Quién la apuntó (person_uid) y cuándo. No se enseña; sirve para ordenar. */
  propuestoPor: string;
  propuestoEl: string;

  /*
   * Lo que tenía la versión anterior y ya no se pide. Se sigue guardando con
   * su valor vacío para que un móvil que todavía no se haya actualizado lo
   * encuentre como lo esperaba.
   */
  tratadoPor: string;
  acuerdo: string;
  urgente: boolean;
};
