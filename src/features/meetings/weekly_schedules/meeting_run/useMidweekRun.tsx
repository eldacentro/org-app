import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { formatDate, generateDateFromTime, getWeekDate } from '@utils/date';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import {
  hour24FormatState,
  JWLangState,
  settingsState,
} from '@states/settings';
import {
  schedulesMidweekData,
  schedulesMidweekGetTiming,
} from '@services/app/schedules';
import {
  buildMeetingRunView,
  buildMidweekRunParts,
  clearMeetingRun,
  DRIFT_ABANDONADA,
  minutesOfDay,
  readMeetingRun,
  runDrift,
  timeToMinutes,
  writeMeetingRun,
  type MeetingRunRecord,
} from '@services/app/meeting_run';
import { meetingRunViewState } from '@states/meeting_run';
import { buildRunPartsInfo } from './run_parts';

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
   * Las horas SIEMPRE en formato de 24, no las que se ven en pantalla.
   *
   * `useMidweekMeeting` convierte las suyas a 12 horas cuando la cuenta lo pide,
   * y con «8:11» no se puede restar: podrían ser las de la mañana. Aquí se pide
   * el cálculo aparte con la hora tal cual está guardada, y el formato bonito se
   * pone solo al final, al escribirlo.
   */
  const parts = useMemo(() => {
    // Para el resto de la congregación esto no existe, y el cálculo de horas y
    // de nombres no es gratis: se hace en cada pintado de la página.
    if (!isElder || !schedule || !source) return [];

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

      return buildMidweekRunParts(timing);
    } catch {
      return [];
    }
  }, [isElder, schedule, source, dataView, lang, pgmStart]);

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

  const [run, setRun] = useState<MeetingRunRecord | null>(null);

  // Al cambiar de semana o de grupo se recupera lo que hubiera guardado de esa
  // semana, no lo que se estuviera mirando antes.
  useEffect(() => {
    setRun(readMeetingRun(week, dataView));
  }, [week, dataView]);

  const guardar = useCallback(
    (next: MeetingRunRecord | null) => {
      setRun(next);

      if (next) {
        writeMeetingRun(next);
      } else {
        clearMeetingRun(week, dataView);
      }
    },
    [week, dataView]
  );

  const enMarcha = !!run && !run.finishedAt;

  const [now, setNow] = useState(() => Date.now());

  // Con la reunión en marcha hace falta el segundero. Parada, basta con mirar
  // de vez en cuando: es lo que abre y cierra sola la ventana de abajo cuando
  // llega la hora.
  useEffect(() => {
    if (!isElder) return;

    const id = setInterval(() => setNow(Date.now()), enMarcha ? 1000 : 20000);

    return () => clearInterval(id);
  }, [enMarcha, isElder]);

  /**
   * El desfase se guarda, no se calcula al vuelo en cada relojito.
   *
   * El cronómetro de la barra se refresca cada segundo, pero las horas de las
   * partes que quedan solo cambian cuando el desfase cambia de minuto. Guardarlo
   * aquí hace que el programa entero se vuelva a pintar como mucho una vez por
   * minuto en vez de sesenta.
   */
  useEffect(() => {
    if (!run || run.finishedAt) return;

    const drift = runDrift({
      part: parts[run.index],
      partStartedAt: run.partStartedAt,
      now,
    });

    // Se quedó abierta (o cambió la hora de la reunión por debajo). Se da por
    // terminada con el último desfase bueno en vez de enseñar un disparate.
    if (Math.abs(drift) > DRIFT_ABANDONADA) {
      guardar({ ...run, finishedAt: Date.now() });
      return;
    }

    if (drift !== run.drift) {
      guardar({ ...run, drift });
    }
  }, [now, run, parts, guardar]);

  useEffect(() => {
    setView(run ? buildMeetingRunView({ run, parts, formatTime }) : null);
  }, [run, parts, formatTime, setView]);

  // Al salir de la página los relojitos vuelven a ser relojitos.
  useEffect(() => {
    return () => {
      setView(null);
    };
  }, [setView]);

  /**
   * Empezar a seguir la reunión.
   *
   * Si se pulsa unos minutos ANTES de la hora, la primera parte no empieza al
   * pulsar: empieza a su hora. Si no, adelantarse a darle al botón se leería
   * como que la reunión va adelantada y correría hacia atrás las horas de todo
   * lo que queda.
   */
  const empezar = useCallback(() => {
    const ahora = Date.now();
    const prevista = timeToMinutes(pgmStart);
    const adelanto = Number.isFinite(prevista)
      ? Math.max(0, prevista - minutesOfDay(ahora))
      : 0;

    const arranque = ahora + Math.round(adelanto * 60000);

    guardar({
      weekOf: week,
      dataView,
      startedAt: arranque,
      partStartedAt: arranque,
      index: 0,
      actual: {},
      drift: runDrift({ part: parts[0], partStartedAt: arranque, now: ahora }),
    });
  }, [guardar, week, dataView, parts, pgmStart]);

  const siguiente = useCallback(() => {
    if (!run || run.finishedAt) return;

    const ahora = Date.now();
    const actual = { ...run.actual };
    const encurso = parts[run.index];

    if (encurso) {
      actual[encurso.key] = Math.round((ahora - run.partStartedAt) / 1000);
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
      drift: runDrift({
        part: parts[proximo],
        partStartedAt: ahora,
        now: ahora,
      }),
    });
  }, [run, parts, guardar]);

  /**
   * Deshacer.
   *
   * Se pulsa «Siguiente» de pie y con el móvil en la mano: pulsarlo de más va a
   * pasar. Volver atrás devuelve también el reloj de la parte anterior a donde
   * estaba, restándole lo que se había apuntado que duró; si no, se volvería a
   * ella con el cronómetro a cero y el desfase se falsearía.
   */
  const atras = useCallback(() => {
    if (!run) return;

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
      drift: runDrift({ part: anterior, partStartedAt, now: Date.now() }),
    });
  }, [run, parts, guardar]);

  /**
   * Poner a cero el reloj de la parte que está sonando.
   *
   * Es para cuando el botón se pulsa antes de tiempo —el hermano todavía está
   * subiendo a la plataforma— o cuando se pulsa tarde. Sin esto habría que
   * volver atrás y avanzar otra vez, que además falsea lo que duró la anterior.
   */
  const reiniciar = useCallback(() => {
    if (!run || run.finishedAt) return;

    const ahora = Date.now();

    guardar({
      ...run,
      partStartedAt: ahora,
      drift: runDrift({
        part: parts[run.index],
        partStartedAt: ahora,
        now: ahora,
      }),
    });
  }, [run, parts, guardar]);

  const descartar = useCallback(() => guardar(null), [guardar]);

  /**
   * Cuándo se ofrece empezar.
   *
   * En la semana en curso, y hasta tres horas después de la hora de la reunión.
   * Se para ahí porque arrancarlo a las once de la noche daría un desfase de
   * horas y correría el programa entero a un sitio absurdo.
   *
   * Antes de la hora sí se deja, y a propósito: `empezar` ancla la primera
   * parte a la hora prevista, así que darle al botón mientras se prepara la
   * sala no adelanta nada — la barra se queda esperando a que llegue la hora.
   */
  const enHorario = useMemo(() => {
    if (formatDate(getWeekDate(), 'yyyy/MM/dd') !== week) return false;

    const prevista = timeToMinutes(pgmStart);

    if (!Number.isFinite(prevista)) return false;

    return minutesOfDay(now) <= prevista + 180;
  }, [week, pgmStart, now]);

  const parteActual = run ? parts[run.index] : undefined;

  const transcurrido = run
    ? Math.max(0, Math.floor((now - run.partStartedAt) / 1000))
    : 0;

  // Se pulsó antes de la hora: la primera parte está anclada al futuro y el
  // reloj todavía no corre.
  const esperando = !!run && !run.finishedAt && run.partStartedAt > now;

  const restante = parteActual ? parteActual.minutes * 60 - transcurrido : 0;

  return {
    /** Hay programa que seguir y quien mira es anciano. */
    disponible: isElder && parts.length >= 3,
    enHorario,
    run,
    parts,
    info,
    parteActual,
    siguienteParte: run ? parts[run.index + 1] : undefined,
    transcurrido,
    restante,
    esperando,
    horaInicio: formatTime(pgmStart),
    empezar,
    siguiente,
    atras,
    reiniciar,
    descartar,
    formatTime,
  };
};

export default useMidweekRun;
