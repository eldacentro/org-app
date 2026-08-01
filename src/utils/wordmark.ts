/**
 * EL LOGOTIPO DE TEXTO DE LA CONGREGACIÓN.
 *
 * «Elda **Centro**»: la última palabra en extranegrita y el resto en medium.
 * Es la marca, no una decisión de cada pantalla, así que la regla vive en un
 * solo sitio y la usan por igual la cabecera de la app y la de los PDF —que
 * antes no coincidían: en papel salía la marca y en pantalla el nombre entero
 * en un solo peso.
 *
 * El nombre es un ajuste de la congregación y puede ser cualquiera, de ahí que
 * la regla se exprese como «la última palabra». Para los nombres de este
 * dominio —lugar + calificativo: «Elda Centro», «Petrer Oeste», «Elche
 * Carrús»— el énfasis cae donde debe.
 */
export const partirWordmark = (nombre: string) => {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  const ultima = palabras.pop() ?? '';

  return { lugar: palabras.join(' '), marca: ultima };
};
