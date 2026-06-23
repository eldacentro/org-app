import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import { MeetingType } from '@definition/app';
import { SourcesFormattedType } from '@definition/sources';
import { sourcesFormattedState, sourcesValidState } from '@states/sources';
import { useBreakpoints } from '@hooks/index';
import { selectedWeekState } from '@states/schedules';
import { convertStringToBoolean } from '@utils/common';
import {
  addMonths,
  addWeeks,
  formatDate,
  getWeekDate,
} from '@utils/date';
import { JWLangState, meetingExactDateState } from '@states/settings';
import MonthsContainer from './months_container';
import { schedulesGetMeetingDate } from '@services/app/schedules';

const useWeekSelector = () => {
  const location = useLocation();

  const { desktopUp } = useBreakpoints();

  const resetSelectedWeek = useResetAtom(selectedWeekState);

  const sourcesValid = useAtomValue(sourcesValidState);
  const sourcesFormattedByWeek = useAtomValue(sourcesFormattedState);
  const selectedWeek = useAtomValue(selectedWeekState);
  const meetingExactDate = useAtomValue(meetingExactDateState);
  const lang = useAtomValue(JWLangState);

  const [expanded, setExpanded] = useState(true);
  const [openDelete, setOpenDelete] = useState(false);
  const [sortDown, setSortDown] = useState(
    convertStringToBoolean(localStorage.getItem('meeting_sort_down'))
  );
  const [activeTab, setActiveTab] = useState(0);

  const meeting: MeetingType = useMemo(() => {
    return location.pathname === '/midweek-meeting' ? 'midweek' : 'weekend';
  }, [location.pathname]);

  const currentYear = useMemo(() => {
    if (selectedWeek.length === 0) return;

    const mtd = schedulesGetMeetingDate({
      week: selectedWeek,
      meeting,
    });

    const date = mtd.date;
    return date.split('/')[0];
  }, [selectedWeek, meeting]);

  const weeksWithoutMemorial = useMemo(() => {
    const weeksExact = sourcesFormattedByWeek.reduce<SourcesFormattedType[]>(
      (acc, curr) => {
        const currentClone = structuredClone(curr);

        for (const month of currentClone.months) {
          let anyMemorialWeek: string;

          if (meeting === 'midweek') {
            anyMemorialWeek = month.weeks.find((week) =>
              sourcesValid.find(
                (s) =>
                  s.weekOf === week &&
                  !s.midweek_meeting.weekly_bible_reading[lang]
              )
            );
          }

          if (meeting === 'weekend') {
            anyMemorialWeek = month.weeks.find((week) =>
              sourcesValid.find(
                (s) => s.weekOf === week && !s.weekend_meeting.w_study[lang]
              )
            );
          }

          if (anyMemorialWeek) {
            month.weeks = month.weeks.filter(
              (week) => week !== anyMemorialWeek
            );
          }
        }

        acc.push(currentClone);

        return acc;
      },
      []
    );

    const weeks = sourcesValid.filter((record) => {
      if (meeting === 'midweek') {
        const anyMemorialWeek =
          !record.midweek_meeting.weekly_bible_reading[lang];

        if (anyMemorialWeek) {
          return false;
        }
      }

      if (meeting === 'weekend') {
        const anyMemorialWeek = !record.weekend_meeting.w_study[lang];

        if (anyMemorialWeek) {
          return false;
        }
      }

      return true;
    });

    return { weeksExact, weeks };
  }, [meeting, lang, sourcesFormattedByWeek, sourcesValid]);

  // El discursante y el discurso público se programan con mucha antelación
  // (a veces de un año para otro), bastante antes de que JW.org publique el
  // material de esa semana. Antes, esta lista solo incluía semanas que YA
  // tenían ese material (sourcesValid), así que no se podía ni seleccionar
  // una semana futura para dejar puesto el discurso. Por eso, solo para fin
  // de semana, se genera la lista de semanas directamente por fecha — hasta
  // el 31 de diciembre del año que viene — en vez de depender de qué
  // `source` ya llegó. Cuando el material sí llegue después (vía sync de
  // JW.org o import de .epub), se completa solo encima sin tocar lo que ya
  // se haya asignado (son tablas independientes).
  const weeksWithFuture = useMemo(() => {
    if (meeting !== 'weekend') return weeksWithoutMemorial.weeks;

    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');
    const horizon = new Date(new Date().getFullYear() + 1, 11, 31);

    const generated: string[] = [];
    let cursor = getWeekDate(addMonths(new Date(), -2));

    while (cursor <= horizon) {
      const weekOf = formatDate(cursor, 'yyyy/MM/dd');

      if (weekOf >= minDate) {
        generated.push(weekOf);
      }

      cursor = addWeeks(cursor, 1);
    }

    const horizonStr = formatDate(horizon, 'yyyy/MM/dd');
    const extraSources = weeksWithoutMemorial.weeks
      .filter((record) => record.weekOf > horizonStr)
      .map((record) => record.weekOf);

    const allWeekOfs = new Set([...generated, ...extraSources]);

    return [...allWeekOfs].sort().map((weekOf) => ({ weekOf }));
  }, [meeting, weeksWithoutMemorial]);

  const sources = useMemo(() => {
    if (meeting === 'midweek' && !meetingExactDate) {
      return weeksWithoutMemorial.weeksExact;
    }

    const groupedData = weeksWithFuture.reduce<
      SourcesFormattedType[]
    >((acc, curr) => {
      const mtd = schedulesGetMeetingDate({
        week: curr.weekOf,
        meeting,
      });

      const date = mtd.date;
      const year = +date.split('/')[0];
      const month = date.substring(0, 7);

      // Initialize year object if not already present
      const findYear = acc.find((record) => record.value === year);
      if (!findYear) {
        acc.push({ value: year, months: [] });
      }

      // Initialize month array if not already present
      const yearRecord = acc.find((record) => record.value === year);
      const findMonth = yearRecord.months.find(
        (record) => record.value === month
      );
      if (!findMonth) {
        yearRecord.months.push({ value: month, weeks: [] });
      }

      // Add current week to the appropriate month array
      const monthRecord = yearRecord.months.find(
        (record) => record.value === month
      );

      monthRecord.weeks.push(curr.weekOf);

      return acc;
    }, []);

    for (const year in groupedData) {
      groupedData[year].months.sort((a, b) => b.value.localeCompare(a.value));
    }

    return groupedData;
  }, [meeting, meetingExactDate, weeksWithoutMemorial, weeksWithFuture]);

  const tabs = useMemo(() => {
    return sources.toReversed().map((year) => ({
      label: year.value.toString(),
      Component: <MonthsContainer months={year.months} reverse={sortDown} />,
    }));
  }, [sources, sortDown]);

  const hasWeeks = useMemo(() => {
    return sources.length > 0;
  }, [sources]);

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const handleToggleSort = () => {
    setSortDown((prev) => {
      localStorage.setItem('meeting_sort_down', !prev ? 'true' : 'false');
      return !prev;
    });
  };

  const handleOpenDelete = () => setOpenDelete(true);

  const handleCloseDelete = () => setOpenDelete(false);

  useEffect(() => {
    if (!currentYear) return;

    const findIndex = tabs.findIndex((record) => record.label === currentYear);

    if (findIndex === -1) return;

    setActiveTab(findIndex);
  }, [tabs, currentYear]);

  useEffect(() => {
    if (!desktopUp && selectedWeek.length > 0) {
      setExpanded(false);
    }
  }, [selectedWeek, desktopUp]);

  useEffect(() => {
    return () => {
      resetSelectedWeek();
    };
  }, [resetSelectedWeek]);

  const selectedWeekDateLocale = useMemo(() => {
    if (!selectedWeek || selectedWeek.length === 0) return '';
    const meetingDate = schedulesGetMeetingDate({ week: selectedWeek, meeting });
    return meetingDate.locale;
  }, [selectedWeek, meeting]);

  return {
    tabs,
    hasWeeks,
    expanded,
    handleToggleExpand,
    activeTab,
    openDelete,
    handleCloseDelete,
    handleOpenDelete,
    meeting,
    sortDown,
    handleToggleSort,
    selectedWeek,
    selectedWeekDateLocale,
  };
};

export default useWeekSelector;
