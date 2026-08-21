/**
 * Seguir la reunión de entre semana en directo.
 *
 * La aplicación YA sabe a qué hora empieza cada parte: `schedulesMidweekGetTiming`
 * lo calcula desde la hora de la reunión y la duración de cada punto, y es lo que
 * pinta esos relojitos grises a la izquierda del programa. Aquí no se recalcula
 * nada de eso; solo se compara con la hora que es.
 *
 * Todo lo que hay en este fichero es aritmética de reloj, sin React y sin Dexie,
 * para poder comprobarse solo. Lo que se ve por pantalla vive en
 * `features/meetings/weekly_schedules/meeting_run`.
 *
 * IMPORTANTE: las horas que entran aquí son SIEMPRE de 24 horas. El programa que
 * se ve en pantalla puede estar en formato de 12 («8:11» para las 20:11) porque
 * `useMidweekMeeting` lo convierte para enseñarlo, y con eso no se puede restar:
 * las 8:11 de la tarde y las de la mañana se escriben igual. Quien llame a esto
 * tiene que pedir su propio cálculo de horas con la hora de la reunión tal cual
 * está guardada.
 */

/**
 * El orden real del programa.
 *
 * Sale de leer `schedulesMidweekGetTiming` de arriba abajo. Las dos semanas
 * especiales encajan en la misma lista sin excepciones: en una semana con
 * estudio bíblico no existe `co_talk`, y en la semana de la visita del
 * superintendente no existe `cbs` y su discurso va DESPUÉS de las palabras de
 * conclusión.
 */
export const MIDWEEK_RUN_ORDER = [
  'pgm_start',
  'opening_comments',
  'tgw_talk',
  'tgw_gems',
  'tgw_bible_reading',
  'ayf_part1',
  'ayf_part2',
  'ayf_part3',
  'ayf_part4',
  'lc_middle_song',
  'lc_part1',
  'lc_part2',
  'lc_part3',
  'cbs',
  'concluding_comments',
  'co_talk',
  'pgm_end',
] as const;

export type MeetingRunPartKey = (typeof MIDWEEK_RUN_ORDER)[number];

/**
 * Un PASO de la reunión.
 *
 * Casi siempre es una parte del programa tal cual. Pero un hueco puede llevar
 * dos cosas seguidas —la canción y la oración del principio— y entonces son dos
 * pasos que comparten el mismo relojito: por eso `key` y `badgeKey` no siempre
 * coinciden.
 */
export type MeetingRunPart = {
  /** Clave única del paso. */
  key: string;
  /** Qué relojito del programa se ilumina. Dos pasos pueden compartirlo. */
  badgeKey: string;
  /** La hora prevista del HUECO, para pintar ese relojito. */
  slotStart: string;
  /** Minuto del día en que debía empezar ESTE paso. Admite decimales. */
  startMinutes: number;
  /** Lo que debía durar ESTE paso, en segundos. */
  seconds: number;
  /**
   * Si quien preside tiene que presentarla antes de que arranque el reloj.
   *
   * Las canciones, las oraciones y sus propias palabras no se presentan: ahí no
   * hay nadie a quien anunciar, y pedir dos toques sería estorbar.
   */
  presented: boolean;
  /**
   * Si se pasa sola al terminar.
   *
   * Solo la canción, y solo cuando jw.org ha dicho cuánto dura: es el único
   * sitio del programa donde se sabe de antemano. Adivinarlo en cualquier otro
   * sería peor que no hacer nada — pasaría de parte mientras el hermano sigue
   * hablando.
   */
  autoAdvance: boolean;
};

