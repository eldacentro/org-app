/**
 * Plurales en español, sin paréntesis.
 *
 * La app escribía "3 territorio(s)" en seis sitios. Eso no es una abreviatura:
 * es un hueco que se dejó sin rellenar, y se lee como tal. Nadie dice
 * "territorio(s)".
 *
 * `enPlural` da la PALABRA, para cuando hay que concordar algo más en la misma
 * frase ("territorios detectados"). `conCuenta` da el número y la palabra
 * juntos, que es el caso corriente.
 *
 *   conCuenta(1, 'territorio')            → "1 territorio"
 *   conCuenta(3, 'territorio')            → "3 territorios"
 *   conCuenta(0, 'territorio')            → "0 territorios"   (correcto)
 *   conCuenta(2, 'vez', 'veces')          → "2 veces"
 *
 * El plural por defecto es añadir una ese, que vale para las palabras que
 * salen aquí. Cuando no valga —"vez", "mes", "lápiz"— se pasa a mano; no se
 * intenta adivinar la regla, porque en español tiene demasiadas excepciones
 * para media docena de usos.
 */
export const enPlural = (
  cantidad: number,
  singular: string,
  plural = `${singular}s`
) => (cantidad === 1 ? singular : plural);

export const conCuenta = (
  cantidad: number,
  singular: string,
  plural?: string
) => `${cantidad} ${enPlural(cantidad, singular, plural)}`;
