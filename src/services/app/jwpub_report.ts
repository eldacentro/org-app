/**
 * El informe de una importación desde un archivo `.jwpub`.
 *
 * Vive aparte del lector (`jwpub_import.ts`) a propósito: aquel arrastra
 * `sql.js` y un `?url` de Vite, que fuera del navegador no se resuelven. Esto
 * de aquí es aritmética pura sobre dos listas, así que se puede probar en
 * Node — y es justo lo que hay que probar, porque de contarlo mal se sigue
 * que alguien crea que ha importado algo que no ha importado.
 *
 * Se usa para los bosquejos de discursos públicos y para el cancionero: los
 * dos son lo mismo —una lista de «número + título»— y las dos importaciones
 * tienen que contar igual.
 */

/** Una fila del archivo: el número y su título, ya limpios. */
export type JwpubEntryType = {
  number: number;
  title: string;
};

export type JwpubChangeKind = 'added' | 'renamed' | 'reactivated' | 'retired';

export type JwpubChangeType = {
  number: number;
  kind: JwpubChangeKind;
  previous_title: string;
  new_title: string;
};

/**
 * Lo que la aplicación tiene y el archivo NO trae.
 *
 * No se borra nada por esto —ver `computeJwpubReport`—, pero hay que decirlo:
 * un archivo recortado, o de otra edición, se nota justo aquí.
 */
export type JwpubMissingType = {
  number: number;
  title: string;
};

export type JwpubReportType = {
  /** Cuántas entradas trae el archivo. */
  total: number;
  /** Cuántas coinciden letra por letra con lo que ya hay. */
  unchanged: number;
  /** Las que hay que escribir: nuevas, renombradas, reactivadas, retiradas. */
  changes: JwpubChangeType[];
  /** Las que están en la aplicación y no en el archivo. Se conservan. */
  missing: JwpubMissingType[];
  /** Atajo: si esto es falso, importar no escribiría nada. */
  hasChanges: boolean;
};

const NO_USAR_PATTERN = /^\(?no usar\)?$/i;

/**
 * Compara lo que trae el archivo contra lo que la aplicación ya muestra (que
 * ya incluye cualquier importación anterior) y devuelve las CUATRO cuentas.
 *
 * Las tres primeras son lo que uno espera. La cuarta —lo que está en la
 * aplicación y no en el archivo— es la que faltaba, y la que obliga a decir
 * en voz alta la regla de la casa: **una lista incompleta en un archivo NUNCA
 * borra nada**. Aquí ni siquiera hay forma de borrar: el informe solo produce
 * `changes`, y quien lo aplica escribe eso y nada más. Lo que falta se queda
 * exactamente como estaba.
 *
 * Un número que la aplicación tiene en blanco no cuenta como «ya no está»:
 * no había nada que perder.
 */
export const computeJwpubReport = (
  entries: JwpubEntryType[],
  current: JwpubEntryType[]
): JwpubReportType => {
  const changes: JwpubChangeType[] = [];
  let unchanged = 0;

  const enElArchivo = new Set<number>();

  for (const entry of entries) {
    enElArchivo.add(entry.number);

    const actual = current.find((record) => record.number === entry.number);
    const previousTitle = actual?.title ?? '';

    if (previousTitle === entry.title) {
      unchanged++;
      continue;
    }

    const eraNoUsar = NO_USAR_PATTERN.test(previousTitle.trim());
    const esNoUsar = NO_USAR_PATTERN.test(entry.title.trim());

    let kind: JwpubChangeKind = 'renamed';

    if (!actual || previousTitle.length === 0) kind = 'added';
    else if (eraNoUsar && !esNoUsar) kind = 'reactivated';
    else if (!eraNoUsar && esNoUsar) kind = 'retired';

    changes.push({
      number: entry.number,
      kind,
      previous_title: previousTitle,
      new_title: entry.title,
    });
  }

  const missing = current
    .filter(
      (record) => record.title.length > 0 && !enElArchivo.has(record.number)
    )
    .map((record) => ({ number: record.number, title: record.title }))
    .sort((a, b) => a.number - b.number);

  return {
    total: entries.length,
    unchanged,
    changes: changes.sort((a, b) => a.number - b.number),
    missing,
    hasChanges: changes.length > 0,
  };
};

/**
 * Lo que de verdad se guarda: por número, el título del archivo — y SOLO de
 * los que cambian.
 *
 * Se construye desde `changes`, no desde `entries`, por la misma razón por la
 * que existe `dbReplaceTableIfChanged`: guardar lo idéntico despierta a los
 * observadores de la tabla y redibuja la pantalla entera para nada. Y porque
 * un archivo que no trae un número no tiene por qué opinar sobre él.
 */
export const buildJwpubOverrideEntries = (
  report: JwpubReportType
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const change of report.changes) {
    result[String(change.number)] = change.new_title;
  }

  return result;
};
