import { useState, useMemo, useEffect } from 'react';
import EmptyState from '@components/empty_state';
import { fmtRangoSemana, MESES_ES } from '@utils/nombres_fecha';
import {
  Box,
  CardContent,
  Divider,
  List,
  ListItem,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import { monthShortNamesState } from '@states/app';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import Typography from '@components/typography';
import MiniChip from '@components/mini_chip';
import CountBadge from '@components/count_badge';
import Dialog from '@components/dialog';
import Button from '@components/button';
import WeekRangeSelector from '@features/meetings/week_range_selector';
import { IconExpand, IconUp } from '@components/icons';
import {
  IconPrint,
  IconPublish,
  IconOutgoindSpeaker,
  IconSortDown,
  IconSortUp,
} from '@components/icons';
import PanelToolbar from '@components/panel_toolbar';
import Select from '@components/select';
import MenuItem from '@components/menuitem';
import { outgoingSpeakersState } from '@states/visiting_speakers';
import { schedulesState, selectedWeekState } from '@states/schedules';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { outgoingTalkDate } from '@services/app/meeting_month';
import { publicTalksState } from '@states/public_talks';
import {
  JWLangState,
  fullnameOptionState,
  JWLangLocaleState,
  displayNameMeetingsEnableState,
  userDataViewState,
} from '@states/settings';
import { headerForScheduleState } from '@states/field_service_groups';
import { buildPersonFullname } from '@utils/common';
import {
  scheduleOutgoingSpeakers,
  groupOutgoingSpeakersByDate,
} from '@services/app/schedules';
import { dbSchedBulkUpdate, dbSchedCheck } from '@services/dexie/schedules';
import {
  buildOutgoingMonthGaps,
  collectMeetingMonthAssignees,
  isMeetingMonthPublished,
  meetingMonthNeedsPublishing,
  setMeetingMonthPublished,
} from '@services/app/meetings_publish';
import { monthOfDate } from '@services/app/month_publish';
import { meetingDateOfWeek } from '@services/app/meeting_month';
import { personIsAwayOn } from '@services/app/persons';
import { personGetDisplayName } from '@utils/common';
import { personsByViewState } from '@states/persons';
import OutgoingPublishDialog from '@features/meetings/outgoing_talks/publish_dialog';
import MeetingPublishNotice from '@features/meetings/publish_notice';
import OutgoingTalkAccess from '@features/congregation/settings/congregation_privacy/outgoing_talk_access';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import TemplateOutgoingSpeakersSchedule from '@views/meetings/weekend/outgoing_speakers_schedule';
import { displaySnackNotification } from '@services/states/app';
import { useNavigate } from 'react-router';
import OutgoingTalksEditor from '@features/meetings/outgoing_talks';
import ScrollableTabs from '@components/scrollable_tabs';
import MonthRow from '@components/period_selector/MonthRow';
import WeekRow from '@components/period_selector/WeekRow';
import { nombreArchivo, rangoArchivo } from '@utils/nombre_pdf';

const OutgoingSpeakersPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { desktopUp } = useBreakpoints();

  const outgoingSpeakers = useAtomValue(outgoingSpeakersState);
  const schedules = useAtomValue(schedulesState);
  const publicTalks = useAtomValue(publicTalksState);
  const lang = useAtomValue(JWLangState);
  const monthShortNames = useAtomValue(monthShortNamesState);
  const sourceLang = useAtomValue(JWLangLocaleState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const congName = useAtomValue(headerForScheduleState);
  const dataView = useAtomValue(userDataViewState);
  const persons = useAtomValue(personsByViewState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const [selectedWeek, setSelectedWeek] = useAtom(selectedWeekState);

  // States
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'last_assignment'>(
    'alphabetical'
  );
  const [talksExpanded, setTalksExpanded] = useState<Record<string, boolean>>(
    {}
  );
  const [historyExpanded, setHistoryExpanded] = useState<
    Record<string, boolean>
  >({});
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!desktopUp && selectedWeek) {
      setExpanded(false);
    }
  }, [selectedWeek, desktopUp]);

  // States for PDF Export Dialog
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [accessDialog, setAccessDialog] = useState(false);
  const [startWeek, setStartWeek] = useState('');
  const [endWeek, setEndWeek] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Default selected week setup (defaults to the current week, with fallback to latest)
  useEffect(() => {
    if (!selectedWeek && schedules.length > 0) {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));

      const yyyy = monday.getFullYear();
      const mm = String(monday.getMonth() + 1).padStart(2, '0');
      const dd = String(monday.getDate()).padStart(2, '0');

      const currentWeekSlash = `${yyyy}/${mm}/${dd}`;
      const currentWeekDash = `${yyyy}-${mm}-${dd}`;

      // Check if we have a schedule for the current week
      const exactMatch = schedules.find(
        (record) =>
          record.weekOf === currentWeekSlash ||
          record.weekOf === currentWeekDash
      );

      if (exactMatch) {
        setSelectedWeek(exactMatch.weekOf);
      } else {
        setSelectedWeek(currentWeekSlash);
      }
    }
  }, [selectedWeek, schedules, setSelectedWeek]);

  // Toggle collapsibles
  const toggleTalks = (uid: string) => {
    setTalksExpanded((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const toggleHistory = (uid: string) => {
    setHistoryExpanded((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const nextYear = useMemo(() => currentYear + 1, [currentYear]);

  // Track if we are showing historical/prior years in the selector
  const [showHistorical, setShowHistorical] = useState(false);

  // Extract all unique years present in the schedules database
  const yearsWithSchedules = useMemo(() => {
    const years = new Set<number>();
    for (const schedule of schedules) {
      if (!schedule.weekOf || typeof schedule.weekOf !== 'string') continue;
      const normalised = schedule.weekOf.replace(/\//g, '-');
      const date = new Date(normalised + 'T12:00:00');
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    }
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [schedules]);

  // Determine prior/historical years (any year in IndexedDB strictly less than the current year)
  const priorYears = useMemo(() => {
    return yearsWithSchedules.filter((y) => y < currentYear);
  }, [yearsWithSchedules, currentYear]);

  // Build the selector tabs dynamically
  const yearTabs = useMemo(() => {
    if (!showHistorical) {
      const tabs = [
        { label: currentYear.toString() },
        { label: nextYear.toString() },
      ];
      if (priorYears.length > 0) {
        tabs.push({ label: 'Anteriores' });
      }
      return tabs;
    } else {
      const tabs = [{ label: '« Actuales' }];
      for (const y of priorYears) {
        tabs.push({ label: y.toString() });
      }
      return tabs;
    }
  }, [showHistorical, currentYear, nextYear, priorYears]);

  // Year state - always default to current year automatically on load
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Match the active tab index with the selectedYear
  const selectedTabIndex = useMemo(() => {
    const labels = yearTabs.map((t) => t.label);
    const index = labels.indexOf(selectedYear.toString());
    return index !== -1 ? index : 0;
  }, [yearTabs, selectedYear]);

  // Handle tab click changes cleanly
  const handleTabChange = (index: number) => {
    const selectedTab = yearTabs[index];
    if (!selectedTab) return;

    if (selectedTab.label === 'Anteriores') {
      setShowHistorical(true);
      if (priorYears.length > 0) {
        setSelectedYear(priorYears[0]);
      }
    } else if (selectedTab.label === '« Actuales') {
      setShowHistorical(false);
      setSelectedYear(currentYear);
    } else {
      const yearVal = parseInt(selectedTab.label, 10);
      if (!isNaN(yearVal)) {
        setSelectedYear(yearVal);
      }
    }
  };

  // Sync selected year/historical toggle when selecting a week externally
  useEffect(() => {
    if (selectedWeek) {
      const normalised = selectedWeek.replace(/\//g, '-');
      const date = new Date(normalised + 'T12:00:00');
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        setSelectedYear(year);
        if (year < currentYear) {
          setShowHistorical(true);
        } else {
          setShowHistorical(false);
        }
      }
    }
  }, [selectedWeek, currentYear]);

  // Month sort order state (newest first by default)
  const [monthSortOrder, setMonthSortOrder] = useState<'desc' | 'asc'>('desc');

  // Group schedules by month for the sidebar
  // Helper: generate all Mondays of a given year
  const allMondaysOfYear = useMemo(() => {
    const mondays: string[] = [];
    // Start from Jan 1 of selectedYear, find the first Monday
    const jan1 = new Date(selectedYear, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0=Sun, 1=Mon, ...
    const firstMonday = new Date(jan1);
    if (dayOfWeek === 0) {
      firstMonday.setDate(jan1.getDate() + 1);
    } else if (dayOfWeek === 1) {
      // already Monday
    } else {
      firstMonday.setDate(jan1.getDate() + (8 - dayOfWeek));
    }

    const current = new Date(firstMonday);
    while (current.getFullYear() === selectedYear) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      mondays.push(`${yyyy}/${mm}/${dd}`);
      current.setDate(current.getDate() + 7);
    }

    return mondays;
  }, [selectedYear]);

  const groupedWeeks = useMemo(() => {
    const groups: Array<{
      month: string;
      monthLabel: string;
      weeks: string[];
    }> = [];

    const mesesEs = [...MESES_ES];

    // Build a Set of existing schedule weekOf keys (normalised to YYYY/MM/DD)
    const existingWeeks = new Set<string>();
    for (const schedule of schedules) {
      if (!schedule.weekOf || typeof schedule.weekOf !== 'string') continue;
      // Normalise both formats to slash format for consistent comparison
      existingWeeks.add(schedule.weekOf.replace(/-/g, '/'));
    }

    // Use all Mondays of the year so every month is represented
    const allWeeks = [...allMondaysOfYear];

    // Also include any schedule weeks for this year that may not be Mondays
    // (edge cases from imported data)
    for (const schedule of schedules) {
      if (!schedule.weekOf || typeof schedule.weekOf !== 'string') continue;
      const normalised = schedule.weekOf.replace(/\//g, '-');
      const date = new Date(normalised + 'T12:00:00');
      if (isNaN(date.getTime())) continue;
      if (date.getFullYear() !== selectedYear) continue;
      const slashFormat = schedule.weekOf.replace(/-/g, '/');
      if (!allWeeks.includes(slashFormat)) {
        allWeeks.push(slashFormat);
      }
    }

    // Sort all weeks
    allWeeks.sort((a, b) => {
      return monthSortOrder === 'desc'
        ? b.localeCompare(a)
        : a.localeCompare(b);
    });

    for (const weekOf of allWeeks) {
      const normalised = weekOf.replace(/\//g, '-');
      const date = new Date(normalised + 'T12:00:00');
      if (isNaN(date.getTime())) continue;

      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const monthKey = `${year}/${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = `${mesesEs[monthIndex]}`;

      const existing = groups.find((g) => g.month === monthKey);
      if (existing) {
        if (!existing.weeks.includes(weekOf)) {
          existing.weeks.push(weekOf);
        }
      } else {
        groups.push({ month: monthKey, monthLabel, weeks: [weekOf] });
      }
    }

    // Sort the month groups themselves based on the chosen sort order
    groups.sort((a, b) => {
      return monthSortOrder === 'desc'
        ? b.month.localeCompare(a.month)
        : a.month.localeCompare(b.month);
    });

    return groups;
  }, [schedules, selectedYear, monthSortOrder, allMondaysOfYear]);

  // Determine which month to expand initially
  const defaultExpandedMonth = useMemo(() => {
    if (!selectedWeek) return '';
    const normalised = selectedWeek.replace(/\//g, '-');
    const date = new Date(normalised + 'T12:00:00');
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedWeek]);

  const [expandedMonth, setExpandedMonth] = useState('');

  useEffect(() => {
    if (defaultExpandedMonth && !expandedMonth) {
      setExpandedMonth(defaultExpandedMonth);
    }
  }, [defaultExpandedMonth, expandedMonth]);

  const handleToggleMonth = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? '' : month));
  };

  /**
   * Lo que se enseña en la BARRA plegada: "29 julio", el lunes de la semana.
   *
   * Decía "Semana: Semana del 29 de julio de 2026" — la barra ya pone
   * "Semana:" delante, así que la etiqueta larga repetía la palabra y no
   * cabía. Es el mismo `schedulesGetMeetingDate(...).locale` que usan el
   * selector de Reuniones y el de Departamentos, para que las tres barras se
   * lean igual.
   */
  const selectedWeekShortLabel = useMemo(() => {
    if (!selectedWeek) return '';

    return schedulesGetMeetingDate({ week: selectedWeek, meeting: 'weekOf' })
      .locale;
  }, [selectedWeek]);

  /**
   * La etiqueta LARGA, para la cabecera del panel de la derecha: ahí no hay
   * ningún "Semana:" delante, así que la frase entera sí es lo que toca.
   *
   * Decía "Semana del 29 de julio de 2026" —solo el lunes, y con el año— y el
   * resto de la app dice el rango: "Semana del 27 de julio al 2 de agosto". El
   * año no distingue nada en una lista de semanas del mismo año.
   */
  const selectedWeekLabel = useMemo(() => {
    if (!selectedWeek) return '';

    return fmtRangoSemana(selectedWeek.replace(/-/g, '/'));
  }, [selectedWeek]);

  /**
   * Publicar, de verdad.
   *
   * Aquí había un botón rotulado "Publicar" que solo forzaba una
   * sincronización — el mismo que ya se cambió en Exhibidores, Salidas y
   * Departamentos. Ahora publica el MES: hasta que se pulsa, las salidas son
   * un borrador que solo ve el coordinador. Guardar dispara el sincronizado,
   * así que lo de antes va incluido.
   */
  const selectedMonth = monthOfDate(selectedWeek ?? '');

  const monthIsPublished = isMeetingMonthPublished(
    schedules,
    selectedMonth,
    'outgoing',
    dataView
  );

  const monthIsHistoric = !meetingMonthNeedsPublishing(
    selectedMonth,
    'outgoing'
  );

  const monthGaps = useMemo(
    () => buildOutgoingMonthGaps(schedules, selectedMonth, dataView),
    [schedules, selectedMonth, dataView]
  );

  /** Oradores del mes con una ausencia apuntada en su fecha. */
  const monthAwayNames = useMemo(() => {
    const found: string[] = [];

    for (const assignee of collectMeetingMonthAssignees(
      schedules,
      selectedMonth,
      'outgoing',
      dataView
    )) {
      const person = persons.find(
        (record) => record.person_uid === assignee.uid
      );

      if (!person) continue;

      // Por el día de la REUNIÓN, no por el lunes de la semana: preguntar por
      // el lunes daba avisos falsos —una ausencia que acaba el martes cubre el
      // lunes pero no el día de la reunión—. Ver `meetingDateOfWeek`.
      //
      // Y en una salida el día no es el nuestro, es el de la congregación que
      // le recibe: viene ya calculado en `fecha`.
      const cuando =
        assignee.fecha || meetingDateOfWeek(assignee.weekOf, 'outgoing');

      if (!personIsAwayOn(person, cuando.replace(/\//g, '-'))) continue;

      const name =
        personGetDisplayName(person, displayNameEnabled, fullnameOption) ||
        assignee.name;

      if (name && !found.includes(name)) found.push(name);
    }

    return found;
  }, [
    schedules,
    selectedMonth,
    dataView,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  const handleTogglePublishMonth = async () => {
    if (monthIsHistoric) return;

    const toSave = setMeetingMonthPublished(
      schedules,
      selectedMonth,
      'outgoing',
      !monthIsPublished,
      dataView
    );

    // Sin semanas guardadas no hay nada que publicar.
    if (toSave.length === 0) {
      setPublishDialog(false);
      return;
    }

    await dbSchedBulkUpdate(toSave);
    setPublishDialog(false);

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: monthIsPublished
        ? 'Mes retirado: vuelve a ser un borrador.'
        : 'Mes publicado.',
      severity: 'success',
    });
  };

  // Compile assignments history for each outgoing speaker from weekend schedules
  const speakersAssignments = useMemo(() => {
    const history: Record<
      string,
      Array<{
        weekOf: string;
        date: Date;
        formattedDate: string;
        congregationName: string;
        talkNumber: number;
        talkTitle: string;
        songNumber: string;
      }>
    > = {};

    outgoingSpeakers.forEach((s) => {
      history[s.person_uid] = [];
    });

    schedules.forEach((schedule) => {
      const outgoingTalks =
        schedule.weekend_meeting?.outgoing_talks?.filter(
          (record) => !record._deleted
        ) || [];

      const weekDate = new Date(schedule.weekOf);

      outgoingTalks.forEach((record) => {
        const speakerUid = record.value;
        if (history[speakerUid]) {
          const publicTalk = publicTalks.find(
            (talk) => talk.talk_number === +record.public_talk
          );

          // El día en que salió a hablar es el de la congregación que le
          // recibe, no el nuestro. La cuenta que había aquí leía ese número en
          // una escala que no es la que guarda el editor (donde 0 es lunes),
          // así que a una congregación con la reunión el domingo le ponía el
          // sábado; y si la salida no tenía día apuntado todavía, la fecha
          // salía como «NaN de undefined de NaN».
          const fechaSalida = outgoingTalkDate(
            schedule.weekOf,
            record.congregation.weekday
          );

          // Sin día de la otra congregación nos quedamos con nuestro fin de
          // semana: es aproximado, pero la salida fue ese fin de semana y así
          // el historial sigue ordenándose bien.
          const recordDate = new Date(
            fechaSalida ||
              meetingDateOfWeek(schedule.weekOf, 'weekend') ||
              weekDate
          );

          // toLocaleDateString comparaba `lang` (código de idioma de
          // publicación JW, p.ej. 'S') contra 'es', que nunca coincide, así
          // que siempre caía a inglés. Se usa el mismo array manual de
          // meses en español que ya usa selectedWeekLabel en este archivo.
          const mesesEs = [...MESES_ES];
          const formattedDate = `${recordDate.getDate()} de ${mesesEs[recordDate.getMonth()]} de ${recordDate.getFullYear()}`;

          history[speakerUid].push({
            weekOf: schedule.weekOf,
            date: recordDate,
            formattedDate,
            congregationName: record.congregation.name,
            talkNumber: +record.public_talk,
            talkTitle: publicTalk?.talk_title?.[lang] ?? '',
            songNumber: record.opening_song,
          });
        }
      });
    });

    // Sort assignments descending (newest first)
    Object.keys(history).forEach((uid) => {
      history[uid].sort((a, b) => b.date.getTime() - a.date.getTime());
    });

    return history;
  }, [outgoingSpeakers, schedules, publicTalks, lang]);

  // Dynamic filter, search, and sort algorithm
  const filteredSpeakers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let data = outgoingSpeakers;

    if (q) {
      data = data.filter((speaker) => {
        const displayName = buildPersonFullname(
          speaker.speaker_data.person_lastname.value,
          speaker.speaker_data.person_firstname.value,
          fullnameOption
        ).toLowerCase();

        const preparedTalks = speaker.speaker_data.talks.filter(
          (t) => !t._deleted
        );
        const hasTalkMatch = preparedTalks.some((t) => {
          const numMatch = t.talk_number.toString().includes(q);
          const pt = publicTalks.find(
            (talk) => talk.talk_number === t.talk_number
          );
          const titleMatch = pt?.talk_title?.[lang]?.toLowerCase().includes(q);
          return numMatch || titleMatch;
        });

        return displayName.includes(q) || hasTalkMatch;
      });
    }

    const sorted = [...data];
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => {
        const nameA = buildPersonFullname(
          a.speaker_data.person_lastname.value,
          a.speaker_data.person_firstname.value,
          fullnameOption
        );
        const nameB = buildPersonFullname(
          b.speaker_data.person_lastname.value,
          b.speaker_data.person_firstname.value,
          fullnameOption
        );
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'last_assignment') {
      sorted.sort((a, b) => {
        const histA = speakersAssignments[a.person_uid] || [];
        const histB = speakersAssignments[b.person_uid] || [];
        const lastA = histA[0]?.date?.getTime() || 0;
        const lastB = histB[0]?.date?.getTime() || 0;
        return lastB - lastA;
      });
    }

    return sorted;
  }, [
    outgoingSpeakers,
    searchQuery,
    sortBy,
    fullnameOption,
    publicTalks,
    lang,
    speakersAssignments,
  ]);

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (!startWeek || !endWeek) return;

    try {
      setIsProcessing(true);

      const normStart = startWeek.replace(/\//g, '-');
      const normEnd = endWeek.replace(/\//g, '-');

      const weeksList = schedules.filter((schedule) => {
        const normWeek = schedule.weekOf.replace(/\//g, '-');
        return normWeek >= normStart && normWeek <= normEnd;
      });

      const allOutgoingTalks = weeksList.flatMap((schedule) =>
        scheduleOutgoingSpeakers(schedule)
      );

      const groupedData = groupOutgoingSpeakersByDate(allOutgoingTalks);

      const blob = await pdf(
        <TemplateOutgoingSpeakersSchedule
          congregation={congName}
          lang={sourceLang}
          data={groupedData}
        />
      ).toBlob();

      saveAs(
        blob,
        nombreArchivo('Discursos salientes', rangoArchivo(startWeek, endWeek))
      );

      setIsProcessing(false);
      setIsExportOpen(false);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      displaySnackNotification({
        header: t('tr_error', 'Error'),
        message: t('tr_errorExporting', 'Error al exportar PDF'),
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      {/* Export Range Dialog */}
      <Dialog
        onClose={() => setIsExportOpen(false)}
        open={isExportOpen}
        sx={{ padding: '24px', position: 'relative' }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '24px',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Typography className="h2">{t('tr_export', 'Exportar')}</Typography>
            <Typography color="var(--grey-400)">
              Selecciona el rango de semanas para el cronograma de salidas de
              oradores.
            </Typography>
          </Box>

          <WeekRangeSelector
            meeting="weekOf"
            onStartChange={(val) => setStartWeek(val)}
            onEndChange={(val) => setEndWeek(val)}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
            mt: 3,
          }}
        >
          <Button variant="tertiary" onClick={() => setIsExportOpen(false)}>
            {t('tr_cancel', 'Cancelar')}
          </Button>
          <Button
            variant="main"
            disabled={isProcessing}
            onClick={handleExportPDF}
          >
            {t('tr_export', 'Exportar')}
          </Button>
        </Box>
      </Dialog>

      <OutgoingPublishDialog
        open={publishDialog}
        onClose={() => setPublishDialog(false)}
        onConfirm={handleTogglePublishMonth}
        isPublished={monthIsPublished}
        month={selectedMonth}
        gaps={monthGaps}
        awayNames={monthAwayNames}
      />

      {/* Quién puede ver los discursos salientes.
          Este interruptor vivía en los ajustes rápidos de la reunión de fin de
          semana, que es de otro responsable: quien decide si las salidas se
          enseñan a toda la congregación es el coordinador de discursos
          públicos, y su sitio de trabajo es esta página. Sigue existiendo
          también en Ajustes ▸ Privacidad de la congregación; es el mismo dato,
          así que da igual por dónde se toque. */}
      <Dialog
        open={accessDialog}
        onClose={() => setAccessDialog(false)}
        sx={{ padding: '24px' }}
      >
        <Typography className="h2" sx={{ color: 'var(--ink)' }}>
          Configuración de los discursos salientes
        </Typography>

        <OutgoingTalkAccess />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="main" onClick={() => setAccessDialog(false)}>
            {t('tr_done', 'Hecho')}
          </Button>
        </Box>
      </Dialog>

      <PageTitle
        title="Oradores salientes"
        quickSettings={() => setAccessDialog(true)}
        quickSettingsLabel="Configuración de los discursos salientes"
        buttons={
          <>
            <NavBarButton
              text={t('tr_export', 'Exportar')}
              onClick={() => setIsExportOpen(true)}
              icon={<IconPrint />}
            />
            {!monthIsHistoric && (
              <NavBarButton
                text={
                  monthIsPublished ? 'Publicado' : t('tr_publish', 'Publicar')
                }
                main={!monthIsPublished}
                onClick={() => setPublishDialog(true)}
                icon={<IconPublish />}
              />
            )}
          </>
        }
      />

      <MeetingPublishNotice type="outgoing" month={selectedMonth} />

      <ScrollableTabs
        tabs={[{ label: 'Oradores' }, { label: 'Programa' }]}
        value={activeTab}
        onChange={(idx) => setActiveTab(idx)}
        sx={{ mt: 1 }}
      />

      {activeTab === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* La misma barra que el catálogo de oradores y que las pestañas
              de Territorios: el buscador dentro de una tarjeta con lo que
              filtra al lado. Antes iban los dos sueltos sobre el fondo, así
              que la pareja no se leía como una barra de herramientas sino como
              dos controles que habían caído ahí. */}
          <PanelToolbar
            busqueda={searchQuery}
            onBuscar={setSearchQuery}
            placeholder="Buscar por nombre o número de discurso"
            accionAncha
            accion={
              <Select
                label="Ordenar por"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'alphabetical' | 'last_assignment'
                  )
                }
                // 240 cuando cabe al lado del buscador; a lo ancho cuando ha
                // bajado a su propia línea. Es el mismo control y las mismas
                // medidas que el «Ordenar por» de Discursos públicos.
                sx={{ width: { mobile: '100%', tablet600: '240px' } }}
              >
                <MenuItem value="alphabetical">
                  <Typography>Alfabético</Typography>
                </MenuItem>
                <MenuItem value="last_assignment">
                  <Typography>Última salida</Typography>
                </MenuItem>
              </Select>
            }
          />

          {filteredSpeakers.length === 0 ? (
            <EmptyState
              icon={<IconOutgoindSpeaker color="var(--accent-dark)" />}
              title="No hay oradores que coincidan con la búsqueda"
              description="Prueba con otro nombre, o con el número del discurso."
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { mobile: '1fr', laptop: '1fr 1fr' },
                gap: '24px',
              }}
            >
              {filteredSpeakers.map((speaker, idx) => {
                const displayName = buildPersonFullname(
                  speaker.speaker_data.person_lastname.value,
                  speaker.speaker_data.person_firstname.value,
                  fullnameOption
                );
                const isElder = speaker.speaker_data.elder.value;
                const isMS = speaker.speaker_data.ministerial_servant.value;
                const preparedTalks = speaker.speaker_data.talks.filter(
                  (t) => !t._deleted
                );
                const history = speakersAssignments[speaker.person_uid] || [];

                const showTalks = !!talksExpanded[speaker.person_uid];
                const showHistory = !!historyExpanded[speaker.person_uid];

                return (
                  <Box
                    key={`${speaker.person_uid}-${idx}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderRadius: 'var(--shape-xl)',
                      backgroundColor: 'var(--card)',
                      padding: '20px',
                      border: '1px solid var(--line)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 0,
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      {/* Header: Name and badges */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography className="h2">{displayName}</Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: '8px',
                              mt: 0.5,
                              flexWrap: 'wrap',
                            }}
                          >
                            {isElder && <MiniChip label="Anciano" />}
                            {isMS && <MiniChip label="Siervo ministerial" />}
                            {!isElder && !isMS && <MiniChip label="Orador" />}
                          </Box>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1, borderColor: 'var(--line)' }} />

                      {/* Collapsible Prepared Talks */}
                      <Box>
                        <Box
                          aria-expanded={showTalks}
                          onClick={() => toggleTalks(speaker.person_uid)}
                          component="button"
                          type="button"
                          sx={{
                            appearance: 'none',
                            font: 'inherit',
                            color: 'inherit',
                            background: 'none',
                            border: 'none',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            py: 0.5,
                            px: 1,
                            borderRadius: 'var(--shape-sm)',
                            '&:hover': { backgroundColor: 'var(--accent-100)' },
                            '&:focus-visible': {
                              outline: '2px solid var(--accent-main)',
                              outlineOffset: '-2px',
                            },
                          }}
                        >
                          {/* La chapa del sistema, no el número metido en la
                              frase entre paréntesis: es justo el antipatrón
                              que CountBadge existe para quitar. Y no es
                              @components/badge, que es la píldora de un
                              estado. */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Typography
                              className="h3"
                              sx={{ fontWeight: '600' }}
                            >
                              Discursos preparados
                            </Typography>
                            <CountBadge value={preparedTalks.length} />
                          </Box>
                          <IconExpand
                            color="var(--ink-2)"
                            sx={{
                              transform: showTalks
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition:
                                'transform var(--motion-medium) var(--ease-spring)',
                            }}
                          />
                        </Box>
                        <Collapse
                          in={showTalks}
                          timeout="auto"
                          unmountOnExit
                          sx={{ mt: 1, px: 1 }}
                        >
                          {preparedTalks.length === 0 ? (
                            <Typography
                              color="var(--grey-400)"
                              sx={{ fontStyle: 'italic' }}
                            >
                              Ningún discurso configurado en el catálogo.
                            </Typography>
                          ) : (
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                              }}
                            >
                              {preparedTalks.map((t) => {
                                const pTalk = publicTalks.find(
                                  (pt) => pt.talk_number === t.talk_number
                                );
                                const title = pTalk?.talk_title?.[lang] ?? '';
                                return (
                                  <Tooltip
                                    title={title}
                                    key={t.talk_number}
                                    arrow
                                  >
                                    <Box sx={{ display: 'inline-block' }}>
                                      <MiniChip
                                        label={`${t.talk_number}`}
                                        edit={false}
                                      />
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          )}
                        </Collapse>
                      </Box>

                      {/* Collapsible Assignments History */}
                      <Box sx={{ mt: 0.5 }}>
                        <Box
                          aria-expanded={showHistory}
                          onClick={() => toggleHistory(speaker.person_uid)}
                          component="button"
                          type="button"
                          sx={{
                            appearance: 'none',
                            font: 'inherit',
                            color: 'inherit',
                            background: 'none',
                            border: 'none',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            py: 0.5,
                            px: 1,
                            borderRadius: 'var(--shape-sm)',
                            '&:hover': { backgroundColor: 'var(--accent-100)' },
                            '&:focus-visible': {
                              outline: '2px solid var(--accent-main)',
                              outlineOffset: '-2px',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Typography
                              className="h3"
                              sx={{ fontWeight: '600' }}
                            >
                              Historial de salidas
                            </Typography>
                            <CountBadge value={history.length} />
                          </Box>
                          <IconExpand
                            color="var(--ink-2)"
                            sx={{
                              transform: showHistory
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition:
                                'transform var(--motion-medium) var(--ease-spring)',
                            }}
                          />
                        </Box>
                        <Collapse
                          in={showHistory}
                          timeout="auto"
                          unmountOnExit
                          sx={{ mt: 1, px: 1 }}
                        >
                          {history.length === 0 ? (
                            <Typography
                              color="var(--grey-400)"
                              sx={{ fontStyle: 'italic' }}
                            >
                              Sin salidas programadas.
                            </Typography>
                          ) : (
                            <List
                              disablePadding
                              sx={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                pr: 1,
                              }}
                            >
                              {history.map((assignment, index) => (
                                <ListItem
                                  key={`${assignment.weekOf}-${index}`}
                                  disableGutters
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    py: 1,
                                    borderBottom:
                                      index < history.length - 1
                                        ? '1px solid var(--accent-100)'
                                        : 'none',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      width: '100%',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Typography className="h4">
                                      {assignment.congregationName}
                                    </Typography>
                                    <Typography
                                      className="label-small-regular"
                                      color="var(--grey-400)"
                                    >
                                      {assignment.formattedDate}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    className="body-small-regular"
                                    color="var(--grey-500)"
                                    sx={{ mt: 0.5 }}
                                  >
                                    Tema {assignment.talkNumber}:{' '}
                                    {assignment.talkTitle ||
                                      'Cántico ' + assignment.songNumber}
                                  </Typography>
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </Collapse>
                      </Box>
                      {/* Action buttons footer */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: '12px',
                          mt: 'auto',
                          pt: 2,
                          borderTop: '1px solid var(--line)',
                          width: '100%',
                        }}
                      >
                        <Button
                          variant="secondary"
                          sx={{
                            flex: 1,
                            height: '38px',
                            minHeight: '38px',
                            borderRadius: 'var(--shape-sm)',
                          }}
                          onClick={() => navigate('/speakers-catalog')}
                        >
                          Editar perfil
                        </Button>
                        <Button
                          variant="main"
                          sx={{
                            flex: 1,
                            height: '38px',
                            minHeight: '38px',
                            borderRadius: 'var(--shape-sm)',
                          }}
                          onClick={() => {
                            const targetWeek =
                              history[0]?.weekOf || schedules[0]?.weekOf || '';
                            if (targetWeek) {
                              setSelectedWeek(targetWeek);
                              const normalised = targetWeek.replace(/\//g, '-');
                              const date = new Date(normalised + 'T12:00:00');
                              if (!isNaN(date.getTime())) {
                                setSelectedYear(date.getFullYear());
                              }
                            }
                            setActiveTab(1);
                          }}
                        >
                          Programar
                        </Button>
                      </Box>
                    </CardContent>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      ) : (
        /* Pestaña Semanas: Split Layout */
        <Box
          sx={{
            display: 'flex',
            flexDirection: desktopUp ? 'row' : 'column',
            gap: '16px',
            alignItems: desktopUp ? 'flex-start' : 'unset',
            mt: 1,
          }}
        >
          {/* Left Sidebar (Week Selector) */}
          {!desktopUp && selectedWeek && !expanded ? (
            // La MISMA barra que la de `@components/collapsible_selector`, que
            // es la que sale plegada en Exhibidores, en Salidas, en Limpieza y
            // en los editores de reunión. Aquí estaba escrita a mano y no
            // coincidía: medido, salía con fondo blanco, radio 28 y 40 de alto
            // donde las otras van con el tinte del acento, radio 16 y 46 de
            // alto. Plegado es una BARRA, no una tarjeta — un escalón menos de
            // curva que el panel abierto.
            // (Sigue siendo una copia: el panel de dentro es propio de esta
            // pantalla —pestañas de año y meses plegables— y pasarlo al
            // componente compartido es una reestructuración aparte.)
            <Box
              component="button"
              type="button"
              aria-expanded={false}
              onClick={() => setExpanded(true)}
              sx={{
                appearance: 'none',
                font: 'inherit',
                color: 'inherit',
                textAlign: 'left',
                width: '100%',
                borderRadius: 'var(--shape-md)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--accent-100)',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition:
                  'background-color var(--motion-fast) var(--ease-standard)',
                '&:hover': { backgroundColor: 'var(--accent-150)' },
                '&:focus-visible': {
                  outline: '2px solid var(--accent-main)',
                  outlineOffset: '2px',
                },
              }}
            >
              <Typography
                className="body-small-semibold"
                sx={{
                  color: 'var(--accent-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {t('tr_week')}:{' '}
                <span style={{ fontWeight: '700' }}>
                  {selectedWeekShortLabel}
                </span>
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Typography
                  className="label-small-medium"
                  sx={{
                    color: 'var(--accent-main)',
                    fontWeight: '600',
                  }}
                >
                  {t('tr_change', 'Cambiar')}
                </Typography>
                <IconExpand color="var(--accent-main)" width={18} height={18} />
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                // Las mismas medidas que `@components/collapsible_selector`,
                // que es el panel de periodo del resto de la app: 360 de ancho
                // y el radio de una tarjeta, no el de un diálogo. Este panel no
                // usa aquel componente porque necesita desplazamiento propio
                // (la lista de semanas del año es larga) y dos acciones en la
                // cabecera, pero no hay razón para que se vea distinto.
                width: desktopUp ? '360px' : '100%',
                flexShrink: 0,
                borderRadius: 'var(--shape-lg)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: desktopUp ? 'sticky' : 'unset',
                top: desktopUp ? 130 : 'unset',
                maxHeight: desktopUp ? 'calc(100vh - 160px)' : 'unset',
                overflowY: 'auto',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                {/* "Semanas", como los otros dos paneles de periodo: el
                    rótulo dice QUÉ se elige aquí dentro, y aquí se eligen
                    semanas. "Programa" es el nombre de la pestaña. */}
                <Typography className="h2">
                  {t('tr_weeks', 'Semanas')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconButton
                    onClick={() =>
                      setMonthSortOrder((prev) =>
                        prev === 'desc' ? 'asc' : 'desc'
                      )
                    }
                    sx={{
                      color: 'var(--accent-main)',
                      padding: '4px',
                      '&:hover': { backgroundColor: 'var(--accent-100)' },
                    }}
                  >
                    {monthSortOrder === 'desc' ? (
                      <IconSortDown color="var(--accent-main)" />
                    ) : (
                      <IconSortUp color="var(--accent-main)" />
                    )}
                  </IconButton>
                  {!desktopUp && selectedWeek && (
                    <IconButton
                      onClick={() => setExpanded(false)}
                      sx={{
                        color: 'var(--grey-600)',
                        padding: '4px',
                      }}
                    >
                      <IconUp color="var(--ink-2)" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Collapse in={desktopUp || expanded} timeout="auto" unmountOnExit>
                {/* Selector de año como ScrollableTabs con soporte para Anteriores/Actuales */}
                {yearTabs.length > 0 && (
                  <ScrollableTabs
                    tabs={yearTabs}
                    value={selectedTabIndex}
                    onChange={handleTabChange}
                    sx={{ mb: 1 }}
                  />
                )}

                {/* Month-grouped collapsible list */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {groupedWeeks.map((group) => {
                    const isMonthExpanded = expandedMonth === group.month;
                    return (
                      <Box
                        key={group.month}
                        sx={{
                          borderBottom: '1px solid var(--line)',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <MonthRow
                          label={group.monthLabel}
                          expanded={isMonthExpanded}
                          onToggle={() => handleToggleMonth(group.month)}
                        />

                        {/* Week items inside month */}
                        <Collapse
                          in={isMonthExpanded}
                          timeout="auto"
                          unmountOnExit
                        >
                          <List
                            disablePadding
                            sx={{
                              pb: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            {group.weeks.map((weekOf) => {
                              const normWeekOf = weekOf.replace(/\//g, '-');
                              const schedule = schedules.find(
                                (s) =>
                                  s.weekOf.replace(/\//g, '-') === normWeekOf
                              );
                              const assignmentsCount =
                                schedule?.weekend_meeting?.outgoing_talks?.filter(
                                  (t) => !t._deleted
                                ).length || 0;
                              const isSelected =
                                selectedWeek?.replace(/\//g, '-') ===
                                normWeekOf;

                              // Format date: e.g. "19 may." — normalise YYYY/MM/DD → YYYY-MM-DD
                              const normalisedWeek = weekOf.replace(/\//g, '-');
                              const d = new Date(normalisedWeek + 'T12:00:00');
                              // Los nombres de mes vienen del diccionario, no
                              // de un array aquí: éste era el DECIMOCUARTO
                              // escrito a mano de la app, y encima el único que
                              // se saltaba la traducción — en cualquier idioma
                              // que no fuera español seguía diciendo "ene.".
                              const weekLabel = isNaN(d.getTime())
                                ? weekOf
                                : `${d.getDate()} ${monthShortNames[d.getMonth()]}`;

                              return (
                                <WeekRow
                                  key={weekOf}
                                  label={weekLabel}
                                  selected={isSelected}
                                  onSelect={async () => {
                                    // Puede ser un lunes generado sin material
                                    // importado: hay que asegurar que su
                                    // registro existe antes de abrirlo.
                                    await dbSchedCheck(weekOf);
                                    setSelectedWeek(weekOf);
                                    setExpandedMonth(group.month);
                                  }}
                                  trailing={
                                    assignmentsCount > 0 && (
                                      <MiniChip label={`${assignmentsCount}`} />
                                    )
                                  }
                                />
                              );
                            })}
                          </List>
                        </Collapse>
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Right Main Editor Container */}
          <Box
            sx={{
              borderRadius: 'var(--shape-xl)',
              padding: '20px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
              height: 'calc(100dvh - 120px)',
              overflowY: 'auto',
              flexGrow: 1,
              width: '100%',
            }}
          >
            {selectedWeek ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Selected week header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderRadius: 'var(--shape-sm)',
                    backgroundColor: 'var(--accent-100)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <Typography
                    className="body-regular-semibold"
                    color="var(--accent-main)"
                  >
                    {selectedWeekLabel}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5, borderColor: 'var(--line)' }} />
                <OutgoingTalksEditor />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="var(--grey-400)">
                  Selecciona una semana en la lista lateral para programar las
                  salidas.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OutgoingSpeakersPage;
