/**
 * "Semana del 3 al 9 de agosto de 2026" a partir del lunes ('YYYY/MM/DD').
 *
 * Estaba escrito dentro de la cabecera de los programas semanales y hacía
 * falta igual en el editor de departamentos, que enseñaba la fecha de la
 * reunión de entre semana (miércoles 5) en vez de la de la semana (lunes 3).
 * Como el orden de día y mes cambia con el idioma, la frase entera vive en las
 * traducciones y no se pega a mano.
 *
 * Es una función PURA y recibe `t` y los nombres de mes en vez de leerlos: como
 * hook dentro de src/hooks entraba en el barril de hooks y rompía el orden de
 * inicialización de los átomos (`appLangState` llegaba a `false` y reventaba
 * useAppTranslation). Además así se puede probar.
 */

type Translate = (key: string, params?: Record<string, unknown>) => string;

export const buildWeekRangeLabel = (
  weekStr: string,
  monthNames: string[],
  t: Translate
) => {
  if (!weekStr) return '';

  const parts = weekStr.split('/');
  if (parts.length !== 3) return weekStr;

  const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayDay = monday.getDate();
  const mondayMonth = monthNames[monday.getMonth()];
  const mondayYear = monday.getFullYear();

  const sundayDay = sunday.getDate();
  const sundayMonth = monthNames[sunday.getMonth()];
  const sundayYear = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return t('tr_weekRangeSameMonth', {
      mondayDay,
      sundayDay,
      month: mondayMonth,
      year: mondayYear,
    });
  }

  if (monday.getFullYear() === sunday.getFullYear()) {
    return t('tr_weekRangeSameYear', {
      mondayDay,
      mondayMonth,
      sundayDay,
      sundayMonth,
      year: mondayYear,
    });
  }

  return t('tr_weekRangeDiffYear', {
    mondayDay,
    mondayMonth,
    mondayYear,
    sundayDay,
    sundayMonth,
    sundayYear,
  });
};
