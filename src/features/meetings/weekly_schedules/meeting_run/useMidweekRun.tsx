import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { formatDate, generateDateFromTime, getWeekDate } from '@utils/date';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import {
  congIDState,
  congMasterKeyState,
  midweekMeetingChairmanNotesSharedState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  hour24FormatState,
  JWLangState,
  settingsState,
  userLocalUIDState,
} from '@states/settings';
import { congAccountConnectedState } from '@states/app';
import { personsState } from '@states/persons';
import { personGetDisplayName } from '@utils/common';
import {
  publishMeetingRun,
  removeMeetingRun,
  subscribeMeetingRun,
  type SharedMeetingRun,
} from '@services/firebase/meeting_run';
import {
  schedulesGetData,
  schedulesMidweekData,
  schedulesMidweekGetTiming,
} from '@services/app/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import { AssignmentCongregation } from '@definition/schedules';
import {
  ANCLA_MINUTOS,
  buildMeetingRunView,
  buildMidweekRunParts,
  clearMeetingRun,
  DRIFT_ABANDONADA,
  minutesOfDay,
  readMeetingRun,
  runDesfase,
  runDrift,
  timeToMinutes,
  writeMeetingRun,
  type MeetingRunRecord,
} from '@services/app/meeting_run';
import {
  fetchSongDurations,
  readSongDurations,
  songDurationsStale,
} from '@services/app/song_durations';
import { meetingRunViewState } from '@states/meeting_run';
import { buildRunPartsInfo } from './run_parts';

/**
 * Lo que es de la reunión, sin lo que es del reparto de mando.
 *
 * El documento que viaja lleva además quién la lleva y cuándo se escribió; eso
 * no forma parte de la reunión y no tiene por qué guardarse en el teléfono.
 */
const soloLoDeLaReunion = (compartida: SharedMeetingRun): MeetingRunRecord => {
  const copia: Partial<SharedMeetingRun> = { ...compartida };

  delete copia.ownerUid;
  delete copia.ownerName;
  delete copia.updatedAt;

  return copia as MeetingRunRecord;
};

/**
 * Seguir la reunión de entre semana en directo.
 *
 * Quien preside pulsa una vez al terminar cada parte y la barra lleva la cuenta:
 * lo que le queda al que está hablando y cuántos minutos va corrida la reunión.
 * Nada de esto sale del móvil (ver `services/app/meeting_run.ts`).
 */
