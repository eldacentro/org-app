import { SourceWeekType } from '@definition/sources';

/**
 * Enlaces a JW Library.
 *
 * Vivían dentro de "Mis asignaciones", pero hacen falta igual en el programa
 * semanal, así que están aquí: puros, en un solo sitio y con pruebas. Si esto
 * se equivoca no falla nada — simplemente se abre la publicación equivocada,
 * que es peor, porque nadie lo nota hasta estar en la reunión.
 */

const FINDER = 'https://www.jw.org/finder?srcid=jwlshare';

const porDocumento = (docid: number, locale: string) =>
  `${FINDER}&wtlocale=${locale}&prefer=lang&docid=${docid}`;

/**
 * Reunión de entre semana.
 *
 * Con el .jwpub importado se abre la SEMANA exacta. Sin él se cae al cuaderno
 * del bimestre, que sí se puede deducir de la fecha sin riesgo: la Guía se
 * publica de dos en dos meses (enero-febrero, marzo-abril…) y el número lleva
 * siempre el primer mes del par, que es impar.
 */
export const midweekJwLibraryLink = (
  source: SourceWeekType | undefined,
  monday: string,
  locale: string
) => {
  if (source?.mwb_week_docid) {
    return porDocumento(source.mwb_week_docid, locale);
  }

  const [year, month] = (monday ?? '').split('/');
  const monthNum = parseInt(month, 10);

  if (!year || !Number.isFinite(monthNum)) return null;

  const issueMonth = String(
    monthNum % 2 === 0 ? monthNum - 1 : monthNum
  ).padStart(2, '0');

  return `${FINDER}&wtlocale=${locale}&prefer=lang&pub=mwb&issue=${year}${issueMonth}`;
};

/**
 * Estudio de La Atalaya.
 *
 * Aquí NO hay red de seguridad, y es a propósito: el número de estudio se
 * publica dos o tres meses antes de estudiarse, y ese desfase cambia dentro
 * del propio cuaderno (la última semana ya cae en el mes siguiente).
 * Deducirlo de la fecha acertaría casi siempre y mandaría al hermano al número
 * equivocado el resto de las veces. Sin identificador, no hay enlace.
 */
export const watchtowerJwLibraryLink = (
  source: SourceWeekType | undefined,
  locale: string
) => {
  if (!source?.w_study_docid) return null;

  return porDocumento(source.w_study_docid, locale);
};
