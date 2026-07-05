import { useEffect, useState, useMemo, cloneElement, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { Box } from '@mui/material';
import {
  IconCheckCircle,
  IconInTerritory,
  IconCongregation,
  IconPodium,
  IconStats,
  IconSettings,
  IconTreasuresPart,
} from '@icons/index';
import {
  useAppTranslation,
  useCurrentUser,
} from '@hooks/index';
import {
  midweekMeetingWeekdayState,
  midweekMeetingTimeState,
  weekendMeetingWeekdayState,
  weekendMeetingTimeState,
  userDataViewState,
  userLocalUIDState,
  shortDateFormatState,
} from '@states/settings';
import { appLangState } from '@states/app';
import useDashboard from './useDashboard';
import useSharedHook from './useSharedHook';
import Snackbar from '@components/snackbar';
import {
  LANGUAGE_LIST,
  WEEK_TYPE_NO_MEETING,
  UPCOMING_EVENT_ASSEMBLY_CATEGORIES,
  UPCOMING_EVENT_MEMORIAL_CATEGORIES,
} from '@constants/index';
import PageTitle from '@components/page_title';
import { getWeekDate, formatDate, getDatesBetweenDates } from '@utils/date';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { schedulesState, assignmentsHistoryState } from '@states/schedules';
import { deptScheduleState } from '@states/departments_schedule';
import { resolveAssignmentDate } from '@utils/assignments';
import { Week } from '@definition/week_type';
import { upcomingEventsActiveState } from '@states/upcoming_events';
import { upcomingEventData } from '@services/app/upcoming_events';
import { decorationsForEvent } from '@features/activities/upcoming_events/decorations_for_event';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
  UpcomingEventType,
} from '@definition/upcoming_events';

const matchesDataView = (record: UpcomingEventType, dataView: string) => {
  if (dataView === 'main') return record.event_data.type === 'main';
  return record.event_data.type === 'main' || record.event_data.type === dataView;
};

// Mientras dura una asamblea/congreso (cualquier día del evento cae dentro
// de esta semana de lunes a domingo), NO hay ni reunión de entre semana ni
// de fin de semana — sin necesitar que alguien además marque a mano el
// week_type de esa semana en el editor.
const isWeekSuppressedByAssembly = (
  events: UpcomingEventType[],
  dataView: string,
  weekStart: Date,
  weekEnd: Date
) => {
  return events.some((record) => {
    if (!UPCOMING_EVENT_ASSEMBLY_CATEGORIES.includes(record.event_data.category)) {
      return false;
    }
    if (!matchesDataView(record, dataView)) return false;

    const eventStart = new Date(record.event_data.start);
    const eventEnd = new Date(record.event_data.end);

    return eventStart <= weekEnd && eventEnd >= weekStart;
  });
};

// La Conmemoración solo cancela la reunión concreta cuyo día coincide con
// su fecha (entre semana O fin de semana, no ambas).
const isMeetingDaySuppressedByMemorial = (
  events: UpcomingEventType[],
  dataView: string,
  meetingDate: Date
) => {
  const meetingDateStr = formatDate(meetingDate, 'yyyy/MM/dd');

  return events.some((record) => {
    if (!UPCOMING_EVENT_MEMORIAL_CATEGORIES.includes(record.event_data.category)) {
      return false;
    }
    if (!matchesDataView(record, dataView)) return false;

    const startStr = formatDate(new Date(record.event_data.start), 'yyyy/MM/dd');
    const endStr = formatDate(new Date(record.event_data.end), 'yyyy/MM/dd');

    return meetingDateStr >= startStr && meetingDateStr <= endStr;
  });
};

const DASHBOARD_DEPT_LABELS: Record<string, string> = {
  acomodadores: 'Acomodadores',
  microfonos: 'Micrófonos',
  multimedia: 'Multimedia',
  plataforma: 'Plataforma',
};

