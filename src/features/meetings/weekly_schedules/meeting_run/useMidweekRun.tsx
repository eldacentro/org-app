import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { formatDate, generateDateFromTime } from '@utils/date';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import {
  congIDState,
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
  meetingRunDeviceId,
  publishMeetingRun,
  subscribeMeetingRun,
  type MeetingRunSubscription,
  type SharedMeetingRun,
} from '@services/firebase/meeting_run';
import {
  schedulesGetData,
  schedulesGetMeetingDate,
  schedulesMidweekData,
  schedulesMidweekGetTiming,
} from '@services/app/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import { AssignmentCongregation } from '@definition/schedules';
import { AssignmentCode } from '@definition/assignment';
import {
  ANCLA_MINUTOS,
  buildMeetingRunView,
  MARGEN_CANCION_SEGUNDOS,
  buildMidweekRunParts,
  clearMeetingRun,
  consejoPorParte,
  minutesOfDay,
  readMeetingRun,
  readRunNotes,
  runAbandonada,
  runDesfase,
  runDrift,
  timeToMinutes,
  writeMeetingRun,
  writeRunNotes,
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
 */
const soloLoDeLaReunion = (compartida: SharedMeetingRun): MeetingRunRecord => {
  const copia: Partial<SharedMeetingRun> = { ...compartida };

  delete copia.ownerUid;
  delete copia.ownerName;
  delete copia.ownerDevice;
  delete copia.epoch;
  delete copia.descartada;
  delete copia.updatedAt;
  delete copia.notes;

  return copia as MeetingRunRecord;
};

const SIN_SUSCRIPCION: MeetingRunSubscription = {
  run: null,
  cargado: false,
  error: false,
};

/**
 * Seguir la reunión de entre semana en directo.
 *
 * Quien preside pulsa una vez al terminar cada parte y la barra lleva la cuenta:
 * lo que le queda al que está hablando y cuántos minutos va tarde la reunión.
 *
 * DE DÓNDE SALE LA REUNIÓN: con cuenta conectada, del documento de Firestore y
 * de nada más —también para quien la lleva: Firestore enseña sus propias
 * escrituras al momento, también sin red—. Antes había tres copias (la del
 * teléfono, la de Firestore y una «adopción» entre las dos) con reglas
 * distintas, y al pasar el control se mezclaban. Sin cuenta, la copia del
 * propio teléfono.
 *
 * QUIÉN ESCRIBE: solo el teléfono que la lleva, y solo al pulsar algo (empezar,
 * siguiente, atrás…). Nada se escribe solo cada minuto: el retraso se calcula
 * en cada teléfono con la hora.
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
  const conectado = useAtomValue(congAccountConnectedState);
  const persons = useAtomValue(personsState);
  const displayName = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const setView = useSetAtom(meetingRunViewState);

  const deviceId = useMemo(() => meetingRunDeviceId(), []);

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
   * La reunión tal y como está en Firestore.
   *
   * Se escucha SIEMPRE que hay cuenta conectada, también siendo publicador: en
   * qué parte va la reunión es justo lo que quiere ver quien está sentado en el
   * salón. Lo que no se le enseña es la barra de mando ni las notas.
   */
  const [sub, setSub] = useState<MeetingRunSubscription>(SIN_SUSCRIPCION);

  useEffect(() => {
    setSub(SIN_SUSCRIPCION);

    if (!conectado || !congId || !week) return;

    return subscribeMeetingRun(congId, week, dataView, setSub);
  }, [conectado, congId, week, dataView]);

  /** Sin cuenta (o sin poder leer Firestore), la reunión vive en el teléfono. */
  const usaFirestore = conectado && !!congId && !sub.error;

  const [local, setLocal] = useState<MeetingRunRecord | null>(null);

  useEffect(() => {
    setLocal(readMeetingRun(week, dataView));
  }, [week, dataView]);

  const remoto = sub.run && !sub.run.descartada ? sub.run : null;

  const run: MeetingRunRecord | null = usaFirestore ? remoto : local;

  /** Ya se sabe si hay reunión: hasta entonces no se ofrece empezar ninguna. */
  const cargado = !usaFirestore || sub.cargado;

  /**
   * Si la lleva ESTE teléfono.
   *
   * Por teléfono y no por persona: la misma persona con el móvil y la tableta
   * eran dos «dueños» que se pisaban. Las reuniones de la versión anterior no
   * dicen qué teléfono las lleva; esas, por persona.
   */
  const soyDueno = useMemo(() => {
    if (!usaFirestore || !remoto) return true;

    if (remoto.ownerDevice) return remoto.ownerDevice === deviceId;

    return !!userUID && remoto.ownerUid === userUID;
  }, [usaFirestore, remoto, deviceId, userUID]);

  /** Puede pulsar: es anciano y la reunión es suya (o no hay ninguna). */
  const puedeLlevar = isElder && soyDueno;

  /** La lleva otro: se ve, no se toca. */
  const soloLectura = !!run && !soyDueno;

  /**
   * Lo que dura cada canción, según jw.org.
   *
   * Se refrescan solas cuando llevan más de un mes guardadas. Si no se pueden
   * traer, no pasa nada: el hueco de la canción y la oración se queda entero.
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

  const duracionDeCancion = useCallback(
    (numero: unknown) => {
      const n = Number(numero);

      if (!Number.isFinite(n) || n <= 0) return undefined;

      return duraciones?.seconds?.[n];
    },
    [duraciones]
  );

  const duracionCancionInicial = useMemo(
    () => duracionDeCancion(source?.midweek_meeting?.song_first?.[lang]),
    [source, lang, duracionDeCancion]
  );

  const duracionCancionMedia = useMemo(
    () => duracionDeCancion(source?.midweek_meeting?.song_middle?.[lang]),
    [source, lang, duracionDeCancion]
  );

  /**
   * Los pasos que montaría ESTE teléfono.
   *
   * Solo se usan para arrancar (y para reuniones de la versión anterior, que no
   * guardaban los suyos): una reunión en marcha lleva su propia lista, la del
   * teléfono que la arrancó, y es la que usan todos.
   *
   * Las horas SIEMPRE en formato de 24: con «8:11» no se puede restar.
   */
  const partesPropias = useMemo(() => {
    if ((!isElder && !run) || !schedule || !source) return [];

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

      const tipos = {
        ayf_part1: source.midweek_meeting.ayf_part1?.type?.[lang],
        ayf_part2: source.midweek_meeting.ayf_part2?.type?.[lang],
        ayf_part3: source.midweek_meeting.ayf_part3?.type?.[lang],
        ayf_part4: source.midweek_meeting.ayf_part4?.type?.[lang],
      };

      return buildMidweekRunParts(timing, {
        cancionInicialSegundos: run?.songSeconds ?? duracionCancionInicial,
        cancionMediaSegundos: run?.middleSongSeconds ?? duracionCancionMedia,
        consejoMinutos: consejoPorParte(tipos, AssignmentCode.MM_Discussion),
      });
    } catch {
      return [];
    }
  }, [
    isElder,
    run,
    duracionCancionInicial,
    duracionCancionMedia,
    schedule,
    source,
    dataView,
    lang,
    pgmStart,
  ]);

  const parts = run?.parts?.length ? run.parts : partesPropias;

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

  const nombrePropio = useMemo(() => {
    const persona = persons.find((record) => record.person_uid === userUID);

    if (!persona) return '';

    return personGetDisplayName(persona, displayName, fullnameOption);
  }, [persons, userUID, displayName, fullnameOption]);

  /**
   * Guardar.
   *
   * Con cuenta, en Firestore y en ningún sitio más (si no hay red, Firestore lo
   * guarda y lo manda al volver). `epoch` es el de la reunión que hay; quien
   * toma el control o arranca una nueva lo sube en uno.
   */
  const escribir = useCallback(
    (
      next: MeetingRunRecord,
      opciones?: { epoch?: number; descartada?: boolean }
    ) => {
      if (!usaFirestore) {
        setLocal(next);
        writeMeetingRun(next);
        return;
      }

      publishMeetingRun({
        congId,
        run: next,
        ownerUid: userUID,
        ownerName: nombrePropio,
        epoch: opciones?.epoch ?? sub.run?.epoch ?? 0,
        descartada: opciones?.descartada,
      }).catch((error) =>
        // Lo normal aquí es que otro haya tomado el control: la regla rechaza
        // la escritura y la pantalla pasa sola a la reunión que lleva él.
        console.error('No se pudo guardar la reunión en directo:', error)
      );
    },
    [usaFirestore, congId, userUID, nombrePropio, sub.run]
  );

  const [now, setNow] = useState(() => Date.now());

  /**
   * Que la reunión siga viva al mirarla: se dejó abierta y nadie la cerró.
   * Se da por terminada sin escribir nada (ver `runAbandonada`).
   */
  const runVivo = useMemo(() => {
    if (!run) return null;

    if (run.finishedAt) return run;

    if (runAbandonada(run, now)) return { ...run, finishedAt: run.partStartedAt };

    return {
      ...run,
      drift: runDrift({
        part: parts[run.index],
        partStartedAt: run.partStartedAt,
        now,
      }),
    };
  }, [run, parts, now]);

  const enMarcha = !!runVivo && !runVivo.finishedAt;

  /**
   * El segundero. Corre mientras hay reunión en marcha —la lleve uno mismo o la
   * lleve otro—, y despacio sin reunión, para que el botón salga solo al llegar
   * la hora.
   */
  useEffect(() => {
    if (!enMarcha) {
      if (!isElder) return;

      const lento = setInterval(() => setNow(Date.now()), 30000);

      return () => clearInterval(lento);
    }

    const id = setInterval(() => setNow(Date.now()), soloLectura ? 5000 : 1000);

    return () => clearInterval(id);
  }, [enMarcha, soloLectura, isElder]);

  /**
   * Si quien mira es el presidente de esta semana.
   *
   * Cambia el texto del botón y decide QUIÉN APUNTA: las notas son suyas y solo
   * suyas. Para llevar la reunión no hace falta serlo —puede llevarla otro
   * anciano si el presidente no tiene el móvil a mano—.
   */
  const presidenteAsignado = useMemo(() => {
    if (!schedule) return '';

    const asignado = schedulesGetData(
      schedule,
      ASSIGNMENT_PATH.MM_Chairman_A,
      dataView
    ) as AssignmentCongregation;

    return asignado?.value ?? '';
  }, [schedule, dataView]);

  const esPresidente = !!userUID && presidenteAsignado === userUID;

  /**
   * Quién puede apuntar y leer las notas: el presidente de ese día. Si el
   * programa no tiene presidente puesto, quien la lleva.
   */
  const puedeAnotar =
    isElder &&
    !!runVivo &&
    (esPresidente || (!presidenteAsignado && soyDueno));

  /** Las notas del presidente: solo en SU teléfono (ver `readRunNotes`). */
  const [notas, setNotas] = useState<Record<string, string>>({});

  useEffect(() => {
    setNotas(readRunNotes(week, dataView));
  }, [week, dataView]);

  const guardarNotas = useCallback(
    (siguientes: Record<string, string>) => {
      setNotas(siguientes);
      writeRunNotes(week, dataView, siguientes);
    },
    [week, dataView]
  );

  const notasVisibles = useMemo(
    () => (puedeAnotar ? notas : {}),
    [puedeAnotar, notas]
  );

  useEffect(() => {
    setView(
      runVivo
        ? buildMeetingRunView({ run: runVivo, parts, notas: notasVisibles })
        : null
    );
  }, [runVivo, parts, notasVisibles, setView]);

  // Al salir de la página los relojitos vuelven a ser relojitos.
  useEffect(() => {
    return () => {
      setView(null);
    };
  }, [setView]);

  /**
   * Empezar a seguir la reunión.
   *
   * - Unos minutos ANTES de la hora: la primera parte empieza a su hora.
   * - A la hora o algo tarde: cuenta desde ya, y ese retraso ES retraso.
   * - Lejos de la hora (probando, o retomándola horas después): el programa
   *   empieza cuando se pulsa, sin anunciar un retraso que no es de nadie.
   */
  const empezar = useCallback(() => {
    if (!puedeLlevar || !cargado || run) return;

    const pasos = partesPropias;

    if (pasos.length === 0) return;

    const ahora = Date.now();
    const prevista = timeToMinutes(pgmStart);
    const diferencia = Number.isFinite(prevista)
      ? minutesOfDay(ahora) - prevista
      : 0;

    const cerca = Math.abs(diferencia) <= ANCLA_MINUTOS;
    const adelanto = cerca && diferencia < 0 ? -diferencia : 0;

    const arranque = ahora + Math.round(adelanto * 60000);

    const drift = runDrift({
      part: pasos[0],
      partStartedAt: arranque,
      now: ahora,
    });

    escribir(
      {
        weekOf: week,
        dataView,
        startedAt: arranque,
        partStartedAt: arranque,
        index: 0,
        // La reunión empieza con la canción: ahí no hay nada que presentar.
        runningAt: arranque,
        songSeconds: duracionCancionInicial,
        middleSongSeconds: duracionCancionMedia,
        parts: pasos,
        actual: {},
        drift,
        offset: cerca ? 0 : drift,
      },
      // Si quedó una de antes (terminada o dejada), esta la sustituye.
      { epoch: sub.run ? (sub.run.epoch ?? 0) + 1 : 0 }
    );
  }, [
    puedeLlevar,
    cargado,
    run,
    partesPropias,
    escribir,
    week,
    dataView,
    pgmStart,
    duracionCancionInicial,
    duracionCancionMedia,
    sub.run,
  ]);

  const siguiente = useCallback(() => {
    if (!puedeLlevar || !run || run.finishedAt) return;

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
      escribir({ ...run, parts, actual, finishedAt: ahora });
      return;
    }

    escribir({
      ...run,
      parts,
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
  }, [puedeLlevar, run, parts, escribir]);

  /**
   * La canción se pasa sola al terminar: es el único paso cuya duración se sabe
   * de antemano. Solo en el teléfono que la lleva.
   */
  useEffect(() => {
    if (!puedeLlevar || !run || run.finishedAt || !run.runningAt) return;

    const parte = parts[run.index];

    if (!parte?.autoAdvance) return;

    if (
      now - run.runningAt <
      (parte.seconds + MARGEN_CANCION_SEGUNDOS) * 1000
    ) {
      return;
    }

    siguiente();
  }, [now, run, parts, puedeLlevar, siguiente]);

  /**
   * Deshacer. Volver atrás devuelve también el reloj de la parte anterior a
   * donde estaba, restándole lo que se había apuntado que duró.
   */
  const atras = useCallback(() => {
    if (!puedeLlevar || !run) return;

    if (run.finishedAt) {
      escribir({ ...run, finishedAt: undefined });
      return;
    }

    if (run.index === 0) return;

    const anterior = parts[run.index - 1];
    const actual = { ...run.actual };
    const duraba = actual[anterior.key] ?? 0;

    delete actual[anterior.key];

    const partStartedAt = run.partStartedAt - duraba * 1000;

    escribir({
      ...run,
      parts,
      actual,
      index: run.index - 1,
      partStartedAt,
      runningAt: partStartedAt,
      drift: runDrift({ part: anterior, partStartedAt, now: Date.now() }),
    });
  }, [puedeLlevar, run, parts, escribir]);

  /** Poner a cero el reloj de la parte que está sonando. */
  const reiniciar = useCallback(() => {
    if (!puedeLlevar || !run || run.finishedAt) return;

    const ahora = Date.now();

    escribir({
      ...run,
      parts,
      partStartedAt: ahora,
      runningAt: ahora,
      drift: runDrift({
        part: parts[run.index],
        partStartedAt: ahora,
        now: ahora,
      }),
    });
  }, [puedeLlevar, run, parts, escribir]);

  /**
   * El hermano toma la palabra: arranca el cronómetro de la parte. Lo de antes
   * era la presentación (y el consejo de la anterior), que no se le apunta a
   * nadie pero sí cuenta para el retraso de la reunión.
   */
  const empezarParte = useCallback(() => {
    if (!puedeLlevar || !run || run.finishedAt) return;

    escribir({ ...run, parts, runningAt: Date.now() });
  }, [puedeLlevar, run, parts, escribir]);

  /**
   * Tomar el control de una reunión que lleva otro.
   *
   * Hace falta de verdad: si al que la lleva se le queda el móvil sin batería, la
   * reunión se queda congelada para todos. Se conserva todo —en qué parte va, lo
   * que duró cada una, la lista de pasos— y solo cambia de manos. Al subir
   * `epoch`, el teléfono de antes ya no puede escribir encima.
   */
  const tomarControl = useCallback(() => {
    if (!isElder || !remoto || soyDueno) return;

    escribir(
      {
        ...soloLoDeLaReunion(remoto),
        parts: remoto.parts?.length ? remoto.parts : partesPropias,
      },
      { epoch: (remoto.epoch ?? 0) + 1 }
    );
  }, [isElder, remoto, soyDueno, escribir, partesPropias]);

  /**
   * Apuntar algo de una parte. Solo el presidente, y se queda en su teléfono.
   * Una nota vacía borra la que hubiera.
   */
  const anotar = useCallback(
    (partKey: string, texto: string) => {
      if (!puedeAnotar) return;

      const siguientes = { ...notas };
      const limpio = texto.trim();

      if (limpio.length === 0) {
        delete siguientes[partKey];
      } else {
        siguientes[partKey] = limpio;
      }

      guardarNotas(siguientes);
    },
    [puedeAnotar, notas, guardarNotas]
  );

  /**
   * Apuntar desde el programa, donde se ve el relojito y no el paso. Un hueco
   * partido —la canción y la oración— tiene dos pasos y un solo recuadro: se
   * guarda en el primero y se quita del otro.
   */
  const anotarPorRelojito = useCallback(
    (badgeKey: string, texto: string) => {
      if (!puedeAnotar) return;

      const pasos = parts.filter((part) => part.badgeKey === badgeKey);

      if (pasos.length === 0) return;

      const siguientes = { ...notas };

      for (const paso of pasos) delete siguientes[paso.key];

      const limpio = texto.trim();

      if (limpio.length > 0) siguientes[pasos[0].key] = limpio;

      guardarNotas(siguientes);
    },
    [puedeAnotar, parts, notas, guardarNotas]
  );

  /**
   * Dejar de seguirla. Con cuenta se MARCA como dejada en vez de borrarla: un
   * borrado no tiene `epoch`, y una escritura atrasada de otro teléfono la
   * habría vuelto a crear.
   */
  const descartar = useCallback(() => {
    if (!puedeLlevar || !run) return;

    if (!usaFirestore) {
      setLocal(null);
      clearMeetingRun(week, dataView);
      return;
    }

    escribir(run, { descartada: true });
  }, [puedeLlevar, run, usaFirestore, week, dataView, escribir]);

  /**
   * Cuándo se ofrece empezar: el día de la reunión, desde cinco minutos antes
   * hasta tres horas después.
   */
  const enHorario = useMemo(() => {
    const { date } = schedulesGetMeetingDate({
      week,
      meeting: 'midweek',
      dataView,
    });

    if (date !== formatDate(new Date(now), 'yyyy/MM/dd')) return false;

    const prevista = timeToMinutes(pgmStart);

    if (!Number.isFinite(prevista)) return false;

    const ahora = minutesOfDay(now);

    return ahora >= prevista - 5 && ahora <= prevista + 180;
  }, [week, dataView, pgmStart, now]);

  const parteActual = runVivo ? parts[runVivo.index] : undefined;

  /** La parte todavía no ha arrancado: quien preside la está presentando. */
  const presentando = !!runVivo && !runVivo.finishedAt && !runVivo.runningAt;

  const transcurrido = runVivo
    ? Math.max(
        0,
        Math.floor((now - (runVivo.runningAt ?? runVivo.partStartedAt)) / 1000)
      )
    : 0;

  // Se pulsó antes de la hora: la primera parte está anclada al futuro y el
  // reloj todavía no corre.
  const esperando =
    !!runVivo && !runVivo.finishedAt && runVivo.partStartedAt > now;

  const restante = parteActual ? parteActual.seconds - transcurrido : 0;

  return {
    /**
     * Hay programa que seguir. Un publicador solo llega aquí si otro está
     * llevando la reunión, y entonces lo único que ve son los relojitos del
     * programa: la barra la monta `MeetingRunBar`, que exige ser anciano.
     */
    disponible: (isElder || soloLectura) && parts.length >= 3,
    cargado,
    enHorario,
    esPresidente,
    /** La lleva otro: se ve, no se toca. */
    soloLectura,
    esAnciano: isElder,
    puedeAnotar,
    notas: notasVisibles,
    quienLaLleva: soloLectura ? (remoto?.ownerName ?? '') : '',
    run: runVivo,
    parts,
    info,
    parteActual,
    siguienteParte: runVivo ? parts[runVivo.index + 1] : undefined,
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
