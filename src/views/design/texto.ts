/**
 * Los cortes de línea del sistema.
 *
 * En una lista de nombres separados por puntos —«José Joaquín Ossa · Gloria
 * Ossa · Jairo Abad»— el renglón se parte por cualquier espacio, y el espacio
 * de dentro de un nombre vale tanto como el de al lado del punto. El resultado
 * es un «Ossa» solo al principio de la línea siguiente, huérfano de su nombre.
 */

/**
 * Convierte un nombre en una sola pieza a efectos de corte: sus espacios pasan
 * a ser espacios duros, así que o cabe entero en la línea o baja entero.
 *
 * Se ven exactamente igual —el espacio duro se dibuja como un espacio normal—;
 * lo único que cambia es dónde puede cortar el renglón.
 */
export const nombreEntero = (nombre: string) =>
  // El escape, no el carácter: un espacio duro escrito a pelo es invisible
  // en el editor y el primer «limpiado de espacios» se lo lleva por delante.
  (nombre ?? '').replace(/ /g, '\u00A0');

/** Lo mismo para una lista: cada nombre entero, y el corte solo entre unos y otros. */
export const listaDeNombres = (nombres: string[], separador = ' · ') =>
  nombres.filter(Boolean).map(nombreEntero).join(separador);