/** Lo que se guarda mientras la reunión está en marcha. */
export type MeetingRunRecord = {
  weekOf: string;
  dataView: string;
  /** Cuándo se pulsó «Seguir la reunión». */
  startedAt: number;
  /**
   * Cuándo se pasó a la parte que está sonando ahora.
   *
   * Es cuando quien preside EMPIEZA A PRESENTARLA, no cuando el hermano empieza
   * a hablar. Y así tiene que ser para el desfase: el hueco del programa
   * incluye la presentación, así que si presentar se alarga, la reunión va
   * tarde de verdad.
   */
  partStartedAt: number;
  /**
   * Cuándo empezó la parte de verdad, ya presentada.
   *
   * Sin esto, la presentación y los consejos de después se le sumaban a alguna
   * parte —a la de antes o a la de después, según cuándo se pulsara—, y el
   * tiempo apuntado a un estudiante no era el suyo. Vacío mientras se presenta.
   */
  runningAt?: number;
  /** Índice dentro de la lista de partes. */
  index: number;
  /** Lo que duró de verdad cada parte terminada, en segundos. */
  actual: Record<string, number>;
  /** Minutos de desfase con el programa; negativo si se va por delante. */
  drift: number;
  /**
   * Lo que ya estaba desplazada la reunión al arrancarla.
   *
   * Vale 0 en el caso normal —se le da al botón a la hora de la reunión— y solo
   * se llena cuando se arranca lejos de esa hora: probando un viernes por la
   * tarde una reunión que fue ayer, o retomándola con mucho retraso. Sirve para
   * separar dos cosas que no son la misma: DESDE DÓNDE empezó la reunión, que
   * no es culpa de nadie, y cuánto se está alargando ahora, que es lo único que
   * hay que mirar mientras se preside.
   */
  offset?: number;
  finishedAt?: number;
  /**
   * Lo que quien preside apuntó de cada parte, por clave de parte.
   *
   * Es lo único de aquí que puede ser delicado —«se pasó», «se le oía mal»—,
   * así que en cuanto esto se comparta entre dispositivos tiene que viajar
   * cifrado con la llave maestra, como las notas de Territorios.
   */
  /**
   * Lo que dura la canción del principio, en segundos, en el momento de
   * arrancar.
   *
   * Se guarda con la reunión y no se vuelve a mirar: los pasos se numeran por
   * posición, así que si un teléfono partiera el hueco de «canción y oración» y
   * otro no, el que mira vería una parte distinta de la que va. Guardándolo,
   * todos montan la misma lista aunque uno tenga las duraciones y el otro no.
   */
  songSeconds?: number;
  notes?: Record<string, string>;
};

export type MeetingRunStatus = 'done' | 'current' | 'upcoming';

/**
 * Lo que necesita el programa para pintarse: en qué estado está cada parte y, si
 * la reunión va corrida, a qué hora va a empezar de verdad cada una de las que
 * faltan.
 */
export type MeetingRunView = {
  weekOf: string;
  dataView: string;
  status: Record<string, MeetingRunStatus>;
  /** Solo las partes que quedan, y solo si hay desfase. Ya formateadas. */
  shifted: Record<string, string>;
  drift: number;
  finished: boolean;
};

/**
 * Una reunión que lleva más de esto abierta es una que alguien se dejó a
 * medias. No se sigue enseñando: la hora del móvil sigue corriendo y el desfase
 * acabaría diciendo que la reunión va cuatro horas tarde.
 */
export const RUN_STALE_MS = 6 * 60 * 60 * 1000;

/**
 * A partir de aquí, el desfase no es un desfase.
 *
 * Ninguna reunión va una hora tarde. Un número así solo sale de dos sitios: se
 * dejó la reunión abierta y el reloj siguió corriendo, o alguien cambió la hora
 * de la reunión en Ajustes por debajo. En cualquiera de los dos casos lo que
 * hay que hacer es dar la reunión por terminada, no anunciar que va 331 minutos
 * por delante y correr las horas de todo el programa a un sitio absurdo.
 */
export const DRIFT_ABANDONADA = 60;

/**
 * Cuánto se puede empezar lejos de la hora prevista sin que cuente como retraso.
 *
 * Dentro de este margen, arrancar tarde ES ir tarde y así se dice. Más allá, lo
 * que pasa es que no se está en la reunión —se está probando, o retomándola
 * horas después—, y entonces el programa empieza cuando se pulsa el botón.
 */
export const ANCLA_MINUTOS = 15;

/** El desfase que hay que enseñar: el que se ha acumulado, sin el de partida. */
export const runDesfase = (run: MeetingRunRecord): number =>
  run.drift - (run.offset ?? 0);

/** «20:11» → 1211. Devuelve NaN si la cadena no es una hora. */
export const timeToMinutes = (time: string): number => {
  if (typeof time !== 'string') return NaN;

  const parts = time.split(':');

  if (parts.length < 2) return NaN;

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;

  return hour * 60 + minute;
};

/** 1211 → «20:11». Da la vuelta al pasar de medianoche. */
export const minutesToTime = (value: number): string => {
  const total = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour = Math.floor(total / 60);
  const minute = total % 60;

  return `${hour}:${String(minute).padStart(2, '0')}`;
};

/** La misma hora corrida N minutos. */
export const shiftTime = (time: string, minutes: number): string => {
  const base = timeToMinutes(time);

  if (!Number.isFinite(base)) return time;

  return minutesToTime(base + minutes);
};

/** Los minutos transcurridos del día en un instante dado. */
export const minutesOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);

  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
};

