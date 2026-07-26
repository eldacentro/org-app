/**
 * Crédito de horas, desglosado por motivo.
 *
 * Antes el crédito era un número suelto y el motivo se pegaba al final del
 * campo de comentarios ("Escuela de Precursores: 30"), que es de donde salían
 * los "25 Hrs. LDC" que arrastraba el TsWin. Funcionaba, pero el secretario no
 * podía contar nada con eso, y el comentario dejaba de servir para lo que es:
 * explicarse.
 *
 * Ahora cada motivo es una entrada con sus horas. El total sigue siendo un
 * número —lo que ve el secretario y lo que cuenta para el requisito del
 * precursor— pero ya se sabe de qué se compone.
 *
 * Cada entrada lleva `id` A PROPÓSITO: el motor de fusión descarta sin avisar
 * los registros de una lista que no lo tengan (ver worker/merge.test.ts).
 */

export type CreditEntryType =
  | 'theocratic_assignments'
  | 'pioneer_school'
  | 'ske'
  | 'language_course'
  | 'other';

export type CreditEntry = {
  id: string;
  type: CreditEntryType;
  /** Solo para 'other': lo que la persona escriba (Asamblea regional, etc.). */
  label?: string;
  hours: number;
};

/** Etiquetas fijas; 'other' usa lo que haya escrito la persona. */
export const CREDIT_TYPE_KEYS: Record<CreditEntryType, string> = {
  theocratic_assignments: 'tr_theocraticAssignments',
  pioneer_school: 'tr_pioneerSchool',
  ske: 'tr_SKE',
  language_course: 'tr_languageCourse',
  other: 'tr_eldaCreditOther',
};

export const creditEntriesTotal = (entries?: CreditEntry[]) =>
  (entries ?? []).reduce((total, entry) => {
    const hours = Number(entry.hours);

    return total + (Number.isFinite(hours) && hours > 0 ? hours : 0);
  }, 0);

export const creditEntryAdd = (
  entries: CreditEntry[] | undefined,
  entry: Omit<CreditEntry, 'id'> & { id?: string }
): CreditEntry[] => {
  const hours = Number(entry.hours);

  // Una entrada sin horas no aporta nada y ensucia la lista.
  if (!Number.isFinite(hours) || hours <= 0) return entries ?? [];

  const label = entry.type === 'other' ? entry.label?.trim() : undefined;

  return [
    ...(entries ?? []),
    {
      id: entry.id ?? crypto.randomUUID(),
      type: entry.type,
      hours,
      ...(label ? { label } : {}),
    },
  ];
};

export const creditEntryRemove = (
  entries: CreditEntry[] | undefined,
  id: string
): CreditEntry[] => (entries ?? []).filter((entry) => entry.id !== id);

/**
 * Total en el formato 'H:MM' que usan los campos de horas del informe.
 * El crédito siempre se apunta en horas enteras, así que los minutos son 00.
 */
export const creditEntriesToHoursValue = (entries?: CreditEntry[]) =>
  `${creditEntriesTotal(entries)}:00`;

/**
 * ¿Este informe lleva el crédito desglosado?
 *
 * Los informes anteriores a esto tienen su total y ninguna entrada: se siguen
 * mostrando tal cual, sin inventarles un motivo que nadie escribió.
 */
export const hasCreditEntries = (entries?: CreditEntry[]) =>
  Array.isArray(entries) && entries.length > 0;
