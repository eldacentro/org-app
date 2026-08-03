/**
 * «Última actualización», por dentro.
 *
 * La aplicación guarda una marca `updatedAt` en CADA campo, no solo una por
 * registro. Esa marca por campo es lo que permite contestar algo más útil que
 * «se tocó el 3 de agosto»: contestar QUÉ se tocó.
 *
 * **El límite, y es real.** Se guarda cuándo se tocó cada campo, pero NO
 * quién: el autor solo existe a nivel de registro entero (`lastModifiedBy`).
 * Así que este módulo contesta qué y cuándo, y el quién sigue siendo el del
 * registro. No se añade aquí ningún campo nuevo al esquema sincronizado: en
 * este repositorio eso se hace despacio y es un trabajo aparte.
 */

export type FieldChange = {
  /** El nombre del campo tal y como lo lee un hermano: «Presidente». */
  label: string;
  /** ISO. La marca más reciente encontrada dentro de ese campo. */
  updatedAt: string;
};

/**
 * La marca de tiempo más reciente que haya en un subárbol, o '' si no hay
 * ninguna.
 *
 * Un campo no siempre es una hoja: «Presidente» es en realidad
 * `chairman.main_hall[]` más `chairman.aux_class_1`, y a un hermano le da
 * igual esa estructura — lo que quiere saber es si el presidente cambió. Por
 * eso se baja hasta el fondo y se coge la más nueva.
 *
 * `dataView` filtra por vista de datos cuando el nodo la declara (las
 * asignaciones llevan la vista en `type`): sin ese filtro, un cambio hecho en
 * el grupo de otro idioma aparecería como cambio en el tuyo.
 */
export const latestUpdatedAt = (node: unknown, dataView?: string): string => {
  if (node === null || node === undefined) return '';

  if (Array.isArray(node)) {
    return node.reduce<string>((mayor, child) => {
      const valor = latestUpdatedAt(child, dataView);
      return valor > mayor ? valor : mayor;
    }, '');
  }

  if (typeof node !== 'object') return '';

  const record = node as Record<string, unknown>;

  if (typeof record.updatedAt === 'string') {
    // El nodo declara a qué vista de datos pertenece y no es la que se está
    // mirando: no cuenta como cambio de esta pantalla.
    if (
      dataView !== undefined &&
      typeof record.type === 'string' &&
      record.type !== dataView
    ) {
      return '';
    }

    return record.updatedAt;
  }

  return Object.values(record).reduce<string>((mayor, child) => {
    const valor = latestUpdatedAt(child, dataView);
    return valor > mayor ? valor : mayor;
  }, '');
};

/**
 * Convierte una lista de secciones con nombre en la lista de cambios que se
 * enseña en el panel: lo más reciente arriba, y fuera lo que nunca se tocó.
 */
export const buildFieldChanges = (
  sections: { label: string; node: unknown }[],
  dataView?: string
): FieldChange[] => {
  return sections
    .map(({ label, node }) => ({
      label,
      updatedAt: latestUpdatedAt(node, dataView),
    }))
    .filter((change) => change.updatedAt !== '')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};
