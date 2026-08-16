/**
 * El teléfono de una persona, listo para `wa.me`.
 *
 * WhatsApp pide el número en crudo con prefijo de país y sin nada más: ni `+`,
 * ni espacios, ni guiones. Lo que hay guardado en las fichas es lo que cada uno
 * escribió a mano, así que hace falta un sitio ÚNICO que traduzca de lo uno a
 * lo otro.
 *
 * Medido sobre una copia real de la congregación (2026-08): 96 personas
 * activas, 90 con teléfono y 6 sin él; los 90 en el mismo formato —nueve
 * dígitos empezando por 6, 7, 8 o 9, sin prefijo— y solo uno con espacios. O
 * sea que en la práctica esto es «quitar lo que no sea número y anteponer 34».
 *
 * Aun así devuelve `null` en vez de adivinar, y esa es la parte importante.
 * Un número que no encaje NO se convierte en un `wa.me` a medias: se convierte
 * en una fila que dice «sin teléfono» y que se ve en la lista antes de pulsar
 * nada. Componer un enlace con un número inventado abre el chat de otra
 * persona, y eso no da ningún error — le llega la hojita a quien no es.
 */

/** Los prefijos de móvil y fijo de España. */
const INICIOS_ES = ['6', '7', '8', '9'];

/**
 * De lo que hay en la ficha al número que entiende WhatsApp.
 *
 * Devuelve los dígitos con prefijo de país y sin `+` (`'34612345678'`), o
 * `null` si no hay forma de estar seguro.
 */
export const normalizarTelefono = (
  telefono: string | null | undefined
): string | null => {
  if (!telefono) return null;

  const digitos = telefono.replace(/\D/g, '');

  if (digitos.length === 0) return null;

  // `00` es el `+` marcado a la antigua. Se normaliza a la misma forma para no
  // tener que repetir cada regla de abajo en dos variantes.
  const marcaInternacional = digitos.startsWith('00') && digitos.length > 2;

  const limpio = marcaInternacional ? digitos.slice(2) : digitos;

  // Un `+` (o su `00`) escrito a mano es la persona diciendo «este número lleva
  // su país delante», y se le cree. El `+` se mira sobre el texto original,
  // porque quitar los símbolos es justo lo que lo borraría. Sin esto, el
  // hermano con número portugués acabaría contado entre los que no tienen
  // teléfono.
  const llevaPais = telefono.trim().startsWith('+') || marcaInternacional;

  // Nueve dígitos y empieza por 6/7/8/9: el caso de los 90.
  if (limpio.length === 9 && INICIOS_ES.includes(limpio[0])) {
    return `34${limpio}`;
  }

  // Ya venía con el 34 delante, escrito como `+34…`, `0034…` o `34…`.
  if (
    limpio.length === 11 &&
    limpio.startsWith('34') &&
    INICIOS_ES.includes(limpio[2])
  ) {
    return limpio;
  }

  // Cualquier otro país, pero solo si quien lo escribió puso el prefijo. El
  // rango es el de la norma E.164: de 8 a 15 dígitos contando el país. Sin `+`
  // no se entra aquí a propósito — un número de nueve dígitos que no empiece
  // por 6/7/8/9 es casi siempre un error de tecleo, no un número de Andorra.
  if (llevaPais && limpio.length >= 8 && limpio.length <= 15) {
    return limpio;
  }

  return null;
};

/**
 * El enlace que abre el chat con el mensaje ya escrito.
 *
 * `wa.me` es el enlace público de WhatsApp: abre la aplicación instalada si la
 * hay, y si no la web. No manda nada — deja el mensaje escrito en la caja de
 * texto y el último toque, el de enviar, lo da una persona. Que es justo lo que
 * queremos: automatizar el trabajo, no el envío.
 */
export const enlaceWhatsApp = (telefono: string, mensaje: string): string => {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
};
