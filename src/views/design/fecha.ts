/**
 * Las fechas del sistema. Implementa la regla **R2 · La fecha es el periodo,
 * no el día**.
 *
 * La cápsula de la cabecera muestra el PERIODO DE VIGENCIA del documento con
 * granularidad de MES. Nunca días sueltos, nunca rangos con día, nunca
 * "Hoja 1 de 2": el día exacto vive en el contenido y la numeración, en el pie.
 *
 * Antes cada plantilla escribía la suya, y en la misma carpeta convivían
 * "julio de 2026", "26 Jul 2026 – 30 Ago 2026", "31 de julio de 2026" y
 * "Julio 2026 · Hoja 1 de 2".
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

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const aFecha = (valor?: string | Date | null) => {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * EL PERIODO DE LA CÁPSULA. Un solo formato para los doce documentos:
 *
 * - Cabe en un mes → `Agosto 2026`
 * - Cruza de mes   → `Agosto – Septiembre 2026`
 * - Cruza de año   → `2026 – 2027`
 *
 * Con un solo argumento, el mes de esa fecha.
 */
export const periodo = (
  desde?: string | Date | null,
  hasta?: string | Date | null
) => {
  const a = aFecha(desde);
  if (!a) return '';

  const b = aFecha(hasta) ?? a;

  if (a.getFullYear() !== b.getFullYear()) {
    return `${a.getFullYear()} – ${b.getFullYear()}`;
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${mayus(MESES[a.getMonth()])} – ${mayus(MESES[b.getMonth()])} ${a.getFullYear()}`;
  }
  return `${mayus(MESES[a.getMonth()])} ${a.getFullYear()}`;
};

/** "1 ago 2026" — para el pie de la hoja. */
export const fechaPie = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d
    ? `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`
    : '';
};

/** "31 de julio de 2026" — para el contenido, donde sí va el día. */
export const fechaLarga = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d
    ? `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
    : '';
};

/** "13 – 19 de julio" — un rango dentro del contenido. */
export const fechaRango = (
  desde?: string | Date | null,
  hasta?: string | Date | null
) => {
  const a = aFecha(desde);
  const b = aFecha(hasta);
  if (!a || !b) return '';

  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} de ${MESES[a.getMonth()]} – ${b.getDate()} de ${MESES[b.getMonth()]}`;
  }
  return `${a.getDate()} – ${b.getDate()} de ${MESES[b.getMonth()]}`;
};

/**
 * "Semana del 14 al 20 de septiembre" — y, cuando la semana cae a caballo de
 * dos meses, "Semana del 31 de agosto al 5 de septiembre".
 *
 * Esta línea es la que permite que las tablas de dentro escriban solo "Mar 15":
 * el mes se dice una vez, arriba, y luego ya se sabe.
 */
export const semanaDel = (
  desde?: string | Date | null,
  hasta?: string | Date | null
) => {
  const a = aFecha(desde);
  const b = aFecha(hasta);
  if (!a) return '';
  if (!b) return `Semana del ${a.getDate()} de ${MESES[a.getMonth()]}`;

  if (a.getMonth() !== b.getMonth()) {
    return `Semana del ${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
  }
  return `Semana del ${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
};

/** "2 ago" — fechas cortas dentro de una tabla. */
export const fechaCortaTabla = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d ? `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` : '';
};

/** El nombre del mes suelto: "agosto". */
export const nombreMes = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d ? MESES[d.getMonth()] : '';
};