/**
 * La lista ordenada de partes, con su duración.
 *
 * La duración NO se vuelve a calcular desde el material: se deduce de cuándo
 * empieza la siguiente parte. Así se hereda tal cual todo lo que el cálculo
 * original ya tiene en cuenta (el minuto de consejo después de una asignación
 * estudiantil, los cinco de la canción del medio, los treinta del discurso del
 * superintendente), y no hay dos sitios que puedan discrepar.
 *
 * Una parte que dura cero es una parte que esa semana no existe: cuando falta
 * material, el cálculo original le da a la siguiente la misma hora que a ella.
 */
/**
 * Los pasos que NO se presentan.
 *
 * Una canción no se anuncia, una oración tampoco, y las palabras del presidente
 * son suyas. Pedir dos toques en esos sitios sería estorbar por sistema.
 */
const SIN_PRESENTAR = new Set([
  'pgm_start',
  'pgm_start_song',
  'pgm_start_prayer',
  'opening_comments',
  'lc_middle_song',
  'concluding_comments',
]);

/**
 * Lo mínimo que tiene que quedar para la oración al partir el hueco.
 *
 * Si la canción se comiera casi todo el hueco, partirlo daría un paso de diez
 * segundos que solo sirve para tener que pulsar otra vez.
 */
const MINIMO_ORACION_SEGUNDOS = 45;

export const buildMidweekRunParts = (
  timing: Partial<Record<MeetingRunPartKey, string>>,
  opciones?: {
    /**
     * Lo que dura de verdad la canción del principio, según jw.org.
     *
     * Con eso, el hueco de «canción y oración» se parte en dos pasos y el de la
     * canción se pasa solo al terminar: es el único sitio del programa donde se
     * sabe de antemano cuánto va a durar algo.
     */
    cancionInicialSegundos?: number;
  }
): MeetingRunPart[] => {
  if (!timing) return [];

  const presentes = MIDWEEK_RUN_ORDER.filter((key) => {
    const value = timing[key];

    return typeof value === 'string' && Number.isFinite(timeToMinutes(value));
  });

  const parts: MeetingRunPart[] = [];

  for (let i = 0; i < presentes.length - 1; i++) {
    const key = presentes[i];
    const start = timing[key];
    const minutes =
      timeToMinutes(timing[presentes[i + 1]]) - timeToMinutes(start);

    if (minutes <= 0) continue;

    const startMinutes = timeToMinutes(start);
    const seconds = minutes * 60;

    const cancion = opciones?.cancionInicialSegundos;

    const partible =
      key === 'pgm_start' &&
      !!cancion &&
      cancion > 0 &&
      seconds - cancion >= MINIMO_ORACION_SEGUNDOS;

    if (partible) {
      parts.push({
        key: 'pgm_start_song',
        badgeKey: key,
        slotStart: start,
        startMinutes,
        seconds: cancion,
        presented: false,
        autoAdvance: true,
      });

      parts.push({
        key: 'pgm_start_prayer',
        badgeKey: key,
        slotStart: start,
        startMinutes: startMinutes + cancion / 60,
        seconds: seconds - cancion,
        presented: false,
        autoAdvance: false,
      });

      continue;
    }

    parts.push({
      key,
      badgeKey: key,
      slotStart: start,
      startMinutes,
      seconds,
      presented: !SIN_PRESENTAR.has(key),
      autoAdvance: false,
    });
  }

  return parts;
};

/**
 * Cuántos minutos tarde va la reunión.
 *
 * Se mide sobre el final PREVISTO de la parte que está sonando, no sobre lo que
 * lleva acumulado: si el que habla ya se pasó, cuenta lo que lleva; si todavía
 * le queda, se le da por hecho que va a usar todo su tiempo. Suponer que va a
 * terminar antes sería adivinar, y adivinar a la baja es justo lo que hace que
 * una reunión termine tarde sin que nadie lo viera venir.
 */
export const runDrift = ({
  part,
  partStartedAt,
  now,
}: {
  part: MeetingRunPart | undefined;
  partStartedAt: number;
  now: number;
}): number => {
  if (!part) return 0;

  const previstos = part.seconds / 60;
  const finPrevisto = part.startMinutes + previstos;

  if (!Number.isFinite(finPrevisto)) return 0;

  const transcurrido = Math.max(0, (now - partStartedAt) / 60000);
  const finProyectado =
    minutesOfDay(partStartedAt) + Math.max(transcurrido, previstos);

  return Math.round(finProyectado - finPrevisto);
};

/**
 * El estado de cada parte y las horas corridas.
 *
 * `formatTime` la pone quien llama, porque el formato de 12 o 24 horas es una
 * preferencia de la cuenta y este fichero no mira ajustes.
 */
