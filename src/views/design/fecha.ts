/**
 * Las fechas de los PDF, en UN solo idioma.
 *
 * La cabecera de cada hoja lleva arriba a la derecha de qué va: un mes, un
 * rango de semanas, el día en que se generó. Cada plantilla se lo escribía a
 * su manera, y en la misma carpeta convivían "julio de 2026",
 * "26 Jul 2026 – 30 Ago 2026", "Julio 2026 · Hoja 1 de 2" y "31 de julio de
 * 2026". El dato es distinto en cada documento —eso está bien—, pero el idioma
 * tiene que ser el mismo.
 *
 * La forma de la casa: mes en minúscula y con "de". Nunca abreviado, nunca en
 * versalitas, nunca con el mes en medio de dos números.
 */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const aFecha = (valor?: string | Date) => {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "julio de 2026" — para lo que cubre un mes entero. */
export const fechaMes = (valor?: string | Date) => {
  const d = aFecha(valor);
  return d ? `${MESES[d.getMonth()]} de ${d.getFullYear()}` : '';
};

/** "31 de julio de 2026" — para un día concreto. */
export const fechaLarga = (valor?: string | Date) => {
  const d = aFecha(valor);
  return d
    ? `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
    : '';
};

/**
 * "13 – 19 de julio de 2026", y si cruza mes o año, lo dice entero en los dos
 * lados: "26 de julio – 30 de agosto de 2026".
 */
export const fechaRango = (desde?: string | Date, hasta?: string | Date) => {
  const a = aFecha(desde);
  const b = aFecha(hasta);
  if (!a || !b) return '';

  if (a.getFullYear() !== b.getFullYear()) {
    return `${fechaLarga(a)} – ${fechaLarga(b)}`;
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} de ${MESES[a.getMonth()]} – ${fechaLarga(b)}`;
  }
  return `${a.getDate()} – ${fechaLarga(b)}`;
};

/** "28/07/2026" — solo para el pie, donde el sitio manda. */
export const fechaCorta = (valor?: string | Date) => {
  const d = aFecha(valor);
  if (!d) return '';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  return `${dd}/${mm}/${d.getFullYear()}`;
};
