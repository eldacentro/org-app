/**
 * Qué trae una copia de seguridad, y qué NO hay que tocar.
 *
 * La regla, y es la única que importa aquí: **una tabla que la copia no trae no
 * se toca**. Ni se vacía, ni se marca como borrada, ni se «restaura a cero».
 *
 * Por qué merece su propio fichero y sus pruebas: restaurar empezaba vaciando
 * las tablas y rellenándolas después, así que un archivo al que le faltara una
 * —uno viejo, uno hecho a mano para corregir cuatro registros, uno generado
 * antes de que el módulo existiera— dejaba esa tabla VACÍA y nadie se enteraba
 * hasta que alguien la abría. Es el mismo patrón que ya costó un disgusto en
 * julio con los programas.
 *
 * Distinguir «no lo trae» de «lo trae vacío» es justo lo que no se puede hacer
 * de memoria en medio de una función de doscientas líneas.
 */

/** Las tablas que viajan en una copia como LISTA de registros. */
export const TABLAS_LISTA = [
  'persons',
  'branch_cong_analysis',
  'branch_field_service_reports',
  'cong_field_service_reports',
  'field_service_groups',
  'meeting_attendance',
  'sched',
  'sources',
  'speakers_congregations',
  'visiting_speakers',
  'user_field_service_reports',
  'user_bible_studies',
  'upcoming_events',
  'exhibitors',
  'service_outings',
  'departments_schedule',
  'responsabilidades',
  'circuit_overseer_visits',
  'public_talks_override',
  'songs_override',
  'delegated_field_service_reports',
] as const;

export type TablaLista = (typeof TABLAS_LISTA)[number];

/**
 * Si la copia trae ESA tabla.
 *
 * Traerla vacía cuenta como traerla: una congregación puede no tener ningún
 * exhibidor, y esa copia dice «aquí no hay ninguno», que es un dato. Lo que no
 * cuenta es que la clave no exista, o que no sea una lista.
 */
export const copiaTraeTabla = (
  data: Record<string, unknown> | null | undefined,
  tabla: string
): boolean => Array.isArray(data?.[tabla]);

/** Las tablas que hay que rehacer con esta copia. Las demás se quedan como están. */
export const tablasQueTraeLaCopia = (
  data: Record<string, unknown> | null | undefined
): TablaLista[] => TABLAS_LISTA.filter((tabla) => copiaTraeTabla(data, tabla));

/**
 * Si la copia trae un registro SUELTO (ajustes, limpieza, evacuación).
 *
 * `null` es un valor legítimo dentro de una copia —«esto no está configurado»—
 * pero no es motivo para borrar lo que haya: para eso están las pantallas de
 * cada módulo.
 */
export const copiaTraeRegistro = (
  data: Record<string, unknown> | null | undefined,
  clave: string
): boolean => {
  const valor = data?.[clave];

  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
};
