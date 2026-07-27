import { Table } from 'dexie';
import { isSameTableContent } from '@services/worker/merge';

/**
 * Rehace una tabla DERIVADA solo si su contenido ha cambiado.
 *
 * Derivada = se reconstruye entera desde las traducciones, no desde el
 * servidor: tipos de semana, asignaciones, discursos públicos y canciones.
 * Estas cuatro se rehacían al terminar CADA sincronización, y el resultado es
 * casi siempre idéntico letra por letra (solo cambia al cambiar de idioma o al
 * actualizar la app). Aun así, `clear()` + `bulkPut()` despiertan a los
 * observadores de la tabla (`useLiveQuery`), que entregan arrays nuevos y
 * redibujan la pantalla entera: es el parpadeo de las páginas densas, el mismo
 * que en el ciclo de sincronización, pero por otra puerta.
 *
 * Devuelve si ha escrito, por si a alguien le sirve saberlo.
 */
export const dbReplaceTableIfChanged = async <T extends object>(
  table: Table<T>,
  rows: T[],
  keyField: keyof T & string
): Promise<boolean> => {
  const current = await table.toArray();

  if (isSameTableContent(current, rows, keyField)) return false;

  // El borrado y la escritura van juntos en una transacción: si algo fallara
  // por el camino, la tabla no se queda a medias (vacía o mezclada).
  await table.db.transaction('rw', table, async () => {
    await table.clear();
    await table.bulkPut(rows);
  });

  return true;
};
