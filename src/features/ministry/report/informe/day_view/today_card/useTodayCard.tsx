import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import { dayNamesShortState, monthNamesState } from '@states/app';
import {
  reportUserDraftState,
  reportUserSelectedMonthState,
  userFieldServiceDailyReportsState,
} from '@states/user_field_service_reports';
import { userFieldServiceDailyReportSchema } from '@services/dexie/schema';
import { personIsEnrollmentActive } from '@services/app/persons';
import { addDays, formatDate } from '@utils/date';

/**
 * Día "enfocado" de la tarjeta grande — empieza en hoy, se mueve con las
 * flechitas. Es el único editor activo de la vista Día (la lista de abajo
 * solo resume y, al tocar un día, mueve el foco aquí) — así nunca compiten
 * dos editores por el mismo borrador compartido (`reportUserDraftState`).
 */
const useTodayCard = () => {
  const { person } = useCurrentUser();
  const dayNamesShort = useAtomValue(dayNamesShortState);
  const monthNames = useAtomValue(monthNamesState);
  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);
  const setDraftReport = useSetAtom(reportUserDraftState);
  const setSelectedMonth = useSetAtom(reportUserSelectedMonthState);

  const todayStr = useMemo(() => formatDate(new Date(), 'yyyy/MM/dd'), []);
  const [focusedDateStr, setFocusedDateStr] = useState(todayStr);

  const focusedDate = useMemo(() => new Date(focusedDateStr), [focusedDateStr]);

  const primeDraft = (dateStr: string) => {
    const existing = dailyReports.find((r) => r.report_date === dateStr);

    const draft = existing
      ? structuredClone(existing)
      : (() => {
          const fresh = structuredClone(userFieldServiceDailyReportSchema);
          fresh.report_date = dateStr;
          return fresh;
        })();

    setDraftReport(draft);
  };

  const focusDate = (dateStr: string) => {
    setFocusedDateStr(dateStr);
    setSelectedMonth(dateStr.slice(0, 7));
    primeDraft(dateStr);
  };

  const handlePrevDay = () => {
    focusDate(formatDate(addDays(focusedDate, -1), 'yyyy/MM/dd'));
  };

  const handleNextDay = () => {
    focusDate(formatDate(addDays(focusedDate, 1), 'yyyy/MM/dd'));
  };

  // Prepara el borrador del día inicial (hoy) al montar.
  useEffect(() => {
    primeDraft(focusedDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existingReport = useMemo(() => {
    return dailyReports.find((r) => r.report_date === focusedDateStr);
  }, [dailyReports, focusedDateStr]);

  const hoursEnabled = useMemo(() => {
    if (!person) return false;

    const month = focusedDateStr.slice(0, 7);

    return (
      personIsEnrollmentActive(person, 'AP', month) ||
      personIsEnrollmentActive(person, 'FR', month) ||
      personIsEnrollmentActive(person, 'FMF', month) ||
      personIsEnrollmentActive(person, 'FS', month)
    );
  }, [person, focusedDateStr]);

  return {
    focusedDateStr,
    focusDate,
    weekday: dayNamesShort[focusedDate.getDay()],
    monthLabel: monthNames[focusedDate.getMonth()],
    dayNum: focusedDate.getDate(),
    isToday: focusedDateStr === todayStr,
    handlePrevDay,
    handleNextDay,
    hasExistingReport: Boolean(existingReport),
    hoursEnabled,
    summaryHours: existingReport?.report_data.hours.field_service || '0:00',
    summaryStudies: existingReport?.report_data.bible_studies.value || 0,
  };
};

export default useTodayCard;
