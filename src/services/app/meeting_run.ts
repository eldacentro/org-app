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

/** Una parte del programa, con la hora a la que TENÍA que empezar. */
export type MeetingRunPart = {
  key: string;
  /** Hora prevista de inicio, en 24 h («20:11»). */
  start: string;
  /** Minutos previstos, deducidos de cuándo empieza la siguiente. */
  minutes: number;
};

/** Lo que se guarda mientras la reunión está en marcha. */
export type MeetingRunRecord = {
  weekOf: string;
  dataView: string;
  /** Cuándo se pulsó «Seguir la reunión». */
  startedAt: number;
  /** Cuándo empezó la parte que está sonando ahora. */
  partStartedAt: number;
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
export const buildMidweekRunParts = (
  timing: Partial<Record<MeetingRunPartKey, string>>
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

    parts.push({ key, start, minutes });
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

  const finPrevisto = timeToMinutes(part.start) + part.minutes;

  if (!Number.isFinite(finPrevisto)) return 0;

  const transcurrido = Math.max(0, (now - partStartedAt) / 60000);
  const finProyectado =
    minutesOfDay(partStartedAt) + Math.max(transcurrido, part.minutes);

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

  parts.forEach((part, index) => {
    if (index < run.index) {
      status[part.key] = 'done';
      return;
    }

    if (index === run.index) {
      status[part.key] = 'current';
      return;
    }

    status[part.key] = 'upcoming';

    if (run.drift !== 0) {
      shifted[part.key] = formatTime(shiftTime(part.start, run.drift));
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
