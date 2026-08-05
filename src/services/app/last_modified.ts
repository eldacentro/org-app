/**
 * «Última actualización», por dentro.
 *
 * La aplicación guarda una marca `updatedAt` en CADA campo, no solo una por
 * registro. Esa marca por campo es lo que permite contestar algo más útil que
 * «se tocó el 3 de agosto»: contestar QUÉ se tocó.
 *
 * Y desde el 2026-08-05 guarda también QUIÉN: cada asignación lleva su propio
 * `by`. Antes el autor solo existía a nivel de registro (`lastModifiedBy`, el
 * último que guardó cualquier cosa de esa semana), y con eso el panel solo
 * podía decir «cambió todo esto, y el último fue Fulano» — que es como no decir
 * nada.
 *
 * Lo repartido ANTES de ese día no lo lleva, y entonces se dice «no consta
 * quién» en vez de atribuírselo al último que guardó. Inventar un culpable es
 * peor que admitir que no se sabe.
 */

export type FieldChange = {
  /** El nombre del campo tal y como lo lee un hermano: «Presidente». */
  label: string;
  /** ISO. La marca más reciente encontrada dentro de ese campo. */
  updatedAt: string;
  /** Quién lo puso. Vacío = de antes de que esto se guardara. */
  by?: string;
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
export const latestChange = (
  node: unknown,
  dataView?: string
): { updatedAt: string; by?: string } => {
  const vacio = { updatedAt: '', by: undefined as string | undefined };

  if (node === null || node === undefined) return vacio;

  if (Array.isArray(node)) {
    return node.reduce<{ updatedAt: string; by?: string }>((mayor, child) => {
      const valor = latestChange(child, dataView);
      return valor.updatedAt > mayor.updatedAt ? valor : mayor;
    }, vacio);
  }

  if (typeof node !== 'object') return vacio;

  const record = node as Record<string, unknown>;

  if (typeof record.updatedAt === 'string') {
    // El nodo declara a qué vista de datos pertenece y no es la que se está
    // mirando: no cuenta como cambio de esta pantalla.
    if (
      dataView !== undefined &&
      typeof record.type === 'string' &&
      record.type !== dataView
    ) {
      return vacio;
    }

    // El autor puede venir de dos sitios y significan lo mismo: `by` en las
    // asignaciones de reunión y de Departamentos, y `lastModifiedBy` en los
    // módulos que ya lo guardaban por pieza — cada grupo de predicación lleva
    // el suyo. Se leen los dos para no tener que mover un dato de sitio en el
    // esquema sincronizado solo por el nombre.
    const texto = (valor: unknown) =>
      typeof valor === 'string' && valor.length > 0 ? valor : undefined;

    return {
      updatedAt: record.updatedAt,
      by: texto(record.by) ?? texto(record.lastModifiedBy),
    };
  }

  return Object.values(record).reduce<{ updatedAt: string; by?: string }>(
    (mayor, child) => {
      const valor = latestChange(child, dataView);
      return valor.updatedAt > mayor.updatedAt ? valor : mayor;
    },
    vacio
  );
};

/** Solo la fecha, para quien no necesita el autor. */
export const latestUpdatedAt = (node: unknown, dataView?: string): string =>
  latestChange(node, dataView).updatedAt;

/**
 * Convierte una lista de secciones con nombre en la lista de cambios que se
 * enseña en el panel: lo más reciente arriba, y fuera lo que nunca se tocó.
 */
export const buildFieldChanges = (
  sections: { label: string; node: unknown }[],
  dataView?: string
): FieldChange[] => {
  return sections
    .map(({ label, node }) => ({ label, ...latestChange(node, dataView) }))
    .filter((change) => change.updatedAt !== '')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};
