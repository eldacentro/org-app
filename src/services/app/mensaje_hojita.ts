/**
 * El mensaje que va escrito en el chat al abrirlo.
 *
 * Función PURA, y aparte de la pantalla, por dos motivos. Uno: se puede probar,
 * y lo que aquí salga mal se lo lleva un hermano en el teléfono sin que nadie
 * lo revise. Dos: el mensaje del AYUDANTE es la parte delicada de todo esto y
 * merece leerse entero, de una vez, sin `sx` alrededor.
 *
 * ── Por qué el mensaje del ayudante está escrito así ─────────────────────
 *
 * El riesgo no es que el mensaje sea incompleto: es que se lea por encima y el
 * hermano crea que la parte es suya. Se prepara la demostración, se planta el
 * miércoles con el tema aprendido, y quien la tenía que hacer no la ha
 * preparado. Así que:
 *
 *  · **El papel va primero.** Antes de la fecha y antes de la parte. Un mensaje
 *    de WhatsApp se lee de la primera línea a la tercera, y el que se salta el
 *    resto tiene que haber leído ya lo importante.
 *  · **En negrita, no en mayúsculas.** Los asteriscos de WhatsApp son negrita
 *    de verdad en el chat; escribir «AYUDANTE» sería gritar y, encima, en la
 *    app está prohibido (ver DESIGN_SYSTEM §5).
 *  · **Se dice quién lleva la parte, por su nombre.** «La parte la lleva él» a
 *    secas se puede leer como una fórmula; con el nombre delante, no.
 *  · **La palabra es AYUDANTE, no auxiliar.** Y aquí hay un filo que se vio
 *    mirando la hoja de verdad, no el diccionario: la S-89 impresa titula esa
 *    línea «Auxiliar:» (usa `tr_assistant`; la clave `tr_assistantS89`, que sí
 *    dice «Ayudante», no la usa nadie) — y en la MISMA hoja, tres líneas más
 *    abajo, pone «Sala auxiliar núm. 1». O sea que la palabra ya significa dos
 *    cosas en el propio papel. Por eso el mensaje dice «ayudante», que no
 *    choca con nada…
 *  · **…y por eso la última línea le dice dónde mirar.** Si el mensaje usara
 *    una palabra y la hoja otra sin más, tendría que adivinar que «Auxiliar:»
 *    es él. Nombrar la línea lo cierra: lee el mensaje, mira la hojita, y se
 *    encuentra.
 */

/**
 * El título de la parte, sin el número que el material le pone delante.
 *
 * El material escribe «4. Empiece conversaciones», con el número dentro del
 * propio título. Puesto tal cual en el mensaje sale «la parte 4, "4. Empiece
 * conversaciones"», que dice el número dos veces y se lee como un fallo. Visto
 * en pantalla la primera vez que se probó esto.
 */
export const limpiarTituloParte = (titulo?: string): string | undefined => {
  if (!titulo) return undefined;

  const limpio = titulo.replace(/^\s*\d+\s*[.)-]\s*/, '').trim();

  return limpio.length > 0 ? limpio : undefined;
};

/**
 * El pasaje de la lectura de la Biblia, a secas.
 *
 * Para la lectura, el título es «Lectura de la Biblia» —que no añade nada a
 * «la parte 3»— y lo que el hermano necesita saber es QUÉ lee. Eso está en el
 * otro campo del material, con la referencia al folleto detrás: «Jer 24:1-10
 * (th lección 5).». Se queda solo el pasaje; la lección va en la hojita.
 */
export const limpiarPasaje = (src?: string): string | undefined => {
  if (!src) return undefined;

  const limpio = src
    .replace(/\([^)]*\)/g, '')
    .replace(/[.\s]+$/, '')
    .trim();

  return limpio.length > 0 ? limpio : undefined;
};

export type DatosMensajeHojita = {
  /** Nombre de pila de quien recibe el mensaje. Es un saludo, no un registro. */
  nombre: string;
  papel: 'estudiante' | 'ayudante';
  /** El número que lleva la parte en la propia S-89 ('3' a '7'). */
  parte: string;
  /** Cómo se llama la parte en el material de la semana, si se sabe. */
  tituloParte?: string;
  /** "miércoles 3 de septiembre" — ver `fmtDiaLargo`. */
  fecha: string;
  /**
   * En qué sala. Se omite cuando la congregación tiene una sola: decir «en la
   * sala principal» donde no hay otra es ruido.
   */
  sala?: string;
  /** Solo si es ayudante: el nombre de quien lleva la parte. */
  estudiante?: string;
};

/** "la parte 4" o "la parte 4, «Empiece conversaciones»". */
const laParte = ({ parte, tituloParte }: DatosMensajeHojita) => {
  const base = `la parte ${parte}`;

  return tituloParte ? `${base}, «${tituloParte}»` : base;
};

export const componerMensajeHojita = (datos: DatosMensajeHojita): string => {
  const { nombre, papel, tituloParte, fecha, sala, estudiante } = datos;

  if (papel === 'estudiante') {
    // La coma de cierre de la aposición: «la parte 4, "Empiece
    // conversaciones", el miércoles». Sin título no hay aposición que cerrar y
    // la coma sobraría —«la parte 4, el miércoles» no es español—.
    const cierre = tituloParte ? ',' : '';
    const enLaSala = sala ? `, en la ${sala}` : '';

    return [
      `Hola, ${nombre}. Te toca ${laParte(datos)}${cierre} el ${fecha}${enLaSala}.`,
      'Te paso la hojita. ¡Gracias!',
    ].join('\n');
  }

  // El ayudante. Tres renglones cortos y en este orden: quién eres, quién
  // lleva la parte, y qué te estoy mandando.
  //
  // La sala va entre paréntesis y no tras una coma como en el otro mensaje:
  // esta frase ya lleva dos comas antes de llegar aquí, y una tercera la deja
  // sin forma justo donde tiene que entenderse a la primera.
  const aQuien = estudiante ? ` de ${estudiante}` : '';
  const enSala = sala ? ` (${sala})` : '';
  const quienLaLleva = estudiante
    ? `La parte la lleva ${estudiante}; tú le acompañas.`
    : 'La parte no es tuya: tú acompañas.';

  return [
    `Hola, ${nombre}. Vas de *ayudante*${aQuien} el ${fecha}, en ${laParte(datos)}${enSala}.`,
    quienLaLleva,
    'Te paso su hojita: tu nombre va en la línea de «Auxiliar». ¡Gracias!',
  ].join('\n');
};