const useMidweekRun = ({
  week,
  dataView,
}: {
  week: string;
  dataView: string;
}) => {
  const { t } = useAppTranslation();
  const { isElder } = useCurrentUser();

  const schedules = useAtomValue(schedulesState);
  const sources = useAtomValue(sourcesState);
  const settings = useAtomValue(settingsState);
  const lang = useAtomValue(JWLangState);
  const use24 = useAtomValue(hour24FormatState);

  const congId = useAtomValue(congIDState);
  const userUID = useAtomValue(userLocalUIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const compartirNotas = useAtomValue(midweekMeetingChairmanNotesSharedState);
  const conectado = useAtomValue(congAccountConnectedState);
  const persons = useAtomValue(personsState);
  const displayName = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const setView = useSetAtom(meetingRunViewState);

  const schedule = useMemo(
    () => schedules.find((record) => record.weekOf === week),
    [schedules, week]
  );

  const source = useMemo(
    () => sources.find((record) => record.weekOf === week),
    [sources, week]
  );

  const pgmStart = useMemo(() => {
    return (
      settings.cong_settings.midweek_meeting.find(
        (record) => record.type === dataView
      )?.time.value ?? '08:00'
    );
  }, [settings, dataView]);

  /**
   * Lo que está haciendo el que lleva la reunión, si es otro.
   *
   * Se escucha SIEMPRE que hay cuenta conectada, también siendo publicador: las
   * horas corridas del programa son justo lo que quiere ver quien está sentado
   * en el salón. Lo que no se le enseña es la barra de mando ni las notas.
   */
  const [remoto, setRemoto] = useState<SharedMeetingRun | null>(null);

  useEffect(() => {
    if (!conectado || !congId || !week) return;

    return subscribeMeetingRun(congId, week, dataView, masterKey, setRemoto);
  }, [conectado, congId, week, dataView, masterKey]);

  const [local, setLocal] = useState<MeetingRunRecord | null>(null);

  // Al cambiar de semana o de grupo se recupera lo que hubiera guardado de esa
  // semana, no lo que se estuviera mirando antes.
  useEffect(() => {
    setLocal(readMeetingRun(week, dataView));
  }, [week, dataView]);

  /**
   * Lo que dura la canción del principio, según jw.org.
   *
   * Se refrescan solas cuando llevan más de un mes guardadas: los cánticos no
   * cambian a menudo, pero cuando sale uno nuevo nadie va a acordarse de venir a
   * pulsar un botón. Si no se pueden traer, no pasa nada: el hueco de la canción
   * y la oración se queda entero, como estaba.
   */
  const [duraciones, setDuraciones] = useState(() => readSongDurations(lang));

  useEffect(() => {
    const guardadas = readSongDurations(lang);

    setDuraciones(guardadas);

    if (!songDurationsStale(guardadas)) return;

    fetchSongDurations(lang).then((nuevas) => {
      if (nuevas) setDuraciones(nuevas);
    });
  }, [lang]);

  const duracionCancionInicial = useMemo(() => {
    const numero = Number(source?.midweek_meeting?.song_first?.[lang]);

    if (!Number.isFinite(numero) || numero <= 0) return undefined;

    return duraciones?.seconds?.[numero];
  }, [source, lang, duraciones]);

  /**
   * Las horas SIEMPRE en formato de 24, no las que se ven en pantalla.
   *
   * `useMidweekMeeting` convierte las suyas a 12 horas cuando la cuenta lo pide,
   * y con «8:11» no se puede restar: podrían ser las de la mañana. Aquí se pide
   * el cálculo aparte con la hora tal cual está guardada, y el formato bonito se
   * pone solo al final, al escribirlo.
   */
  const parts = useMemo(() => {
    // Un publicador no puede seguir la reunión, pero SÍ tiene que ver las horas
    // corridas cuando alguien la está llevando: es lo que le dice a qué hora va
    // a tocar cada cosa de verdad. Fuera de ese caso no se calcula nada, que
    // esto se rehace en cada pintado de la página y no es gratis.
    if ((!isElder && !remoto) || !schedule || !source) return [];

    try {
      const timing = schedulesMidweekGetTiming({
        schedule,
        source,
        dataView,
        lang,
        pgmStart,
      });

      // Sin final de programa no hay reunión que seguir: es una semana de
      // asamblea, de congreso o sin reunión.
      if (!timing?.pgm_end) return [];

      // La duración que MANDA es la que se guardó al arrancar: los pasos se
      // numeran por posición, así que si un teléfono partiera el hueco y otro no,
      // el que mira vería una parte distinta de la que va.
      const cancionInicialSegundos =
        remoto?.songSeconds ?? local?.songSeconds ?? duracionCancionInicial;

      return buildMidweekRunParts(timing, { cancionInicialSegundos });
    } catch {
      return [];
    }
  }, [
    isElder,
    remoto,
    local,
    duracionCancionInicial,
    schedule,
    source,
    dataView,
    lang,
    pgmStart,
  ]);

  const info = useMemo(() => {
    if (!schedule || parts.length === 0) return {};

    try {
      return buildRunPartsInfo(
        schedulesMidweekData(schedule, dataView, lang),
        t
      );
    } catch {
      // Semana a medio llegar: mejor la barra con los nombres en blanco que la
      // página entera caída.
      return {};
    }
  }, [schedule, dataView, lang, parts.length, t]);

  const formatTime = useCallback(
    (time: string) => {
      if (use24) return time;

      return formatDate(generateDateFromTime(time), 'h:mm');
    },
    [use24]
  );

  /**
   * La lleva otro: se ve, no se toca.
   *
   * El mando es de quien le da al botón, y no del presidente asignado a
   * propósito: el que preside puede no tener el móvil a mano, o puede
   * presidir alguien que no estaba en el programa. Quien arranca, manda.
   */
  const ajeno = useMemo(() => {
    if (!remoto || remoto.ownerUid === userUID) return null;

    // Las notas de OTRO solo se enseñan si la congregación lo ha activado. Bajan
    // igualmente (van cifradas y quien las escribió las necesita en sus otros
    // dispositivos), pero aquí se quedan fuera.
    if (compartirNotas) return remoto;

    return { ...remoto, notes: {} };
  }, [remoto, userUID, compartirNotas]);

  const soloLectura = !!ajeno;
  const run = ajeno ?? local;

  /**
   * La misma persona, otro teléfono.
   *
   * Quien empieza la reunión en el móvil y luego abre la aplicación en la
   * tableta tiene que encontrarse su reunión, con sus notas, y poder seguir
   * desde ahí. Se adopta una sola vez: en cuanto hay algo local, manda lo local.
   */
  useEffect(() => {
    if (!remoto || remoto.ownerUid !== userUID || local) return;

    const propio = soloLoDeLaReunion(remoto);

    setLocal(propio);
    writeMeetingRun(propio);
  }, [remoto, userUID, local]);

  const nombrePropio = useMemo(() => {
    const persona = persons.find((record) => record.person_uid === userUID);

    if (!persona) return '';

    return personGetDisplayName(persona, displayName, fullnameOption);
  }, [persons, userUID, displayName, fullnameOption]);

  /**
   * Guardar y, si hay cuenta, contárselo a los demás.
   *
   * En el teléfono se guarda siempre —también sin red, que es la mitad de la
   * gracia de que esto viva en local—; publicarlo es lo que puede fallar, y si
   * falla no se rompe nada: el que preside sigue con su reunión.
   */
  const guardar = useCallback(
    (next: MeetingRunRecord | null) => {
      setLocal(next);

      if (next) {
        writeMeetingRun(next);
      } else {
        clearMeetingRun(week, dataView);
      }

      if (!conectado || !congId) return;

      const publicado = next
        ? publishMeetingRun({
            congId,
            run: next,
            masterKey,
            shareNotes: compartirNotas,
            ownerUid: userUID,
            ownerName: nombrePropio,
          })
        : removeMeetingRun(congId, week, dataView);

      publicado.catch((error) =>
        console.error('No se pudo publicar la reunión en directo:', error)
      );
    },
    [
      week,
      dataView,
      conectado,
      congId,
      masterKey,
      compartirNotas,
      userUID,
      nombrePropio,
    ]
  );

  const enMarcha = !!run && !run.finishedAt;

  const [now, setNow] = useState(() => Date.now());

  /**
   * El segundero.
   *
   * Corre mientras hay reunión en marcha —la lleve uno mismo o la lleve otro—,
   * porque el reloj y las horas corridas se calculan aquí en cada dispositivo:
   * lo que viaja por la red es solo en qué parte va y a qué hora empezó. Sin
   * reunión no hace falta ningún temporizador.
   */
  useEffect(() => {
    if (!enMarcha) return;

    const id = setInterval(() => setNow(Date.now()), soloLectura ? 5000 : 1000);

    return () => clearInterval(id);
  }, [enMarcha, soloLectura]);

  /**
   * El desfase se guarda, no se calcula al vuelo en cada relojito.
   *
   * El cronómetro de la barra se refresca cada segundo, pero las horas de las
   * partes que quedan solo cambian cuando el desfase cambia de minuto. Guardarlo
   * aquí hace que el programa entero se vuelva a pintar como mucho una vez por
   * minuto en vez de sesenta.
   */
  useEffect(() => {
    if (soloLectura || !run || run.finishedAt) return;

    const drift = runDrift({
      part: parts[run.index],
      partStartedAt: run.partStartedAt,
      now,
    });

    // Se quedó abierta (o cambió la hora de la reunión por debajo). Se da por
    // terminada con el último desfase bueno en vez de enseñar un disparate.
    if (Math.abs(drift - (run.offset ?? 0)) > DRIFT_ABANDONADA) {
      guardar({ ...run, finishedAt: Date.now() });
      return;
    }

    if (drift !== run.drift) {
      guardar({ ...run, drift });
    }
  }, [now, run, parts, guardar, soloLectura]);

  /**
   * El desfase que se PINTA se calcula aquí, no se espera al guardado.
   *
   * Quien manda lo guarda una vez por minuto (arriba), y quien solo mira no
   * guarda nada: lo recibe cuando cambia de parte. Si los relojitos dependieran
   * de ese valor, al que mira se le quedarían parados entre parte y parte
   * mientras el que habla se alarga — justo cuando importa.
   */
  const runVivo = useMemo(() => {
    if (!run) return null;

    if (run.finishedAt) return run;

    return {
      ...run,
      drift: runDrift({
        part: parts[run.index],
        partStartedAt: run.partStartedAt,
        now,
      }),
    };
  }, [run, parts, now]);

  useEffect(() => {
    setView(
      runVivo ? buildMeetingRunView({ run: runVivo, parts, formatTime }) : null
    );
  }, [runVivo, parts, formatTime, setView]);

  // Al salir de la página los relojitos vuelven a ser relojitos.
  useEffect(() => {
    return () => {
      setView(null);
    };
  }, [setView]);

  /**
   * Empezar a seguir la reunión.
   *
   * Tres casos, y el de en medio es el normal:
   *
   * - Unos minutos ANTES de la hora: la primera parte no empieza al pulsar,
   *   empieza a su hora. Adelantarse a darle al botón mientras se prepara la
   *   sala no puede leerse como que la reunión va adelantada.
   * - A la hora o algo tarde: cuenta desde ya, y ese retraso ES retraso.
   * - Lejos de la hora: entonces no se está en la reunión —se está probando, o
   *   retomándola horas después—, así que el programa empieza cuando se pulsa.
   *   Las horas de las partes se corren a donde van a pasar de verdad, pero no
   *   se anuncia un retraso de dos horas que no es de nadie.
   */
  const empezar = useCallback(() => {
    if (soloLectura) return;

    const ahora = Date.now();
    const prevista = timeToMinutes(pgmStart);
    const diferencia = Number.isFinite(prevista)
      ? minutesOfDay(ahora) - prevista
      : 0;

    const cerca = Math.abs(diferencia) <= ANCLA_MINUTOS;
    const adelanto = cerca && diferencia < 0 ? -diferencia : 0;

    const arranque = ahora + Math.round(adelanto * 60000);

    const drift = runDrift({
      part: parts[0],
      partStartedAt: arranque,
      now: ahora,
    });

    guardar({
      weekOf: week,
      dataView,
      startedAt: arranque,
      partStartedAt: arranque,
      index: 0,
      // La reunión empieza con la canción: ahí no hay nada que presentar.
      runningAt: arranque,
      songSeconds: duracionCancionInicial,
      actual: {},
      drift,
      offset: cerca ? 0 : drift,
    });
  }, [
    soloLectura,
    guardar,
    week,
    dataView,
    parts,
    pgmStart,
    duracionCancionInicial,
  ]);

  const siguiente = useCallback(() => {
    if (soloLectura || !run || run.finishedAt) return;

    const ahora = Date.now();
    const actual = { ...run.actual };
    const encurso = parts[run.index];

    if (encurso) {
      // Desde que arrancó la parte, no desde que se empezó a presentar: la
      // presentación y los consejos no son tiempo del hermano.
      const desde = run.runningAt ?? run.partStartedAt;

      actual[encurso.key] = Math.round((ahora - desde) / 1000);
    }

    const proximo = run.index + 1;

    if (proximo >= parts.length) {
      guardar({ ...run, actual, finishedAt: ahora });
      return;
    }

    guardar({
      ...run,
      actual,
      index: proximo,
      partStartedAt: ahora,
      // Se pasa a PRESENTARLA: el cronómetro no arranca hasta «Empezar», que es
      // cuando el hermano toma la palabra. Una canción o una oración no se
      // presentan, así que esas arrancan solas.
      runningAt: parts[proximo].presented ? undefined : ahora,
      drift: runDrift({
        part: parts[proximo],
        partStartedAt: ahora,
        now: ahora,
      }),
    });
  }, [soloLectura, run, parts, guardar]);

  /**
   * La canción se pasa sola a la oración.
   *
   * Es el único paso del programa cuya duración se sabe de antemano —jw.org la
   * publica—, así que es el único donde pasar solo no es adivinar. En cualquier
   * otro sería peor que no hacer nada: cambiaría de parte mientras el hermano
   * sigue hablando.
   */
  useEffect(() => {
    if (soloLectura || !run || run.finishedAt || !run.runningAt) return;

    const parte = parts[run.index];

    if (!parte?.autoAdvance) return;

    if (now - run.runningAt < parte.seconds * 1000) return;

    siguiente();
  }, [now, run, parts, soloLectura, siguiente]);

  /**
   * Deshacer.
   *
   * Se pulsa «Siguiente» de pie y con el móvil en la mano: pulsarlo de más va a
   * pasar. Volver atrás devuelve también el reloj de la parte anterior a donde
   * estaba, restándole lo que se había apuntado que duró; si no, se volvería a
   * ella con el cronómetro a cero y el desfase se falsearía.
   */
  const atras = useCallback(() => {
    if (soloLectura || !run) return;

    if (run.finishedAt) {
      guardar({ ...run, finishedAt: undefined });
      return;
    }

    if (run.index === 0) return;

    const anterior = parts[run.index - 1];
    const actual = { ...run.actual };
    const duraba = actual[anterior.key] ?? 0;

    delete actual[anterior.key];

    const partStartedAt = run.partStartedAt - duraba * 1000;

    guardar({
      ...run,
      actual,
      index: run.index - 1,
      partStartedAt,
      runningAt: partStartedAt,
      drift: runDrift({ part: anterior, partStartedAt, now: Date.now() }),
    });
  }, [soloLectura, run, parts, guardar]);

  /**
   * Poner a cero el reloj de la parte que está sonando.
   *
   * Es para cuando el botón se pulsa antes de tiempo —el hermano todavía está
   * subiendo a la plataforma— o cuando se pulsa tarde. Sin esto habría que
   * volver atrás y avanzar otra vez, que además falsea lo que duró la anterior.
   */
  const reiniciar = useCallback(() => {
    if (soloLectura || !run || run.finishedAt) return;

    const ahora = Date.now();

    guardar({
      ...run,
      partStartedAt: ahora,
      runningAt: ahora,
      drift: runDrift({
        part: parts[run.index],
        partStartedAt: ahora,
        now: ahora,
      }),
    });
  }, [soloLectura, run, parts, guardar]);

  /**
   * El hermano toma la palabra: arranca el cronómetro de la parte.
   *
   * Lo que ha pasado desde que se pulsó «Siguiente» era la presentación, y no
   * se le apunta a nadie. Sí cuenta para el desfase de la reunión, porque el
   * hueco del programa la incluye.
   */
  const empezarParte = useCallback(() => {
    if (soloLectura || !run || run.finishedAt) return;

    guardar({ ...run, runningAt: Date.now() });
  }, [soloLectura, run, guardar]);

  /**
   * Apuntar algo de una parte.
   *
   * Se guarda por clave de parte, no por persona: la misma persona puede tener
   * dos partes la misma semana y no son el mismo comentario. Una nota vacía
   * borra la que hubiera, que es lo que espera cualquiera que borre el texto y
   * le dé a guardar.
   */
  const anotar = useCallback(
    (partKey: string, texto: string) => {
      if (soloLectura || !run) return;

      const notes = { ...(run.notes ?? {}) };
      const limpio = texto.trim();

      if (limpio.length === 0) {
        delete notes[partKey];
      } else {
        notes[partKey] = limpio;
      }

      guardar({ ...run, notes });
    },
    [soloLectura, run, guardar]
  );

  /**
   * Tomar el control de una reunión que lleva otro.
   *
   * Hace falta de verdad: si al que la lleva se le queda el móvil sin batería a
   * mitad de reunión, sin esto nadie más puede seguirla y se queda congelada
   * para toda la congregación. Se conserva todo lo que llevaba —en qué parte
   * va, lo que duró cada una— y solo cambia de manos.
   *
   * Las notas del anterior NO se heredan aunque estuvieran compartidas: son
   * suyas, y quien toma el control empieza las suyas.
   */
  const tomarControl = useCallback(() => {
    if (!ajeno) return;

    guardar({ ...soloLoDeLaReunion(ajeno), notes: {} });
  }, [ajeno, guardar]);

  /**
   * Apuntar desde el programa, donde se ve el relojito y no el paso.
   *
   * Un hueco partido —la canción y la oración— tiene dos pasos y un solo
   * recuadro, que enseña las dos notas juntas. Al editarlo desde ahí se guarda
   * lo que se ve en el primer paso y se quita del otro: lo que se lee es lo que
   * se edita, sin duplicados escondidos.
   */
  const anotarPorRelojito = useCallback(
    (badgeKey: string, texto: string) => {
      if (soloLectura || !run) return;

      const pasos = parts.filter((part) => part.badgeKey === badgeKey);

      if (pasos.length === 0) return;

      const notes = { ...(run.notes ?? {}) };

      for (const paso of pasos) delete notes[paso.key];

      const limpio = texto.trim();

      if (limpio.length > 0) notes[pasos[0].key] = limpio;

      guardar({ ...run, notes });
    },
    [soloLectura, run, parts, guardar]
  );

  const descartar = useCallback(() => {
    if (soloLectura) return;

    guardar(null);
  }, [soloLectura, guardar]);

  /**
   * Cuándo se ofrece empezar: en la semana en curso, y punto.
   *
   * Sin condición de hora. Antes había una y dejaba fuera lo más obvio: mirar
   * cómo funciona esto un rato antes, o el día después. `empezar` ya se encarga
   * de que arrancarlo lejos de la hora no anuncie un retraso inventado.
   */
  /**
   * Si quien mira es el presidente de esta semana.
   *
   * Solo cambia el texto del botón: para él es «Empezar presidencia», que es lo
   * que va a hacer; para el resto de ancianos es «Seguir la reunión», que es
   * mirar. No da ni quita permisos — cualquier anciano puede llevarla, porque
   * puede presidir alguien que no estaba en el programa.
   */
  const esPresidente = useMemo(() => {
    if (!schedule || !userUID) return false;

    const asignado = schedulesGetData(
      schedule,
      ASSIGNMENT_PATH.MM_Chairman_A,
      dataView
    ) as AssignmentCongregation;

    return asignado?.value === userUID;
  }, [schedule, dataView, userUID]);

  const enHorario = useMemo(() => {
    return formatDate(getWeekDate(), 'yyyy/MM/dd') === week;
  }, [week]);

  const parteActual = run ? parts[run.index] : undefined;

  /** La parte todavía no ha arrancado: quien preside la está presentando. */
  const presentando = !!run && !run.finishedAt && !run.runningAt;

  const transcurrido = run
    ? Math.max(
        0,
        Math.floor((now - (run.runningAt ?? run.partStartedAt)) / 1000)
      )
    : 0;

  // Se pulsó antes de la hora: la primera parte está anclada al futuro y el
  // reloj todavía no corre.
  const esperando = !!run && !run.finishedAt && run.partStartedAt > now;

  const restante = parteActual ? parteActual.seconds - transcurrido : 0;

  return {
    /**
     * Hay programa que seguir. Un publicador solo llega aquí si otro está
     * llevando la reunión, y entonces lo único que ve son los relojitos del
     * programa: la barra la monta `MeetingRunBar`, que exige ser anciano.
     */
    disponible: (isElder || soloLectura) && parts.length >= 3,
    enHorario,
    esPresidente,
    /** La lleva otro: se ve, no se toca. */
    soloLectura,
    esAnciano: isElder,
    quienLaLleva: ajeno?.ownerName ?? '',
    run: runVivo,
    parts,
    info,
    parteActual,
    siguienteParte: run ? parts[run.index + 1] : undefined,
    transcurrido,
    restante,
    esperando,
    presentando,
    horaInicio: formatTime(pgmStart),
    desfase: runVivo ? runDesfase(runVivo) : 0,
    empezar,
    siguiente,
    atras,
    reiniciar,
    empezarParte,
    tomarControl,
    anotar,
    anotarPorRelojito,
    descartar,
    formatTime,
  };
};

export default useMidweekRun;
