import { isSameRecord, syncFromRemote } from '@services/worker/merge';

/**
 * Qué hacer con la copia de una ficha que alguien está editando cuando la tabla
 * cambia por debajo.
 *
 * EL FALLO QUE ESTO ARREGLA — «marco el tick y se quita solo». La ficha de una
 * persona trabaja sobre una copia en memoria hasta que se pulsa Guardar. Esa
 * copia se volvía a cargar de la base de datos cada vez que cambiaba la lista
 * de personas — que es una consulta viva sobre la tabla ENTERA. Así que bastaba
 * con que una sincronización trajera un cambio de CUALQUIER otro hermano (una
 * ausencia, un contacto de emergencia, un informe que mueve el primer mes) para
 * que la ficha abierta se recargara y se llevara por delante lo que se estaba
 * editando sin guardar. Con la sincronización inmediata eso pasa a cada rato.
 * Quien marcaba una casilla la veía desmarcarse sola; quien daba de alta a un
 * hermano veía vaciarse el formulario entero (y con otro identificador).
 *
 * LA REGLA, en tres casos:
 *  1. La ficha de ESTA persona no ha cambiado en la base de datos (el cambio
 *     era de otro): no se toca nada. Se devuelve la misma referencia a
 *     propósito, para que ni siquiera se redibuje.
 *  2. Ha cambiado y aquí no había nada a medio editar: se toma la guardada.
 *  3. Ha cambiado Y hay ediciones sin guardar: se fusionan con el mismo motor
 *     que la sincronización — campo a campo, gana el `updatedAt` más nuevo. Lo
 *     que se acaba de tocar aquí lleva la fecha de ahora mismo y sobrevive; lo
 *     que otro cambió entretanto entra. Nunca se pierde una edición en curso
 *     por algo que no tiene que ver con ella.
 *
 * Es genérica (no sabe de personas) porque la regla vale para cualquier ficha
 * con copia de trabajo sobre una tabla viva.
 */
export const copiaDeTrabajoTrasCambio = <T extends object>({
  enEdicion,
  base,
  guardada,
}: {
  /** Lo que hay ahora mismo en el formulario. */
  enEdicion: T;
  /** Lo que se cargó de la base de datos la última vez. */
  base: T;
  /** Lo que hay AHORA en la base de datos. */
  guardada: T;
}): T => {
  // 1. El cambio era de otro registro.
  if (isSameRecord(base, guardada)) return enEdicion;

  // 2. Nada a medio editar: manda lo guardado.
  if (isSameRecord(enEdicion, base)) return guardada;

  // Lo guardado ya es lo que hay en pantalla (acaba de pulsar Guardar).
  if (isSameRecord(enEdicion, guardada)) return enEdicion;

  // 3. Las dos cosas a la vez: se fusiona, sin tocar ninguna de las entradas.
  const fusionada = structuredClone(enEdicion);

  syncFromRemote(fusionada, structuredClone(guardada));

  return fusionada;
};
