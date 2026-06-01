import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { Box } from '@mui/material';
import {
  IconCheckCircle,
  IconClock,
  IconInTerritory,
  IconCongregation,
  IconPodium,
  IconStats,
  IconSettings,
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
} from '@states/settings';
import { appLangState } from '@states/app';
import useDashboard from './useDashboard';
import useSharedHook from './useSharedHook';
import Snackbar from '@components/snackbar';
import { LANGUAGE_LIST, WEEK_TYPE_NO_MEETING } from '@constants/index';
import PageTitle from '@components/page_title';
import { getWeekDate, formatDate } from '@utils/date';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { schedulesState } from '@states/schedules';
import { Week } from '@definition/week_type';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const appLang = useAtomValue(appLangState);
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);

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

  // Live countdown to next meeting
  const [countdownText, setCountdownText] = useState(t('tr_loading', 'cargando…'));

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();

      const getNextOccurrence = (weekday: number, timeStr: string) => {
        const [hrs, mins] = timeStr.split(':').map(Number);
        const target = new Date();
        target.setHours(hrs, mins, 0, 0);

        const jsWeekday = weekday === 7 ? 0 : weekday;
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

      const targetMeeting = nextMidweek.getTime() < nextWeekend.getTime() ? nextMidweek : nextWeekend;

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
        setCountdownText(t('tr_countdownDays', `Faltan ${d} d ${h} h`, { days: d, hours: h }));
      } else if (h > 0) {
        setCountdownText(t('tr_countdownHours', `Faltan ${h} h ${m} min`, { hours: h, minutes: m }));
      } else {
        setCountdownText(t('tr_countdownMinutes', `Faltan ${m} min`, { minutes: m }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [midweekMeetingWeekday, midweekMeetingTime, weekendMeetingWeekday, weekendMeetingTime, t]);

  // Dynamic day/month values for the meeting bubbles of "this week"
  const monday = useMemo(() => {
    return getWeekDate(new Date());
  }, []);

  const weekOf = useMemo(() => {
    return formatDate(monday, 'yyyy/MM/dd');
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

  const showMidweekRow = showMidweek && !isMidweekSuspended;
  const showWeekendRow = showWeekend && !isWeekendSuspended;

  const midweekMeetingDate = useMemo(() => {
    const info = schedulesGetMeetingDate({ week: weekOf, meeting: 'midweek' });
    if (info && info.date) {
      const parts = info.date.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    // Fallback to default calculation if schedule or date not found
    const midweekDay = midweekMeetingWeekday === 7 ? 0 : midweekMeetingWeekday;
    const midweekDiff = midweekDay === 0 ? 6 : midweekDay - 1;
    const d = new Date(monday);
    d.setDate(monday.getDate() + midweekDiff);
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
    const weekendDay = weekendMeetingWeekday === 7 ? 0 : weekendMeetingWeekday;
    const weekendDiff = weekendDay === 0 ? 6 : weekendDay - 1;
    const d = new Date(monday);
    d.setDate(monday.getDate() + weekendDiff);
    return d;
  }, [weekOf, monday, weekendMeetingWeekday]);

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

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  const handleMidweekClick = () => {
    localStorage.setItem('organized_weekly_schedules', 'midweek');
    navigate('/weekly-schedules');
  };

  const handleWeekendClick = () => {
    localStorage.setItem('organized_weekly_schedules', 'weekend');
    navigate('/weekly-schedules');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle />

      {/* GREETING */}
      <div className="hello-greeting">
        <h1>
          {t('tr_greeting', { firstName: firstName || 'Carlos' })} <span className="waving-hand">👋</span>
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

            {!showMidweekRow && !showWeekendRow ? (
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
                {showMidweekRow && (
                  <div className="meeting-row active-press" onClick={handleMidweekClick}>
                    <div className="day-badge mid">
                      <span className="d">{midweekDayNum}</span>
                      <span className="m">{midweekMonthStr}</span>
                    </div>
                    <div className="meeting-info">
                      <div className="nm">{t('tr_midweekMeeting', 'Reunión de entre semana')}</div>
                      {midweekDescription && <div className="sub">{midweekDescription}</div>}
                    </div>
                    <div className="meeting-time">{midweekMeetingTime}</div>
                  </div>
                )}

                {showWeekendRow && (
                  <div className="meeting-row active-press" onClick={handleWeekendClick}>
                    <div className="day-badge wknd">
                      <span className="d">{weekendDayNum}</span>
                      <span className="m">{weekendMonthStr}</span>
                    </div>
                    <div className="meeting-info">
                      <div className="nm">{t('tr_weekendMeeting', 'Reunión de fin de semana')}</div>
                      {weekendDescription && <div className="sub">{weekendDescription}</div>}
                    </div>
                    <div className="meeting-time">{weekendMeetingTime}</div>
                  </div>
                )}
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
            <IconClock color="var(--brand)" width={22} height={22} />
          </div>
          <div>
            <div className="tile-name">{t('tr_meetings', 'Reuniones')}</div>
            <div className="tile-meta">Programas y partes</div>
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
              <div className="tile-meta">Salidas y horario</div>
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
            <div className="tile-meta">Personas y grupos</div>
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
              <div className="tile-meta">Oradores y temas</div>
            </div>
          </div>
        )}

        {/* 5. INFORMES (Full width, visible for elders, secretaries, attendance/group overseers) */}
        {(isElder || isAttendanceEditor || isGroupOverseer || isSecretary) && (
          <div className="tile-item c-slate full-width active-press" style={{ animationDelay: '0.42s' }} onClick={() => handleTileClick('/dashboard/reports')}>
            <div className="ti">
              <IconStats color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_reports', 'Informes')}</div>
              <div className="tile-meta">Asistencia, predicación, sucursal</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* 6. CONFIGURACIÓN (Full width, always visible) */}
        <div className="tile-item c-slate full-width active-press" style={{ animationDelay: '0.46s' }} onClick={() => handleTileClick('/dashboard/settings')}>
          <div className="ti">
            <IconSettings color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_settings', 'Configuración')}</div>
            <div className="tile-meta">Ajustes de congregación y cuenta</div>
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
          messageHeader={t('tr_welcomeCongregationTitle')}
          message={t('tr_welcomeCongregationDesc')}
          onClose={handleCloseNewCongNotice}
        />
      )}

    </Box>
  );
};

export default Dashboard;

