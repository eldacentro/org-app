import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  Tooltip,
  Collapse,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  IconButton,
} from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import Typography from '@components/typography';
import MiniChip from '@components/mini_chip';
import Dialog from '@components/dialog';
import Button from '@components/button';
import WeekRangeSelector from '@features/meetings/week_range_selector';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import {
  IconPrint,
  IconPublish,
  IconOutgoindSpeaker,
  IconSearch,
  IconSortDown,
  IconSortUp,
} from '@components/icons';
import { outgoingSpeakersState } from '@states/visiting_speakers';
import { schedulesState, selectedWeekState } from '@states/schedules';
import { publicTalksState } from '@states/public_talks';
import {
  JWLangState,
  fullnameOptionState,
  JWLangLocaleState,
} from '@states/settings';
import { headerForScheduleState } from '@states/field_service_groups';
import { buildPersonFullname } from '@utils/common';
import {
  scheduleOutgoingSpeakers,
  groupOutgoingSpeakersByDate,
} from '@services/app/schedules';
import { dbSchedCheck } from '@services/dexie/schedules';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import TemplateOutgoingSpeakersSchedule from '@views/meetings/weekend/outgoing_speakers_schedule';
import worker from '@services/worker/backupWorker';
import { displaySnackNotification } from '@services/states/app';
import { useNavigate } from 'react-router';
import OutgoingTalksEditor from '@features/meetings/outgoing_talks';
import ScrollableTabs from '@components/scrollable_tabs';

const OutgoingSpeakersPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { desktopUp } = useBreakpoints();

  const outgoingSpeakers = useAtomValue(outgoingSpeakersState);
  const schedules = useAtomValue(schedulesState);
  const publicTalks = useAtomValue(publicTalksState);
  const lang = useAtomValue(JWLangState);
  const sourceLang = useAtomValue(JWLangLocaleState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const congName = useAtomValue(headerForScheduleState);
  const [selectedWeek, setSelectedWeek] = useAtom(selectedWeekState);

  // States
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'last_assignment'>('alphabetical');
  const [talksExpanded, setTalksExpanded] = useState<Record<string, boolean>>({});
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!desktopUp && selectedWeek) {
      setExpanded(false);
    }
  }, [selectedWeek, desktopUp]);

  // States for PDF Export Dialog
  const [isExportOpen, setIsExportOpen] = useState(false);
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
        (record) => record.weekOf === currentWeekSlash || record.weekOf === currentWeekDash
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
    const groups: Array<{ month: string; monthLabel: string; weeks: string[] }> = [];

    const mesesEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

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

  // Human-readable label for the selected week
  const selectedWeekLabel = useMemo(() => {
    if (!selectedWeek) return '';
    const normalised = selectedWeek.replace(/\//g, '-');
    const date = new Date(normalised + 'T12:00:00');
    if (isNaN(date.getTime())) return selectedWeek;
    const mesesEs = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `Semana del ${date.getDate()} de ${mesesEs[date.getMonth()]} de ${date.getFullYear()}`;
  }, [selectedWeek]);


  // PWA Sync handler
  const handleForceSync = () => {
    worker.postMessage('startWorker');
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: t('tr_syncInProgress', 'Sincronización en curso...'),
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
      const weekDay = weekDate.getDay() === 0 ? 7 : weekDate.getDay();

      outgoingTalks.forEach((record) => {
        const speakerUid = record.value;
        if (history[speakerUid]) {
          const publicTalk = publicTalks.find(
            (talk) => talk.talk_number === +record.public_talk
          );

          // Calculate assignment date
          const dayDiff = record.congregation.weekday - weekDay;
          const recordDate = new Date(weekDate);
          recordDate.setDate(weekDate.getDate() + dayDiff);

          // toLocaleDateString comparaba `lang` (código de idioma de
          // publicación JW, p.ej. 'S') contra 'es', que nunca coincide, así
          // que siempre caía a inglés. Se usa el mismo array manual de
          // meses en español que ya usa selectedWeekLabel en este archivo.
          const mesesEs = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
          ];
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

        const preparedTalks = speaker.speaker_data.talks.filter((t) => !t._deleted);
        const hasTalkMatch = preparedTalks.some((t) => {
          const numMatch = t.talk_number.toString().includes(q);
          const pt = publicTalks.find((talk) => talk.talk_number === t.talk_number);
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

      saveAs(blob, `Salidas_Oradores_${startWeek}_${endWeek}.pdf`);

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
        <Box sx={{ display: 'flex', gap: '24px', flexDirection: 'column', width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Typography className="h2">{t('tr_export', 'Exportar')}</Typography>
            <Typography color="var(--grey-400)">
              Selecciona el rango de semanas para el cronograma de salidas de oradores.
            </Typography>
          </Box>

          <WeekRangeSelector
            meeting="weekOf"
            onStartChange={(val) => setStartWeek(val)}
            onEndChange={(val) => setEndWeek(val)}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', mt: 3 }}>
          <Button
            variant="main"
            disabled={isProcessing}
            onClick={handleExportPDF}
          >
            {t('tr_export', 'Exportar')}
          </Button>
          <Button variant="secondary" onClick={() => setIsExportOpen(false)}>
            {t('tr_cancel', 'Cancelar')}
          </Button>
        </Box>
      </Dialog>

      <PageTitle
        title="Oradores salientes"
        buttons={
          <>
            <NavBarButton
              text={t('tr_export', 'Exportar')}
              onClick={() => setIsExportOpen(true)}
              icon={<IconPrint />}
            />
            <NavBarButton
              text={t('tr_publish', 'Publicar')}
              main
              onClick={handleForceSync}
              icon={<IconPublish />}
            />
          </>
        }
      />

      <Box sx={{ borderBottom: 1, borderColor: 'var(--line)', mt: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: '600',
              textTransform: 'none',
              fontSize: '15px',
              color: 'var(--grey-500)',
            },
            '& .Mui-selected': {
              color: 'var(--accent-main) !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--accent-main)',
            },
          }}
        >
          <Tab label="Oradores" />
          <Tab label="Programa" />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search and Sort controls */}
          <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
            <TextField
              placeholder="Buscar por nombre o número/título de discurso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch width={18} height={18} color="var(--grey-400)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                flexGrow: 1,
                minWidth: '280px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--r-lg)',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--line)',
                },
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: '14px', color: 'var(--grey-500)', fontWeight: '500' }}>
                Ordenar por:
              </Typography>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'alphabetical' | 'last_assignment')}
                size="small"
                sx={{
                  width: '180px',
                  borderRadius: 'var(--r-lg)',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <MenuItem value="alphabetical">Alfabético</MenuItem>
                <MenuItem value="last_assignment">Última salida</MenuItem>
              </Select>
            </Box>
          </Box>

          {filteredSpeakers.length === 0 ? (
            <Card sx={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', p: 3, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <IconOutgoindSpeaker width={48} height={48} color="var(--grey-400)" />
              </Box>
              <Typography className="h2" color="var(--grey-400)">
                No hay oradores que coincidan con la búsqueda
              </Typography>
            </Card>
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
                const preparedTalks = speaker.speaker_data.talks.filter((t) => !t._deleted);
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
                      borderRadius: 'var(--r-lg)',
                      backgroundColor: 'var(--card)',
                      padding: '20px',
                      border: '1px solid var(--line)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Header: Name and badges */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography className="h2" sx={{ fontWeight: '600' }}>
                            {displayName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: '8px', mt: 0.5, flexWrap: 'wrap' }}>
                            {isElder && <MiniChip label="Anciano" />}
                            {isMS && <MiniChip label="Siervo Ministerial" />}
                            {!isElder && !isMS && <MiniChip label="Orador" />}
                          </Box>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1, borderColor: 'var(--line)' }} />

                      {/* Collapsible Prepared Talks */}
                      <Box>
                        <Box
                          onClick={() => toggleTalks(speaker.person_uid)}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            py: 0.5,
                            px: 1,
                            borderRadius: 'var(--radius-m)',
                            '&:hover': { backgroundColor: 'var(--accent-100)' },
                          }}
                        >
                          <Typography className="h3" sx={{ fontWeight: '600' }}>
                            Discursos preparados ({preparedTalks.length})
                          </Typography>
                          {showTalks ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </Box>
                        <Collapse in={showTalks} timeout="auto" unmountOnExit sx={{ mt: 1, px: 1 }}>
                          {preparedTalks.length === 0 ? (
                            <Typography color="var(--grey-400)" sx={{ fontStyle: 'italic' }}>
                              Ningún discurso configurado en el catálogo.
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {preparedTalks.map((t) => {
                                const pTalk = publicTalks.find((pt) => pt.talk_number === t.talk_number);
                                const title = pTalk?.talk_title?.[lang] ?? '';
                                return (
                                  <Tooltip title={title} key={t.talk_number} arrow>
                                    <Box sx={{ display: 'inline-block' }}>
                                      <MiniChip label={`${t.talk_number}`} edit={false} />
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
                          onClick={() => toggleHistory(speaker.person_uid)}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            py: 0.5,
                            px: 1,
                            borderRadius: 'var(--radius-m)',
                            '&:hover': { backgroundColor: 'var(--accent-100)' },
                          }}
                        >
                          <Typography className="h3" sx={{ fontWeight: '600' }}>
                            Historial de salidas ({history.length})
                          </Typography>
                          {showHistory ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </Box>
                        <Collapse in={showHistory} timeout="auto" unmountOnExit sx={{ mt: 1, px: 1 }}>
                          {history.length === 0 ? (
                            <Typography color="var(--grey-400)" sx={{ fontStyle: 'italic' }}>
                              Sin salidas programadas.
                            </Typography>
                          ) : (
                            <List disablePadding sx={{ maxHeight: '200px', overflowY: 'auto', pr: 1 }}>
                              {history.map((assignment, index) => (
                                <ListItem
                                  key={`${assignment.weekOf}-${index}`}
                                  disableGutters
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    py: 1,
                                    borderBottom: index < history.length - 1 ? '1px solid var(--accent-100)' : 'none',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <Typography className="h4" sx={{ fontWeight: '500' }}>
                                      {assignment.congregationName}
                                    </Typography>
                                    <Typography color="var(--grey-400)" sx={{ fontSize: '12px' }}>
                                      {assignment.formattedDate}
                                    </Typography>
                                  </Box>
                                  <Typography color="var(--grey-500)" sx={{ fontSize: '13px', mt: 0.5 }}>
                                    Tema {assignment.talkNumber}: {assignment.talkTitle || 'Cántico ' + assignment.songNumber}
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
                            borderRadius: 'var(--radius-l)',
                            fontSize: '13px',
                            fontWeight: '600',
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
                            borderRadius: 'var(--radius-l)',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}
                          onClick={() => {
                            const targetWeek = history[0]?.weekOf || (schedules[0]?.weekOf || '');
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
            <Box
              onClick={() => setExpanded(true)}
              sx={{
                width: '100%',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'var(--accent-150)',
                },
              }}
            >
              <Typography
                className="body-small-semibold"
                sx={{ color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {t('tr_week')}: <span style={{ fontWeight: '700' }}>{selectedWeekLabel}</span>
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
                <KeyboardArrowDown
                  sx={{
                    color: 'var(--accent-main)',
                    transform: 'rotate(0deg)',
                    fontSize: '18px',
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                width: desktopUp ? '300px' : '100%',
                flexShrink: 0,
                borderRadius: 'var(--r-lg)',
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography className="h2" sx={{ fontWeight: '600' }}>
                  Programa
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconButton
                    onClick={() => setMonthSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    sx={{
                      color: 'var(--accent-main)',
                      padding: '4px',
                      '&:hover': { backgroundColor: 'var(--accent-100)' },
                    }}
                  >
                    {monthSortOrder === 'desc' ? <IconSortDown /> : <IconSortUp />}
                  </IconButton>
                  {!desktopUp && selectedWeek && (
                    <IconButton
                      onClick={() => setExpanded(false)}
                      sx={{
                        color: 'var(--grey-600)',
                        padding: '4px',
                      }}
                    >
                      <KeyboardArrowDown style={{ transform: 'rotate(180deg)' }} />
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
                        {/* Month header */}
                        <Box
                          onClick={() => handleToggleMonth(group.month)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            py: 1,
                            px: 1,
                            borderRadius: 'var(--radius-m)',
                            '&:hover': { backgroundColor: 'var(--accent-50)' },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: 'var(--grey-600)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {group.monthLabel}
                          </Typography>
                          <KeyboardArrowDown
                            sx={{
                              fontSize: '18px',
                              color: 'var(--grey-400)',
                              transform: isMonthExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </Box>

                        {/* Week items inside month */}
                        <Collapse in={isMonthExpanded} timeout="auto" unmountOnExit>
                          <List disablePadding sx={{ pb: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {group.weeks.map((weekOf) => {
                              const normWeekOf = weekOf.replace(/\//g, '-');
                              const schedule = schedules.find((s) => s.weekOf.replace(/\//g, '-') === normWeekOf);
                              const assignmentsCount =
                                schedule?.weekend_meeting?.outgoing_talks?.filter((t) => !t._deleted).length || 0;
                              const isSelected = selectedWeek?.replace(/\//g, '-') === normWeekOf;

                              // Format date: e.g. "19 may." — normalise YYYY/MM/DD → YYYY-MM-DD
                              const normalisedWeek = weekOf.replace(/\//g, '-');
                              const d = new Date(normalisedWeek + 'T12:00:00');
                              const mesesCortos = [
                                'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
                                'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.',
                              ];
                              const weekLabel = isNaN(d.getTime())
                                ? weekOf
                                : `${d.getDate()} ${mesesCortos[d.getMonth()]}`;

                              return (
                                <ListItem
                                  key={weekOf}
                                  disablePadding
                                  onClick={async () => {
                                    // Ensure a schedule record exists for this week
                                    // (it may be a generated Monday without imported source data)
                                    await dbSchedCheck(weekOf);
                                    setSelectedWeek(weekOf);
                                    setExpandedMonth(group.month);
                                  }}
                                  sx={{
                                    borderRadius: 'var(--radius-l)',
                                    backgroundColor: isSelected ? 'var(--accent-100)' : 'transparent',
                                    border: isSelected
                                      ? '1px solid var(--line)'
                                      : '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                      backgroundColor: isSelected
                                        ? 'var(--accent-100)'
                                        : 'var(--accent-50)',
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      width: '100%',
                                      px: 2,
                                      py: 1,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: '14px',
                                        fontWeight: isSelected ? '600' : '400',
                                        color: isSelected
                                          ? 'var(--accent-main)'
                                          : 'var(--black)',
                                      }}
                                    >
                                      {weekLabel}
                                    </Typography>
                                    {assignmentsCount > 0 && (
                                      <MiniChip
                                        label={`${assignmentsCount}`}
                                      />
                                    )}
                                  </Box>
                                </ListItem>
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
              borderRadius: 'var(--r-lg)',
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
                    borderRadius: 'var(--radius-l)',
                    backgroundColor: 'var(--accent-100)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: 'var(--accent-main)',
                    }}
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
                  Selecciona una semana en la lista lateral para programar las salidas.
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
