/**
 * Los nombres de mes y de día en español, en MINÚSCULA, que es como se
 * escriben: "el 27 de julio", no "el 27 de Julio". La mayúscula solo va cuando
 * la palabra abre la etiqueta, y la pone quien la construye:
 *
 *   `${capitalizarPrimera(MESES_ES[i])} ${año}`  →  "Julio 2026"
 *   `${dia} de ${MESES_ES[i]}`                   →  "30 de julio"
 *
 * ── Por qué existe este fichero ──────────────────────────────────────────
 *
 * Había TRECE arrays de meses escritos a mano repartidos por la app, unos en
 * mayúscula y otros en minúscula, y ninguno sabía de los demás. Por eso en
 * Programas semanales se leía "Semana del 27 de Julio al 2 de Agosto" mientras
 * el saludo del Inicio, tres toques más allá, decía "Jueves, 30 de julio" — esa
 * pantalla usa el formateador del navegador, que sí conoce la regla.
 *
 * ── Y por qué NO se resuelve en el código ────────────────────────────────
 *
 * La tentación es un `.toLowerCase()` donde haga falta. Es un error: la app
 * trae más de cincuenta idiomas y en alemán los meses van en MAYÚSCULA por ser
 * sustantivos. La regla es de cada idioma, así que vive en su diccionario
 * (`locales/es-ES/general.json`) y aquí, que es la copia que usan las pantallas
 * que no pasan por i18n.
 *
 * Ya había un intento de arreglarlo —un `monthCase` en `upcoming_events.ts` que
 * preguntaba "¿estamos en español?" y bajaba la inicial—, pero solo cubría una
 * pantalla. Se retiró al escribir esto.
 */

export const MESES_ES = [
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

/** Empezando en LUNES, que es como se cuentan las semanas en esta app. */
export const DIAS_ES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

/**
 * Empezando en DOMINGO, para indexar directamente con `Date.getDay()`.
 * Es la misma lista; se ofrece hecha para no tener que hacer la cuenta
 * `(getDay() + 6) % 7` en cada sitio, que es justo donde se colaban los fallos
 * de un día de desfase.
 */
export const DIAS_ES_DESDE_DOMINGO = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/**
 * "Miércoles 1" — la cabecera de un día dentro de un mes que ya está dicho
 * más arriba, así que no repite ni el mes ni el año.
 *
 * El día ABRE la etiqueta, así que lleva mayúscula, y la pone esta función.
 * Antes la ponía el CSS con `textTransform: 'capitalize'` en unas pantallas y
 * en otras no la ponía nadie, así que la misma fecha salía "Miércoles 1" en la
 * vista de lista y "miércoles 1" en la de cuadrícula. Y `capitalize` no es un
 * sustituto: pone en mayúscula CADA palabra, así que en cuanto la etiqueta
 * lleva mes —"Miércoles 1 de agosto"— la deja en "Miércoles 1 De Agosto".
 *
 * Había cuatro copias de esta cuenta escritas a mano, dos con los nombres en
 * minúscula y dos con ellos ya en mayúscula.
 */
export const fmtDiaConNumero = (date: Date): string => {
  const dia = DIAS_ES_DESDE_DOMINGO[date.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${date.getDate()}`;
};