// Mismas etiquetas de rol que ya usa DepartmentsMeeting (weekly_schedules),
// para que "Tienes: X" en el dashboard diga también el rol concreto (ej.
// "Multimedia (Audio)"), no solo el departamento.
const DASHBOARD_DEPT_ROLE_LABELS: Record<string, Record<string, string>> = {
  acomodadores: { exterior: 'Exterior', interior: 'Interior' },
  microfonos: { micro1: 'Micro 1', micro2: 'Micro 2' },
  multimedia: { video: 'Vídeo', audio: 'Audio' },
  plataforma: { encargado: 'Encargado' },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const appLang = useAtomValue(appLangState);
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const upcomingEvents = useAtomValue(upcomingEventsActiveState);
  const userUID = useAtomValue(userLocalUIDState);
  const shortDateFormat = useAtomValue(shortDateFormatState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const deptSchedules = useAtomValue(deptScheduleState);

  // App settings atoms
  const midweekMeetingWeekday = useAtomValue(midweekMeetingWeekdayState);
  const midweekMeetingTime = useAtomValue(midweekMeetingTimeState);
  const weekendMeetingWeekday = useAtomValue(weekendMeetingWeekdayState);
  const weekendMeetingTime = useAtomValue(weekendMeetingTimeState);

  const {
    isPublisher,
    isElder,
    isAttendanceEditor,
    isGroupOverseer,
    isWeekendEditor,
    isPublicTalkCoordinator,
    isSecretary,
  } = useCurrentUser();

  const { showMidweek, showWeekend, showMeetingCard } = useSharedHook();

  const {
    firstName,
    handleOpenMyAssignments,
    countFutureAssignments,
    handleCloseNewCongNotice,
    newCongSnack,
  } = useDashboard();

  const todayStr = useMemo(() => {
    // Find the current language item from LANGUAGE_LIST based on appLang code
    const langItem = LANGUAGE_LIST.find(
      (lang) => lang.code === appLang || lang.threeLettersCode === appLang
    );
    const locale = langItem ? langItem.locale : 'es-ES';
    const dateStr = new Date().toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).toLowerCase();
    
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, [appLang]);

  // Dynamic day/month values for the meeting bubbles of "this week"
  const monday = useMemo(() => {
    return getWeekDate(new Date());
  }, []);

  const weekOf = useMemo(() => {
    return formatDate(monday, 'yyyy/MM/dd');
  }, [monday]);

  // Delimit the week (Monday to Sunday)
  const startOfWeek = useMemo(() => {
    const d = new Date(monday);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [monday]);

  const endOfWeek = useMemo(() => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [monday]);

  const currentWeekSchedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === weekOf);
  }, [schedules, weekOf]);

  const midweekWeekType = useMemo(() => {
    if (!currentWeekSchedule) return Week.NORMAL;
    return currentWeekSchedule.midweek_meeting.week_type.find(
      (record) => record.type === dataView
    )?.value ?? Week.NORMAL;
  }, [currentWeekSchedule, dataView]);

  const weekendWeekType = useMemo(() => {
    if (!currentWeekSchedule) return Week.NORMAL;
    return currentWeekSchedule.weekend_meeting.week_type.find(
      (record) => record.type === dataView
    )?.value ?? Week.NORMAL;
  }, [currentWeekSchedule, dataView]);

  const isMidweekSuspended = useMemo(() => {
    return WEEK_TYPE_NO_MEETING.includes(midweekWeekType);
  }, [midweekWeekType]);

  const isWeekendSuspended = useMemo(() => {
    return WEEK_TYPE_NO_MEETING.includes(weekendWeekType);
  }, [weekendWeekType]);

  const midweekMeetingDate = useMemo(() => {
    const info = schedulesGetMeetingDate({ week: weekOf, meeting: 'midweek' });
    if (info && info.date) {
      const parts = info.date.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    // Fallback to default calculation if schedule or date not found
    const d = new Date(monday);
    d.setDate(monday.getDate() + midweekMeetingWeekday);
    return d;
  }, [weekOf, monday, midweekMeetingWeekday]);

  const weekendMeetingDate = useMemo(() => {
    const info = schedulesGetMeetingDate({ week: weekOf, meeting: 'weekend' });
    if (info && info.date) {
      const parts = info.date.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    // Fallback to default calculation if schedule or date not found
    const d = new Date(monday);
    d.setDate(monday.getDate() + weekendMeetingWeekday);
    return d;
  }, [weekOf, monday, weekendMeetingWeekday]);

  const isWeekSuppressedByAssemblyEvent = useMemo(
    () => isWeekSuppressedByAssembly(upcomingEvents, dataView, startOfWeek, endOfWeek),
    [upcomingEvents, dataView, startOfWeek, endOfWeek]
  );

  const isMidweekSuppressedByMemorial = useMemo(
    () => isMeetingDaySuppressedByMemorial(upcomingEvents, dataView, midweekMeetingDate),
    [upcomingEvents, dataView, midweekMeetingDate]
  );

  const isWeekendSuppressedByMemorial = useMemo(
    () => isMeetingDaySuppressedByMemorial(upcomingEvents, dataView, weekendMeetingDate),
    [upcomingEvents, dataView, weekendMeetingDate]
  );

  const showMidweekRow =
    showMidweek &&
    !isMidweekSuspended &&
    !isWeekSuppressedByAssemblyEvent &&
    !isMidweekSuppressedByMemorial;
  const showWeekendRow =
    showWeekend &&
    !isWeekendSuspended &&
    !isWeekSuppressedByAssemblyEvent &&
    !isWeekendSuppressedByMemorial;

  const midweekDayNum = midweekMeetingDate.getDate();
  const midweekMonthStr = useMemo(() => {
    const langItem = LANGUAGE_LIST.find(
      (lang) => lang.code === appLang || lang.threeLettersCode === appLang
    );
    const locale = langItem ? langItem.locale : 'es-ES';
    return midweekMeetingDate.toLocaleDateString(locale, { month: 'short' }).slice(0, 3).toLowerCase();
  }, [midweekMeetingDate, appLang]);

  const weekendDayNum = weekendMeetingDate.getDate();
  const weekendMonthStr = useMemo(() => {
    const langItem = LANGUAGE_LIST.find(
      (lang) => lang.code === appLang || lang.threeLettersCode === appLang
    );
    const locale = langItem ? langItem.locale : 'es-ES';
    return weekendMeetingDate.toLocaleDateString(locale, { month: 'short' }).slice(0, 3).toLowerCase();
  }, [weekendMeetingDate, appLang]);

  const midweekDescription = useMemo(() => {
    if (midweekWeekType === Week.CO_VISIT) {
      return t('tr_coVisit', 'Visita del superintendente de circuito');
    }
    return '';
  }, [midweekWeekType, t]);

  const weekendDescription = useMemo(() => {
    if (weekendWeekType === Week.CO_VISIT) {
      return t('tr_coVisit', 'Visita del superintendente de circuito');
    }
    return '';
  }, [weekendWeekType, t]);

  // Qué tiene la persona en la reunión de esta semana (si tiene algo) — solo
  // partes de la reunión y roles de departamento, que son lo que de verdad
  // ocurre DURANTE la reunión. Salidas de predicación/exhibidores/limpieza no
  // cuentan aquí aunque caigan el mismo día, porque no son "la reunión" en sí.
  const midweekMeetingDateStr = useMemo(
    () => formatDate(midweekMeetingDate, 'yyyy/MM/dd'),
    [midweekMeetingDate]
  );
  const weekendMeetingDateStr = useMemo(
    () => formatDate(weekendMeetingDate, 'yyyy/MM/dd'),
    [weekendMeetingDate]
  );

  const { midweekAssignmentTitles, weekendAssignmentTitles } = useMemo(() => {
    const midweekTitles: string[] = [];
    const weekendTitles: string[] = [];

    if (userUID) {
      for (const record of assignmentsHistory) {
        if (record.assignment.person !== userUID) continue;
        const resolved = resolveAssignmentDate(record, shortDateFormat);
        if (resolved.weekOf === midweekMeetingDateStr) {
          midweekTitles.push(record.assignment.title);
        } else if (resolved.weekOf === weekendMeetingDateStr) {
          weekendTitles.push(record.assignment.title);
        }
      }

      // Los roles de departamento se guardan una vez por semana (no por
      // reunión), y sirven en ambas reuniones de esa semana.
      const deptWeek = deptSchedules.find((w) => w?.weekOf === weekOf);
      if (deptWeek) {
        const depts = ['acomodadores', 'microfonos', 'multimedia', 'plataforma'] as const;
        for (const dept of depts) {
          const deptData = deptWeek[dept] as Record<string, { value: string }> | undefined;
          if (!deptData) continue;
          const matchedRole = Object.entries(deptData).find(
            ([, role]) => role?.value === userUID
          )?.[0];
          if (!matchedRole) continue;
          const roleLabel = DASHBOARD_DEPT_ROLE_LABELS[dept]?.[matchedRole];
          const label = roleLabel
            ? `${DASHBOARD_DEPT_LABELS[dept]} (${roleLabel})`
            : DASHBOARD_DEPT_LABELS[dept];
          if (showMidweekRow) midweekTitles.push(label);
          if (showWeekendRow) weekendTitles.push(label);
        }
      }
    }

    return { midweekAssignmentTitles: midweekTitles, weekendAssignmentTitles: weekendTitles };
  }, [
    assignmentsHistory,
    userUID,
    shortDateFormat,
    midweekMeetingDateStr,
    weekendMeetingDateStr,
    deptSchedules,
    weekOf,
    showMidweekRow,
    showWeekendRow,
  ]);

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  const handleMidweekClick = useCallback(() => {
    localStorage.setItem('organized_weekly_schedules', 'midweek');
    navigate('/weekly-schedules');
  }, [navigate]);

  const handleWeekendClick = useCallback(() => {
    localStorage.setItem('organized_weekly_schedules', 'weekend');
    navigate('/weekly-schedules');
  }, [navigate]);

  const locale = useMemo(() => {
    const langItem = LANGUAGE_LIST.find(
      (lang) => lang.code === appLang || lang.threeLettersCode === appLang
    );
    return langItem ? langItem.locale : 'es-ES';
  }, [appLang]);

  // Filter events belonging to this week
  const thisWeekEvents = useMemo(() => {
    return upcomingEvents
      .filter((record) => {
        // La semana de la visita del CO ya se indica en las propias filas
        // de reunión (midweekDescription/weekendDescription) — mostrar
        // además el evento de 6 días completo aquí sería redundante.
        // Las reuniones con precursores y con ancianos/SM sí se quedan,
        // son informativas por sí solas.
        if (record.event_data.category === UpcomingEventCategory.CircuitOverseerWeek) {
          return false;
        }

        // filter by type / dataView
        if (dataView === 'main') {
          if (record.event_data.type !== 'main') return false;
        } else {
          if (record.event_data.type !== 'main' && record.event_data.type !== dataView) return false;
        }

        // filter by week overlap
        const eventStart = new Date(record.event_data.start);
        const eventEnd = new Date(record.event_data.end);
        return eventStart <= endOfWeek && eventEnd >= startOfWeek;
      })
      .map((record) => {
        // Parse event details
        const details = upcomingEventData(record);
        const eventDateObj = new Date(record.event_data.start);
        const eventDayNum = eventDateObj.getDate();
        const eventMonthStr = eventDateObj
          .toLocaleDateString(locale, { month: 'short' })
          .slice(0, 3)
          .toLowerCase();

        const eventDecoration =
          record.event_data.category !== undefined &&
          record.event_data.category !== null &&
          record.event_data.category < decorationsForEvent.length
            ? decorationsForEvent[record.event_data.category]
            : decorationsForEvent[decorationsForEvent.length - 1];

        const eventTitle =
          record.event_data.category !== UpcomingEventCategory.Custom
            ? t(eventDecoration.translationKey)
            : record.event_data.custom;

        const isMultiDay = record.event_data.duration === UpcomingEventDuration.MultipleDays;

        // Línea informativa breve: para eventos de varios días, cuántos
        // días abarca (ej. "3 días"), más el Tema si se puso — así una
        // asamblea regional se entiende de un vistazo sin abrir la página
        // de "Próximos eventos".
        const eventDaysLabel = isMultiDay
          ? t('tr_days', {
              daysCount: getDatesBetweenDates(
                record.event_data.start,
                record.event_data.end
              ).length,
            })
          : '';

        const description = [
          eventDaysLabel,
          record.event_data.topic,
          record.event_data.description,
        ]
          .filter(Boolean)
          .join(' · ');

        return {
          id: record.event_uid,
          type: 'event' as const,
          date: eventDateObj,
          endDate: new Date(record.event_data.end),
          dayNum: eventDayNum,
          monthStr: eventMonthStr,
          title: eventTitle,
          description,
          time: isMultiDay ? '' : details.time,
          decoration: eventDecoration,
        };
      });
  }, [upcomingEvents, dataView, startOfWeek, endOfWeek, locale, t]);

  // Combina una fecha (solo día) con una hora "HH:MM" para saber si ese
  // momento ya pasó — así la fila se puede atenuar en vez de desaparecer.
  const isDateTimePast = (date: Date, time: string, now: Date) => {
    const [hrs, mins] = time.split(':').map(Number);
    const target = new Date(date);
    if (!Number.isNaN(hrs) && !Number.isNaN(mins)) target.setHours(hrs, mins, 0, 0);
    else target.setHours(23, 59, 59, 999);
    return target.getTime() < now.getTime();
  };

  const agendaItems = useMemo(() => {
    const items = [];
    const now = new Date();

    if (showMidweekRow) {
      const midweekAssignmentText =
        midweekAssignmentTitles.length > 0
          ? `${t('tr_youHave', 'Tienes')}: ${midweekAssignmentTitles.join(', ')}`
          : '';
      items.push({
        id: 'midweek',
        type: 'midweek' as const,
        date: midweekMeetingDate,
        dayNum: midweekDayNum,
        monthStr: midweekMonthStr,
        title: t('tr_midweekMeeting', 'Reunión de entre semana'),
        description: [midweekDescription, midweekAssignmentText].filter(Boolean).join(' · '),
        hasAssignment: midweekAssignmentTitles.length > 0,
        time: midweekMeetingTime,
        isPast: isDateTimePast(midweekMeetingDate, midweekMeetingTime, now),
        onClick: handleMidweekClick,
      });
    }

    if (showWeekendRow) {
      const weekendAssignmentText =
        weekendAssignmentTitles.length > 0
          ? `${t('tr_youHave', 'Tienes')}: ${weekendAssignmentTitles.join(', ')}`
          : '';
      items.push({
        id: 'weekend',
        type: 'weekend' as const,
        date: weekendMeetingDate,
        dayNum: weekendDayNum,
        monthStr: weekendMonthStr,
        title: t('tr_weekendMeeting', 'Reunión de fin de semana'),
        description: [weekendDescription, weekendAssignmentText].filter(Boolean).join(' · '),
        hasAssignment: weekendAssignmentTitles.length > 0,
        time: weekendMeetingTime,
        isPast: isDateTimePast(weekendMeetingDate, weekendMeetingTime, now),
        onClick: handleWeekendClick,
      });
    }

    for (const ev of thisWeekEvents) {
      items.push({
        id: ev.id,
        type: 'event' as const,
        date: ev.date,
        dayNum: ev.dayNum,
        monthStr: ev.monthStr,
        title: ev.title,
        description: ev.description,
        hasAssignment: false,
        time: ev.time,
        // Multi-day event (sin hora) — se atenúa cuando ya pasó su ÚLTIMO
        // día, no el primero, para no atenuar un evento que sigue en curso.
        isPast: ev.time
          ? isDateTimePast(ev.date, ev.time, now)
          : ev.endDate.getTime() < now.getTime(),
        decoration: ev.decoration,
        onClick: () => navigate('/activities/upcoming-events'),
      });
    }

    // Sort ascending by date
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [
    showMidweekRow,
    midweekMeetingDate,
    midweekDayNum,
    midweekMonthStr,
    midweekDescription,
    midweekAssignmentTitles,
    midweekMeetingTime,
    showWeekendRow,
    weekendMeetingDate,
    weekendDayNum,
    weekendMonthStr,
    weekendDescription,
    weekendAssignmentTitles,
    weekendMeetingTime,
    thisWeekEvents,
    handleMidweekClick,
    handleWeekendClick,
    t,
    navigate,
  ]);

  // Live countdown to next meeting
  const [countdownText, setCountdownText] = useState(t('tr_loading', 'cargando…'));

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();

      if (!showMidweekRow && !showWeekendRow) {
        setCountdownText(t('tr_noMeetingsThisWeek', 'Sin reuniones esta semana'));
        return;
      }

      // Determine candidates that are in the future
      const candidates: Date[] = [];

      if (showMidweekRow) {
        const [midHrs, midMins] = midweekMeetingTime.split(':').map(Number);
        const midTarget = new Date(midweekMeetingDate);
        midTarget.setHours(midHrs, midMins, 0, 0);
        if (midTarget.getTime() > now.getTime()) {
          candidates.push(midTarget);
        }
      }

      if (showWeekendRow) {
        const [wkndHrs, wkndMins] = weekendMeetingTime.split(':').map(Number);
        const wkndTarget = new Date(weekendMeetingDate);
        wkndTarget.setHours(wkndHrs, wkndMins, 0, 0);
        if (wkndTarget.getTime() > now.getTime()) {
          candidates.push(wkndTarget);
        }
      }

      let targetMeeting: Date | null = null;

      if (candidates.length > 0) {
        // Sort candidates ascending and pick the earliest future one
        candidates.sort((a, b) => a.getTime() - b.getTime());
        targetMeeting = candidates[0];
      } else {
        // Fallback to the standard next-occurrence calculation if both this week's meetings are in the past
        const getNextOccurrence = (weekday: number, timeStr: string) => {
          const [hrs, mins] = timeStr.split(':').map(Number);
          const target = new Date();
          target.setHours(hrs, mins, 0, 0);

          const jsWeekday = (weekday + 1) % 7;
          const currentDay = now.getDay();

          let daysDiff = jsWeekday - currentDay;
          if (daysDiff < 0 || (daysDiff === 0 && now.getTime() >= target.getTime())) {
            daysDiff += 7;
          }

          const res = new Date(now);
          res.setDate(now.getDate() + daysDiff);
          res.setHours(hrs, mins, 0, 0);
          return res;
        };

        const nextMidweek = getNextOccurrence(midweekMeetingWeekday, midweekMeetingTime);
        const nextWeekend = getNextOccurrence(weekendMeetingWeekday, weekendMeetingTime);

        targetMeeting = nextMidweek.getTime() < nextWeekend.getTime() ? nextMidweek : nextWeekend;
      }

      const diffMs = targetMeeting.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdownText(t('tr_inProgress', 'En curso'));
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const d = Math.floor(diffSecs / 86400);
      const h = Math.floor((diffSecs % 86400) / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);

      if (d > 0) {
        setCountdownText(t('tr_countdownDays', { defaultValue: `Faltan ${d} d ${h} h`, days: d, hours: h }));
      } else if (h > 0) {
        setCountdownText(t('tr_countdownHours', { defaultValue: `Faltan ${h} h ${m} min`, hours: h, minutes: m }));
      } else {
        setCountdownText(t('tr_countdownMinutes', { defaultValue: `Faltan ${m} min`, minutes: m }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [
    midweekMeetingWeekday,
    midweekMeetingTime,
    weekendMeetingWeekday,
    weekendMeetingTime,
    midweekMeetingDate,
    weekendMeetingDate,
    showMidweekRow,
    showWeekendRow,
    t
  ]);

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle />

      {/* GREETING */}
      <div className="hello-greeting">
        <h1>
          {t('tr_greeting', { defaultValue: 'Hola, {{firstName}}', firstName: firstName || 'Carlos' })} <span className="waving-hand">👋</span>
        </h1>
        <div className="date-string">{todayStr}</div>
      </div>

      {/* MY ASSIGNMENTS SHORTCUT */}
      <div className="assign-card active-press" onClick={handleOpenMyAssignments}>
        <div className="ic">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div className="txt">
          <div className="lab">{t('tr_myAssignments', 'Mis asignaciones')}</div>
          <div className="big">
            {countFutureAssignments === 0
              ? t('tr_noMeetingAssignments', 'No tienes asignaciones pendientes')
              : t('tr_pendingAssignments', 'Tienes asignaciones pendientes')
            }
          </div>
        </div>
        <div className="count-val">{countFutureAssignments}</div>
        <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      {/* PROGRAM SECTION */}
      {showMeetingCard && (
        <>
          <div className="section-label">
            <div className="t">{t('tr_thisWeek', 'Esta semana')}</div>
          </div>
          <div className="week-card">
            <div className="week-head-section">
              <div className="ttl">{t('tr_schedule', 'Programa')}</div>
              <div className="count-pill">
                <span className="pulse-indicator"></span>
                <span>{countdownText}</span>
              </div>
            </div>

            {agendaItems.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 16px',
                  textAlign: 'center',
                  background: 'rgba(59, 114, 196, 0.03)',
                  borderRadius: '16px',
                  margin: '12px',
                  border: '1px dashed rgba(59, 114, 196, 0.15)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    width: '42px',
                    height: '42px',
                    opacity: 0.6,
                    color: 'var(--brand)',
                    marginBottom: '12px',
                  }}
                >
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="m14 14-4 4M10 14l4 4" />
                </svg>
                <Box
                  sx={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  {t('tr_noMeetingsScheduled', 'No hay reuniones programadas')}
                </Box>
                <Box
                  sx={{
                    fontSize: '13px',
                    color: 'var(--slate-500)',
                    maxWidth: '300px',
                  }}
                >
                  {t('tr_noMeetingsScheduledDesc', 'Esta semana no hay reuniones debido a eventos especiales o asambleas.')}
                </Box>
              </Box>
            ) : (
              <>
                {agendaItems.map((item) => {
                  const isMidweek = item.type === 'midweek';
                  const isWeekend = item.type === 'weekend';
                  const isEvent = item.type === 'event';
                  
                  let badgeClass = 'day-badge';
                  if (isMidweek) badgeClass += ' mid';
                  if (isWeekend) badgeClass += ' wknd';
                  if (isEvent) badgeClass += ' ev';

                  return (
                    <div
                      key={item.id}
                      className={`meeting-row active-press${item.isPast ? ' past' : ''}`}
                      onClick={item.onClick}
                    >
                      <div className={badgeClass}>
                        <span className="d">{item.dayNum}</span>
                        <span className="m">{item.monthStr}</span>
                      </div>
                      <div className="meeting-info">
                        <div
                          className="nm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {isEvent && item.decoration && cloneElement(item.decoration.icon, {
                            color: 'var(--ink)',
                            style: { width: '16px', height: '16px', flexShrink: 0 }
                          })}
                          <span>{item.title}</span>
                          {item.hasAssignment && (
                            <span className="assignment-dot" title={t('tr_youHaveSomething', 'Tienes algo')} />
                          )}
                        </div>
                        {item.description && (
                          <div className="sub">{item.description}</div>
                        )}
                      </div>
                      {item.time && (
                        <div className="meeting-time">{item.time}</div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            <button className="week-cta-btn active-press" onClick={() => handleTileClick('/weekly-schedules')}>
              {t('tr_viewAssignmentsSchedule', 'Ver programa completo')}
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* EXPLORE MENU GRID */}
      <div className="section-label">
        <div className="t">{t('tr_explore', 'Explorar')}</div>
      </div>
      <div className="tile-grid">

        {/* 1. REUNIONES (Always visible) */}
        <div className="tile-item c-blue active-press" style={{ animationDelay: '0.26s' }} onClick={() => handleTileClick('/dashboard/meetings')}>
          <div className="ti">
            <IconTreasuresPart color="var(--brand)" width={22} height={22} />
          </div>
          <div>
            <div className="tile-name">{t('tr_meetings', 'Reuniones')}</div>
          </div>
        </div>

        {/* 2. PREDICACIÓN (Visible if publisher) */}
        {isPublisher && (
          <div className="tile-item c-blue active-press" style={{ animationDelay: '0.3s' }} onClick={() => handleTileClick('/dashboard/ministry')}>
            <div className="ti">
              <IconInTerritory color="var(--brand)" width={22} height={22} />
            </div>
            <div>
              <div className="tile-name">{t('tr_ministry', 'Predicación')}</div>
            </div>
          </div>
        )}

        {/* 3. CONGREGACIÓN (Always visible) */}
        <div className="tile-item c-blue active-press" style={{ animationDelay: '0.34s' }} onClick={() => handleTileClick('/dashboard/congregation')}>
          <div className="ti">
            <IconCongregation color="var(--brand)" width={22} height={22} />
          </div>
          <div>
            <div className="tile-name">{t('tr_congregation', 'Congregación')}</div>
          </div>
        </div>

        {/* 4. DISCURSOS (Visible if weekend meeting is shown and authorized) */}
        {showWeekend && (isElder || isWeekendEditor || isPublicTalkCoordinator) && (
          <div className="tile-item c-blue active-press" style={{ animationDelay: '0.38s' }} onClick={() => handleTileClick('/dashboard/talks')}>
            <div className="ti">
              <IconPodium color="var(--brand)" width={22} height={22} />
            </div>
            <div>
              <div className="tile-name">{t('tr_publicTalks', 'Discursos')}</div>
            </div>
          </div>
        )}

        {/* 5. INFORMES (Full width, visible for elders, secretaries, attendance/group overseers) */}
        {(isElder || isAttendanceEditor || isGroupOverseer || isSecretary) && (
          <div className="tile-item c-blue full-width active-press" style={{ animationDelay: '0.42s' }} onClick={() => handleTileClick('/dashboard/reports')}>
            <div className="ti">
              <IconStats color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_reports', 'Informes')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* 6. CONFIGURACIÓN (Full width, always visible) */}
        <div className="tile-item c-blue full-width active-press" style={{ animationDelay: '0.46s' }} onClick={() => handleTileClick('/dashboard/settings')}>
          <div className="ti">
            <IconSettings color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_settings', 'Configuración')}</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

      </div>

      {/* SNACKBARS / NOTICES */}
      {newCongSnack && (
        <Snackbar
          open={newCongSnack}
          variant="success"
          messageIcon={<IconCheckCircle color="var(--always-white)" />}
          messageHeader={t('tr_welcomeCongregationTitle', '¡Te damos la bienvenida!')}
          message={t('tr_welcomeCongregationDesc', 'Te has conectado con éxito a tu congregación. Ahora puedes empezar a usar Elda Centro.')}
          onClose={handleCloseNewCongNotice}
        />
      )}

    </Box>
  );
};

export default Dashboard;