export const buildMeetingRunView = ({
  run,
  parts,
  formatTime,
}: {
  run: MeetingRunRecord;
  parts: MeetingRunPart[];
  formatTime: (time: string) => string;
}): MeetingRunView => {
  const status: Record<string, MeetingRunStatus> = {};
  const shifted: Record<string, string> = {};

  const finished = !!run.finishedAt;

  // Ojo con los dos números: las horas se corren con el desplazamiento COMPLETO
  // —es la hora a la que va a pasar cada cosa de verdad—, pero lo que se pinta
  // de naranja es solo lo que se está alargando ahora.
  const desfase = runDesfase(run);

  // Terminada la reunión, el programa vuelve a verse como siempre. Dejar todos
  // los relojitos apagados haría que la página pareciera desactivada el resto
  // de la semana; lo que pasó ya lo cuenta el resumen de abajo.
  if (finished) {
    return {
      weekOf: run.weekOf,
      dataView: run.dataView,
      status,
      shifted,
      drift: desfase,
      finished,
    };
  }

  /**
   * Se pinta por RELOJITO, no por paso.
   *
   * Un hueco puede llevar dos pasos —la canción y la oración— y solo tiene un
   * relojito: mientras se esté en cualquiera de los dos, ese relojito está «en
   * curso». Iterando pasos, el segundo sobreescribía al primero y el hueco se
   * apagaba a mitad.
   */
  parts.forEach((part, index) => {
    const previo = status[part.badgeKey];

    const propio: MeetingRunStatus =
      index < run.index ? 'done' : index === run.index ? 'current' : 'upcoming';

    // Manda el estado más «vivo» de los pasos de ese hueco.
    if (previo === 'current') return;
    if (previo === 'upcoming' && propio === 'done') return;

    status[part.badgeKey] = propio;

    // Con el desplazamiento COMPLETO, no con el desfase: el relojito tiene que
    // decir a qué hora va a pasar la cosa DE VERDAD. El desfase es otra cosa —lo
    // que se está alargando— y es lo que decide si se pinta de naranja.
    if (propio === 'upcoming' && run.drift !== 0) {
      shifted[part.badgeKey] = formatTime(shiftTime(part.slotStart, run.drift));
    }

    if (propio !== 'upcoming') {
      delete shifted[part.badgeKey];
    }
  });

  return {
    weekOf: run.weekOf,
    dataView: run.dataView,
    status,
    shifted,
    drift: desfase,
    finished,
  };
};

/* ─────────────────────────── dónde se guarda ─────────────────────────────
 *
 * En el propio navegador y en ningún sitio más. NO va a Dexie y por tanto NO se
 * sincroniza: los tiempos de una reunión son una nota del que preside, no un
 * dato de la congregación, y meterlos en el ciclo de subida obligaría a tocar la
 * capa que ya ha costado dos incidentes de pérdida de datos. Si algún día se
 * quieren compartir entre ancianos, se añade encima; no se empieza por ahí.
 */

export const meetingRunStorageKey = (weekOf: string, dataView: string) =>
  `meetingRun:${weekOf}:${dataView}`;

export const readMeetingRun = (
  weekOf: string,
  dataView: string,
  now = Date.now()
): MeetingRunRecord | null => {
  try {
    const raw = localStorage.getItem(meetingRunStorageKey(weekOf, dataView));

    if (!raw) return null;

    const parsed = JSON.parse(raw) as MeetingRunRecord;

    if (!parsed || typeof parsed.startedAt !== 'number') return null;

    // Una reunión que se quedó abierta ayer no vale para nada: el desfase que
    // saldría de compararla con la hora de hoy sería una barbaridad.
    if (!parsed.finishedAt && now - parsed.startedAt > RUN_STALE_MS) {
      clearMeetingRun(weekOf, dataView);
      return null;
    }

    return parsed;
  } catch {
    // Navegador sin almacenamiento o con el contenido roto. Que no haya nada
    // guardado es un resultado válido, no un error que enseñar.
    return null;
  }
};

export const writeMeetingRun = (run: MeetingRunRecord) => {
  try {
    localStorage.setItem(
      meetingRunStorageKey(run.weekOf, run.dataView),
      JSON.stringify(run)
    );
  } catch {
    /* sin almacenamiento: la reunión se sigue igual, solo que no sobrevive a
       una recarga */
  }
};

export const clearMeetingRun = (weekOf: string, dataView: string) => {
  try {
    localStorage.removeItem(meetingRunStorageKey(weekOf, dataView));
  } catch {
    /* nada que limpiar */
  }
};
