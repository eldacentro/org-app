/**
 * Freno de mano de la importación.
 *
 * El importador funciona por sustitución: lo que no viene en el archivo se da
 * por borrado. Eso está bien cuando el archivo ES la copia completa, y es una
 * trampa mortal cuando no lo es — un archivo con una sola tabla, o una tabla
 * que llega vacía, vacía la tabla entera de la congregación y el borrado se
 * propaga a todos los dispositivos por sincronización.
 *
 * Ha pasado dos veces: el 13 de julio (importar programas vació la otra mitad)
 * y el 27 de julio (marcar "Informes de congregación" marcaba "Personas" por su
 * cuenta, el archivo no traía personas, y desaparecieron las 96).
 *
 * La regla, de una vez por todas: **una tabla que llega vacía significa "no
 * viene en este archivo", nunca "bórralo todo"**. Para borrar de verdad están
 * las marcas de borrado dentro del propio archivo, registro a registro.
 */

/**
 * ¿Esta importación borraría la tabla entera?
 *
 * @param incoming registros que trae el archivo
 * @param local    registros que ya hay en el dispositivo
 */
export const importWouldWipeTable = (
  incoming: unknown[] | undefined,
  local: unknown[] | undefined
) => (incoming?.length ?? 0) === 0 && (local?.length ?? 0) > 0;
