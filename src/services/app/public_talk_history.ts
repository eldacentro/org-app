import { SourceWeekType } from '@definition/sources';

/**
 * Cuándo se dio por última vez un discurso público.
 *
 * De dónde sale el dato: el discurso de cada fin de semana se guarda en
 * `sources[semana].weekend_meeting.public_talk`, no en el programa. Ahí está
 * TODO lo que la congregación tiene cargado, así que basta con recorrerlo hacia
 * atrás.
 *
 * Lo que NO se mira son los discursos salientes (`outgoing_talks`): esos los dan
 * hermanos nuestros en otras congregaciones, y que uno se repita allí no dice
 * nada sobre lo que ha oído esta.
 *
 * Vive aparte y sin React para poder comprobarse solo: equivocarse aquí no
 * rompe nada a la vista, solo dice «este discurso se dio hace 4 meses» cuando
 * fueron catorce, y eso se cree.
 */

/** Las semanas van como `2026/08/17`, así que se ordenan como texto. */
const esAnterior = (semana: string, referencia: string) => semana < referencia;

/**
 * Los meses que han pasado entre dos semanas, redondeando hacia abajo.
 *
 * Se cuenta por meses de calendario y no dividiendo días entre 30: «del 14 de
 * abril al 14 de agosto» son cuatro meses para cualquiera, y dividir da 4,07 o
 * 3,9 según el mes que toque.
 */
export const mesesEntreSemanas = (desde: string, hasta: string): number => {
  const [a1, m1, d1] = desde.split('/').map(Number);
  const [a2, m2, d2] = hasta.split('/').map(Number);

  if (![a1, m1, d1, a2, m2, d2].every(Number.isFinite)) return 0;

  const meses = (a2 - a1) * 12 + (m2 - m1);

  // Si aún no se ha llegado al mismo día del mes, ese mes no está cumplido.
  return d2 >= d1 ? meses : meses - 1;
};

/**
 * La última vez que se dio ese discurso antes de esta semana.
 *
 * Devuelve la semana (`2026/04/13`) o `null` si no consta ninguna.
 */
export const publicTalkLastGiven = ({
  sources,
  talkNumber,
  dataView,
  week,
}: {
  sources: SourceWeekType[];
  talkNumber: number;
  dataView: string;
  week: string;
}): string | null => {
  if (!talkNumber || !week) return null;

  let ultima: string | null = null;

  for (const source of sources) {
    if (!esAnterior(source.weekOf, week)) continue;

    const asignado = source.weekend_meeting?.public_talk?.find(
      (record) => record.type === dataView
    )?.value;

    if (Number(asignado) !== talkNumber) continue;

    if (!ultima || source.weekOf > ultima) ultima = source.weekOf;
  }

  return ultima;
};

/**
 * Si hay que avisar de que este discurso se repite, y con qué datos.
 *
 * `mesesAviso` a 0 —o sin discurso, o sin repetición— significa que no hay nada
 * que decir. Que el aviso lo pida la congregación y no la aplicación es a
 * propósito: cada una tiene su costumbre sobre cuánto debe pasar.
 */
export const publicTalkRepeatNotice = ({
  sources,
  talkNumber,
  dataView,
  week,
  mesesAviso,
}: {
  sources: SourceWeekType[];
  talkNumber: number;
  dataView: string;
  week: string;
  mesesAviso: number;
}): { weekOf: string; meses: number } | null => {
  if (!mesesAviso || mesesAviso <= 0) return null;

  const ultima = publicTalkLastGiven({ sources, talkNumber, dataView, week });

  if (!ultima) return null;

  const meses = mesesEntreSemanas(ultima, week);

  if (meses >= mesesAviso) return null;

  return { weekOf: ultima, meses };
};
