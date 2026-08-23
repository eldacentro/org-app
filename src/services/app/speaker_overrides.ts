import { VisitingSpeakerType } from '@definition/visiting_speakers';

/**
 * Correcciones locales a los discursos de un orador del circuito.
 *
 * EL PROBLEMA QUE RESUELVE. La lista de discursos de un orador del circuito no
 * se fusiona campo a campo como el resto de sus datos: el servidor la
 * reconstruye ENTERA desde el Google Sheets en cada pasada — lo que el Sheet
 * trae se queda, y lo que no trae se marca como borrado. Así que un hermano
 * puede cambiar sus discursos, no decírselo a quien lleva el Sheet, decírnoslo
 * a nosotros… y aquí no hay forma de apuntarlo: al día siguiente vuelve lo
 * viejo.
 *
 * POR QUÉ NO SE EDITA LA TABLA. Aunque se quitara el candado, esa tabla la
 * subimos nosotros al servidor: nuestra edición subiría, el Sheet volvería a
 * marcar el discurso como borrado, y vuelta a empezar cada pocos minutos. Es la
 * tormenta de sincronización que este repo ya sufrió una vez.
 *
 * CÓMO SE RESUELVE. Igual que el cancionero y los bosquejos de discursos: la
 * tabla original sigue siendo fiel al Sheet, las correcciones viven aparte, y se
 * aplican AL LEER. Nada que el Sheet pueda pisar, nada que subir, y todo lo que
 * enseña oradores —el catálogo y el selector del fin de semana— ve ya la lista
 * buena.
 */

export type SpeakerOverride = {
  /** A qué orador corrige. */
  speakerUid: string;
  /** Su lista de discursos DE VERDAD, entera. */
  talks: number[];
  /** De dónde salió la corrección: «me lo dijo Andrés el 20 de agosto». */
  note?: string;
  /** Quién la apuntó, para poder preguntarle. */
  byName?: string;
  updatedAt: string;
};

/** Las mismas dos listas, sin importar el orden. */
const mismosDiscursos = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;

  const ordenados = [...b].sort((x, y) => x - y);

  return [...a].sort((x, y) => x - y).every((n, i) => n === ordenados[i]);
};

/** Los discursos que la aplicación tiene hoy por buenos para ese orador. */
export const discursosVigentes = (speaker: VisitingSpeakerType): number[] =>
  (speaker?.speaker_data?.talks ?? [])
    .filter((talk) => !talk._deleted)
    .map((talk) => talk.talk_number);

/**
 * Aplica una corrección a un orador.
 *
 * Se CONSERVAN las canciones ya apuntadas a cada discurso: son trabajo de esta
 * congregación y no tienen nada que ver con que la lista estuviera mal.
 */
export const aplicarCorreccion = (
  speaker: VisitingSpeakerType,
  correccion: SpeakerOverride
): VisitingSpeakerType => {
  const previos = speaker.speaker_data.talks ?? [];
  const porNumero = new Map(previos.map((talk) => [talk.talk_number, talk]));
  const buenos = new Set(correccion.talks);

  const talks = correccion.talks.map((numero) => {
    const previo = porNumero.get(numero);

    if (previo) return { ...previo, _deleted: false };

    return {
      _deleted: false,
      updatedAt: correccion.updatedAt,
      talk_number: numero,
      talk_songs: [] as number[],
    };
  });

  // Los que ya no da: se marcan borrados, no se tiran. Si mañana el Sheet
  // vuelve a traerlos con sus canciones, están donde estaban.
  for (const previo of previos) {
    if (buenos.has(previo.talk_number)) continue;

    talks.push({ ...previo, _deleted: true });
  }

  return {
    ...speaker,
    speaker_data: { ...speaker.speaker_data, talks },
  };
};

/**
 * Aplica todas las correcciones a la lista de oradores.
 *
 * Un orador sin corrección se devuelve TAL CUAL —el mismo objeto—, para que las
 * comparaciones por referencia de React sigan funcionando y no se redibuje medio
 * catálogo por nada.
 */
export const aplicarCorrecciones = (
  speakers: VisitingSpeakerType[],
  correcciones: SpeakerOverride[]
): VisitingSpeakerType[] => {
  if (!correcciones || correcciones.length === 0) return speakers;

  const porOrador = new Map(correcciones.map((c) => [c.speakerUid, c]));

  return speakers.map((speaker) => {
    const correccion = porOrador.get(speaker.person_uid);

    if (!correccion) return speaker;

    return aplicarCorreccion(speaker, correccion);
  });
};

/**
 * Si la corrección ya no hace falta porque el Sheet dice lo mismo.
 *
 * No se borra sola: que coincidan hoy no quiere decir que quien lleva el Sheet
 * se haya enterado —puede ser casualidad de una pasada—, y borrar una
 * corrección sin que nadie lo pida es perder el rastro de algo que costó una
 * llamada de teléfono. Se marca, y que decida quien lleva el catálogo.
 */
export const correccionRedundante = (
  speaker: VisitingSpeakerType | undefined,
  correccion: SpeakerOverride | undefined
): boolean => {
  if (!speaker || !correccion) return false;

  return mismosDiscursos(discursosVigentes(speaker), correccion.talks);
};
