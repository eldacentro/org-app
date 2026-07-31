import { useState, useMemo, useEffect } from 'react';
import Badge from '@components/badge';
import EmptyState from '@components/empty_state';
import { MESES_ES } from '@utils/nombres_fecha';
import {
  Box,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Tabs,
  Tab,
  IconButton,
  MenuItem,
  Select,
  Grid,
  Chip,
  List,
} from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import {
  isExhibitorMonthPublished,
  monthNeedsPublishing,
  setExhibitorMonthPublished,
} from '@services/app/exhibitors_publish';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { Typography } from '@components/index';
// Botón del sistema de diseño (variantes main/secondary/tertiary), alineado
// con el resto de la app. Se importa con alias porque esta página todavía
// usa el Button de MUI en el cuerpo; los pies de diálogo ya migran al del
// sistema (mismo tratamiento que predicacion_salidas).
import AppButton from '@components/button';
import AutoComplete from '@components/autocomplete';
import TimePicker from '@components/time_picker';
import { appTabsSx } from '@components/tabs/app_tabs_sx';
import { PersonType } from '@definition/person';
import { generateDateFromTime } from '@utils/date';
import { hour24FormatState } from '@states/settings';
import SegmentedControl from '@components/segmented_control';
import accentSurface from '@components/accent_surface';
import Checkbox from '@components/checkbox';
import SwitchWithLabel from '@components/switch_with_label';
import AppSwitch from '@components/switch';
import InfoTip from '@components/info_tip';
import {
  IconSettings,
  IconAdd,
  IconDelete,
  IconGroups,
  IconCalendar,
  IconPrint,
  IconGenerate,
  IconInfo,
  IconCancelFilled,
  IconLocation,
  IconCheck,
} from '@components/icons';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import ExhibitorsPDF from '@views/exhibitors';
import {
  ExhibitorPDFCell,
  ExhibitorPDFTurnItem,
} from '@views/exhibitors/index.types';
import {
  ExhibitorWeekTurnType,
  ExhibitorSettingsType,
} from '@definition/exhibitors';
import {
  exhibitorsListState,
  exhibitorsSettingsState,
} from '@states/exhibitors';
import { personsState } from '@states/persons';
import {
  dbExhibitorsSaveSettings,
  dbExhibitorsSaveWeek,
  dbExhibitorsGetSettings,
} from '@services/dexie/exhibitors';
import { displaySnackNotification } from '@services/states/app';
import worker from '@services/worker/backupWorker';
import {
  congNameState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  pdfExportEnabledState,
} from '@states/settings';
import { personsStateFind } from '@services/states/persons';
import { personGetDisplayName } from '@utils/common';
import { personIsAway } from '@services/app/persons';
import {
  getEffectiveTurnsForMonth,
  getMonthCancelledMessage,
  isMonthCancelled,
} from '../../utils/exhibitors';
import MonthSelector from '@components/month_selector';

const weekdaysOrder = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const weekdaysSpanish = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const MONTH_NAMES = [...MESES_ES];

const getWeekOfDate = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`;
};
const triggerSync = (): void => {
  worker.postMessage('startWorker');
};
const Exhibitors = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { isServiceCommittee } = useCurrentUser();

  // Estados de base de datos
  const persons = useAtomValue(personsState);
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const congName = useAtomValue(congNameState);
  const [exhibitorsList, setExhibitorsList] = useAtom(exhibitorsListState);
  const [settings, setSettings] = useAtom(exhibitorsSettingsState) as [
    ExhibitorSettingsType | null,
    (val: ExhibitorSettingsType | null) => void,
  ];

  // Cargar configuración por defecto en Jotai si está vacía
  useEffect(() => {
    if (!settings) {
      dbExhibitorsGetSettings().then(setSettings);
    }
  }, [settings, setSettings]);

  const hour24 = useAtomValue(hour24FormatState);

  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const getBrotherDisplayName = (personUid: string) => {
    if (!personUid) return '';
    const person = personsStateFind(personUid);
    if (!person) return '';
    return personGetDisplayName(person, displayNameEnabled, fullnameOption);
  };

  // Estados de UI
  const [isSavingTurn, setIsSavingTurn] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'settings'>('planner');
  const [configSubTab, setConfigSubTab] = useState<number>(0);
  const [newExhibitorLocation, setNewExhibitorLocation] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [monthsExpanded, setMonthsExpanded] = useState<boolean>(false);
  const [plannerViewMode, setPlannerViewMode] = useState<'lista' | 'mensual'>(
    'mensual'
  );
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  // Inicializar selectedDayNum
  const initialSelectedDay = useMemo(() => {
    const today = new Date();
    if (
      today.getFullYear() === selectedYear &&
      today.getMonth() === selectedMonth
    ) {
      return today.getDate();
    }
    return 1;
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setSelectedDayNum(initialSelectedDay);
  }, [initialSelectedDay]);

  const currentMonthStr = useMemo(() => {
    return `${selectedYear}/${String(selectedMonth + 1).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  const effectiveTurns = useMemo(() => {
    return getEffectiveTurnsForMonth(settings, currentMonthStr);
  }, [settings, currentMonthStr]);

  const monthCancelled = useMemo(() => {
    return isMonthCancelled(settings, currentMonthStr);
  }, [settings, currentMonthStr]);

  // Diálogo de edición de turno semanal
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    weekOf: string;
    date: string; // YYYY/MM/DD
    turnId: string;
    assignments: { person: string; isResponsible: boolean }[];
    location: string;
    cancelled: boolean;
  }>({
    open: false,
    weekOf: '',
    date: '',
    turnId: '',
    assignments: [],
    location: '',
    cancelled: false,
  });

  // Diálogo de edición/creación de turnos globales
  const [turnConfigDialog, setTurnConfigDialog] = useState<{
    open: boolean;
    id: string; // vacía para nuevo
    days: string[];
    startTime: string;
    endTime: string;
    locations: string[];
    defaultLocation: string;
    newLocationText: string;
    isMonthlyOverride: boolean;
  }>({
    open: false,
    id: '',
    days: [],
    startTime: '09:00',
    endTime: '11:00',
    locations: [],
    defaultLocation: '',
    newLocationText: '',
    isMonthlyOverride: false,
  });

  // Diálogo de Ajustes Mensuales
  const [monthlySettingsDialog, setMonthlySettingsDialog] = useState(false);
  const isCurrentlyOverridden = !!settings?.monthlyOverrides?.[currentMonthStr];

  const cancelledMonthMessage = useMemo(() => {
    return getMonthCancelledMessage(settings, currentMonthStr);
  }, [settings, currentMonthStr]);

  // Estado local del texto para no escribir a la base de datos en cada
  // tecla — se guarda al salir del campo (onBlur). Se resincroniza si se
  // cambia de mes o se abre el diálogo de nuevo.
  const [cancelledMessageInput, setCancelledMessageInput] = useState('');

  useEffect(() => {
    setCancelledMessageInput(cancelledMonthMessage);
  }, [cancelledMonthMessage, monthlySettingsDialog]);

  const handleSaveCancelledMonthMessage = async () => {
    if (!settings || !monthCancelled) return;
    if (cancelledMessageInput === cancelledMonthMessage) return;

    const localSettings = structuredClone(settings);
    if (!localSettings.monthlyOverrides) localSettings.monthlyOverrides = {};
    localSettings.monthlyOverrides[currentMonthStr] = {
      isCancelledMonth: true,
      cancelledMessage: cancelledMessageInput,
    };
    await dbExhibitorsSaveSettings(localSettings);
    setSettings(localSettings);
    triggerSync();
  };

  const handleCreateOverride = async () => {
    if (!settings) return;
    const localSettings = structuredClone(settings);
    if (!localSettings.monthlyOverrides) localSettings.monthlyOverrides = {};
    localSettings.monthlyOverrides[currentMonthStr] = structuredClone(
      settings.turns || []
    );
    await dbExhibitorsSaveSettings(localSettings);
    setSettings(localSettings);
    triggerSync();
  };

  const handleRestoreGlobal = async () => {
    if (!settings) return;
    const localSettings = structuredClone(settings);
    if (localSettings.monthlyOverrides) {
      delete localSettings.monthlyOverrides[currentMonthStr];
    }
    await dbExhibitorsSaveSettings(localSettings);
    setSettings(localSettings);
    triggerSync();
  };

  const handleToggleCancelMonth = async () => {
    if (!settings) return;
    const localSettings = structuredClone(settings);
    if (!localSettings.monthlyOverrides) localSettings.monthlyOverrides = {};

    if (monthCancelled) {
      delete localSettings.monthlyOverrides[currentMonthStr];
    } else {
      localSettings.monthlyOverrides[currentMonthStr] = {
        isCancelledMonth: true,
        cancelledMessage: cancelledMessageInput,
      };
    }
    await dbExhibitorsSaveSettings(localSettings);
    setSettings(localSettings);
    triggerSync();
  };

  // Aquí había un botón rotulado "Publicar" que en realidad solo forzaba una
  // sincronización — parte de la confusión venía de ahí: parecía que publicaba
  // el mes y no publicaba nada. Ahora ese botón publica de verdad, y el
  // sincronizado va incluido (publicar guarda y dispara el ciclo).

  // Filtrar hermanos con tick "Exhibidores" habilitado en el perfil (ordenados alfabéticamente)
  const enabledExhibitorBrothers = useMemo(() => {
    const list = persons.filter(
      (p) => p.person_data.predicacion_exhibidores?.value === true
    );
    return list.sort((a, b) => {
      const nameA = personGetDisplayName(a, displayNameEnabled, fullnameOption);
      const nameB = personGetDisplayName(b, displayNameEnabled, fullnameOption);
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  }, [persons, displayNameEnabled, fullnameOption]);

  // Turnos configurados activos en el mes
  const generatedSlotsInMonth = useMemo(() => {
    if (!effectiveTurns || effectiveTurns.length === 0) return [];

    const slots = [];
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);

    const date = new Date(start);
    while (date <= end) {
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
      const dayLabel = weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

      // Buscar si hay turnos configurados para este día
      const dayTurns = effectiveTurns.filter((t) => t.days.includes(dayLabel));

      for (const turn of dayTurns) {
        const weekOf = getWeekOfDate(date);
        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

        // Obtener asignaciones de la semana si existen
        const weekRecord = exhibitorsList.find((w) => w.weekOf === weekOf);
        const savedTurn = weekRecord?.turns?.find(
          (t) => t.turnId === turn.id && t.date === dateStr
        );

        let finalAssignments = savedTurn?.assignments || [];
        const finalLocation =
          savedTurn?.location || turn.defaultLocation || 'Exhibidor';
        const finalCancelled = savedTurn?.cancelled || false;

        // Auto-asignación de turnos fijos si no hay registro específico de la semana
        if (!savedTurn) {
          const fixed =
            settings.fixedAssignments?.filter(
              (f) => f.turnId === turn.id && (!f.day || f.day === dayLabel)
            ) || [];
          const sortedFixed = [...fixed].sort((a, b) => {
            const posA = a.position !== undefined ? a.position : 0;
            const posB = b.position !== undefined ? b.position : 0;
            return posA - posB;
          });
          finalAssignments = sortedFixed.map((f) => ({
            person: f.personUid,
            isResponsible: f.isResponsible,
          }));
        }

        slots.push({
          id: `${turn.id}_${dateStr}`,
          turnId: turn.id,
          weekOf,
          date: dateStr,
          dayNum: date.getDate(),
          dayLabel,
          startTime: turn.startTime,
          endTime: turn.endTime,
          assignments: finalAssignments,
          location: finalLocation,
          cancelled: finalCancelled,
        });
      }

      date.setDate(date.getDate() + 1);
    }

    return slots;
  }, [selectedYear, selectedMonth, settings, exhibitorsList, effectiveTurns]);

  // ── Publicación del mes ────────────────────────────────────────────────
  // Las asignaciones fijas dicen quién SUELE llevar cada turno, no a quién le
  // toca. Hasta que el responsable publica el mes, esto es un borrador: no
  // sale en "Mis asignaciones", ni en el programa semanal de los demás, ni
  // genera aviso. Ver services/app/exhibitors_publish.
  const [publishDialog, setPublishDialog] = useState(false);

  const monthIsPublished = useMemo(
    () => isExhibitorMonthPublished(settings, currentMonthStr),
    [settings, currentMonthStr]
  );

  const monthIsHistoric = useMemo(
    () => !monthNeedsPublishing(currentMonthStr),
    [currentMonthStr]
  );

  // Turnos del mes sin nadie asignado. No impide publicar —a veces se quiere
  // confirmar lo que ya está decidido aunque falte gente— pero se dice.
  const emptySlotsInMonth = useMemo(() => {
    return generatedSlotsInMonth.filter(
      (slot) =>
        !slot.cancelled &&
        !slot.assignments.some((a) => a.person && a.person.length > 0)
    ).length;
  }, [generatedSlotsInMonth]);

  const handleTogglePublishMonth = async () => {
    if (!settings || monthIsHistoric) return;

    const localSettings = structuredClone(settings);
    localSettings.publishedMonths = setExhibitorMonthPublished(
      localSettings.publishedMonths,
      currentMonthStr,
      !monthIsPublished
    );

    await dbExhibitorsSaveSettings(localSettings);
    setSettings(localSettings);
    triggerSync();
    setPublishDialog(false);
  };

  // Determinar qué días de la semana tienen al menos un turno para la cuadrícula horizontal
  const activeWeekdaysInMonth = useMemo(() => {
    if (!effectiveTurns || effectiveTurns.length === 0) return weekdaysOrder;
    const active = new Set<string>();
    for (const turn of effectiveTurns) {
      for (const day of turn.days) {
        active.add(day);
      }
    }
    return weekdaysOrder.filter((d) => active.has(d));
  }, [effectiveTurns]);

  // Autocompletar todo el mes con turnos fijos
  const handleAutofillMonth = async () => {
    if (!effectiveTurns || effectiveTurns.length === 0) return;

    try {
      const uniqueWeeks = Array.from(
        new Set(generatedSlotsInMonth.map((s) => s.weekOf))
      );
      let updatedCount = 0;

      const localList = structuredClone(exhibitorsList);

      for (const weekOf of uniqueWeeks) {
        let weekRecord = localList.find((w) => w.weekOf === weekOf);
        let createdNew = false;
        if (!weekRecord) {
          weekRecord = { weekOf, turns: [] };
          localList.push(weekRecord);
          createdNew = true;
        }

        if (!weekRecord.turns) {
          weekRecord.turns = [];
        }

        // Obtener turnos de esta semana
        const weekSlots = generatedSlotsInMonth.filter(
          (s) => s.weekOf === weekOf
        );
        let weekModified = false;

        for (const slot of weekSlots) {
          // Si el turno ya tiene asignaciones manuales locales (es decir, ya estaba guardado en IndexedDB), lo omitimos
          const alreadySaved = weekRecord.turns.some(
            (t) => t.turnId === slot.turnId && t.date === slot.date
          );
          if (alreadySaved) continue;

          // Autocompletar con turnos fijos
          const fixed =
            settings.fixedAssignments?.filter(
              (f) =>
                f.turnId === slot.turnId && (!f.day || f.day === slot.dayLabel)
            ) || [];
          const sortedFixed = [...fixed].sort((a, b) => {
            const posA = a.position !== undefined ? a.position : 0;
            const posB = b.position !== undefined ? b.position : 0;
            return posA - posB;
          });
          const assignments = sortedFixed.map((f) => ({
            person: f.personUid,
            isResponsible: f.isResponsible,
          }));

          weekRecord.turns.push({
            turnId: slot.turnId,
            date: slot.date,
            assignments,
            location: slot.location,
            cancelled: slot.cancelled,
          });

          weekModified = true;
          updatedCount++;
        }

        if (weekModified || createdNew) {
          await dbExhibitorsSaveWeek(weekRecord);
        }
      }

      if (updatedCount > 0) {
        setExhibitorsList(localList);
        triggerSync();
        displaySnackNotification({
          header: t('tr_done', 'Hecho'),
          message: `Se autocompletaron ${updatedCount} turnos fijos para este mes.`,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: 'Info',
          message:
            'Todos los turnos de este mes ya se encuentran inicializados o editados.',
          severity: 'success',
        });
      }
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'Error',
        message: 'Error al ejecutar el autocompletado mensual.',
        severity: 'error',
      });
    }
  };

  // Exportar mes a PDF
  const handleExportPDF = async () => {
    if (!settings) return;

    try {
      const monthNames = [...MESES_ES];
      const monthName = `${monthNames[selectedMonth]} ${selectedYear}`;

      const activeDaysSpanish = activeWeekdaysInMonth.map((day) => {
        const idx = weekdaysOrder.indexOf(day);
        return weekdaysSpanish[idx];
      });

      // Generar celdas del mes para el PDF
      const cells: ExhibitorPDFCell[] = [];
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);

      // Desfase inicial al primer lunes de la semana del día 1
      const firstMonday = new Date(start);
      const day = firstMonday.getDay();
      const diff = firstMonday.getDate() - day + (day === 0 ? -6 : 1);
      const calendarStart = new Date(firstMonday.setDate(diff));

      const currentDate = new Date(calendarStart);
      while (currentDate <= end || currentDate.getDay() !== 1) {
        const dayOfWeek = currentDate.getDay();
        const dayLabel = weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

        if (activeWeekdaysInMonth.includes(dayLabel)) {
          if (currentDate.getMonth() !== selectedMonth) {
            cells.push({ type: 'empty' });
          } else {
            const dateStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
            const daySlots = generatedSlotsInMonth.filter(
              (s) => s.date === dateStr
            );

            const turns: ExhibitorPDFTurnItem[] = daySlots.map((s) => {
              const formattedAssignments = s.assignments.map((a) => ({
                name: getBrotherDisplayName(a.person),
                isResponsible: a.isResponsible,
              }));

              return {
                id: s.id,
                time: `${s.startTime} - ${s.endTime}`,
                location: s.location,
                assignments: formattedAssignments,
                isCancelled: s.cancelled,
                isAssigned: s.assignments.length > 0,
              };
            });

            cells.push({
              type: 'day',
              dayNum: currentDate.getDate(),
              turns,
            });
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const blob = await pdf(
        <ExhibitorsPDF
          monthName={monthName}
          cong_name={congName}
          weekdays={activeDaysSpanish}
          cells={cells}
          updatedAt={new Date().toISOString()}
        />
      ).toBlob();

      saveAs(
        blob,
        `Exhibidores_${monthNames[selectedMonth]}_${selectedYear}.pdf`
      );

      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'PDF generado correctamente.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'Error',
        message: 'Error al exportar el programa mensual a PDF.',
        severity: 'error',
      });
    }
  };

  // Abrir diálogo de edición de turno semanal
  const handleOpenEditTurn = (
    slot: ExhibitorWeekTurnType & { weekOf: string }
  ) => {
    if (!isServiceCommittee) return; // Sólo lectura para publicadores normales

    setEditDialog({
      open: true,
      weekOf: slot.weekOf,
      date: slot.date,
      turnId: slot.turnId,
      assignments:
        slot.assignments.length > 0
          ? slot.assignments
          : [
              { person: '', isResponsible: false },
              { person: '', isResponsible: false },
              { person: '', isResponsible: false },
            ],
      location: slot.location,
      cancelled: slot.cancelled,
    });
  };

  // Guardar edición del turno semanal
  const handleSaveWeekTurn = async () => {
    if (!settings || isSavingTurn) return;
    setIsSavingTurn(true);

    try {
      const localList = structuredClone(exhibitorsList);
      let weekRecord = localList.find((w) => w.weekOf === editDialog.weekOf);

      if (!weekRecord) {
        weekRecord = {
          weekOf: editDialog.weekOf,
          turns: [],
        };
        localList.push(weekRecord);
      }

      if (!weekRecord.turns) {
        weekRecord.turns = [];
      }

      // Quitar turno previo
      weekRecord.turns = weekRecord.turns.filter(
        (t) => !(t.turnId === editDialog.turnId && t.date === editDialog.date)
      );

      // Filtrar asignaciones vacías
      const cleanAssignments = editDialog.assignments.filter(
        (a) => a.person !== ''
      );

      weekRecord.turns.push({
        turnId: editDialog.turnId,
        date: editDialog.date,
        assignments: cleanAssignments,
        location: editDialog.location,
        cancelled: editDialog.cancelled,
      });

      await dbExhibitorsSaveWeek(weekRecord);
      setExhibitorsList(localList);
      triggerSync();

      setEditDialog({ ...editDialog, open: false });
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'Turno semanal actualizado correctamente.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'Error',
        message: 'Ocurrió un error al guardar el turno de la semana.',
        severity: 'error',
      });
    } finally {
      setIsSavingTurn(false);
    }
  };

  // Restaurar turno a la asignación fija global (borrar override manual)
  const handleResetWeekTurn = async () => {
    if (!settings) return;

    try {
      const localList = structuredClone(exhibitorsList);
      const weekRecord = localList.find((w) => w.weekOf === editDialog.weekOf);

      if (!weekRecord || !weekRecord.turns) {
        setEditDialog({ ...editDialog, open: false });
        return;
      }

      // Eliminar el registro manual del IndexedDB
      weekRecord.turns = weekRecord.turns.filter(
        (t) => !(t.turnId === editDialog.turnId && t.date === editDialog.date)
      );

      await dbExhibitorsSaveWeek(weekRecord);
      setExhibitorsList(localList);
      triggerSync();

      setEditDialog({ ...editDialog, open: false });
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'Turno restaurado a la configuración global dinámica.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'Error',
        message: 'Ocurrió un error al restaurar el turno de la semana.',
        severity: 'error',
      });
    }
  };

  // Validaciones del diálogo de edición semanal
  const dialogWarnings = useMemo(() => {
    if (!editDialog.open || editDialog.cancelled) return [];
    const warnings = [];

    const activeBrothers = editDialog.assignments.filter(
      (a) => a.person !== ''
    );
    if (activeBrothers.length > 0 && activeBrothers.length < 3) {
      warnings.push('Se recomienda asignar 3 hermanos para este turno.');
    }

    // Al menos 1 debe ser varón y responsable de turno
    const hasResponsible = activeBrothers.some((a) => {
      const isConfiguredResponsible =
        settings?.responsibles?.includes(a.person) || false;
      const personData = personsStateFind(a.person);
      const isMale = personData?.person_data.male || false;
      return a.isResponsible && isConfiguredResponsible && isMale;
    });

    if (activeBrothers.length > 0 && !hasResponsible) {
      warnings.push(
        'Al menos uno de los hermanos asignados debe ser varón y estar designado como "Responsable de turno".'
      );
    }

    // Igual que en las asignaciones de reunión: si el hermano tiene un
    // período de ausencia que cubre el día de este turno, se avisa aquí
    // también en vez de dejar que se asigne en silencio.
    for (const a of activeBrothers) {
      const personData = personsStateFind(a.person);
      if (!personData) continue;

      const awayNotice = personIsAway(personData, editDialog.date);
      if (awayNotice) {
        const name = personGetDisplayName(
          personData,
          displayNameEnabled,
          fullnameOption
        );
        warnings.push(`${name}: ${awayNotice}`);
      }
    }

    return warnings;
  }, [editDialog, settings, displayNameEnabled, fullnameOption]);

  // Manejar cambio de asignado en el diálogo
  const handleAssignmentChange = (idx: number, personUid: string) => {
    const updated = [...editDialog.assignments];
    // Responsable solo si el hermano está en la lista de responsables
    // configurados Y va en la primera posición del turno — antes solo se
    // comprobaba lo primero, así que si el segundo o tercer hermano también
    // estaba habilitado como responsable, le salía la etiqueta igual que al
    // primero (dos "Resp." a la vez en el mismo turno).
    const isConfiguredResponsible =
      settings?.responsibles?.includes(personUid) ?? false;
    updated[idx] = {
      person: personUid,
      isResponsible: idx === 0 && isConfiguredResponsible,
    };

    setEditDialog({
      ...editDialog,
      assignments: updated,
    });
  };

  // --- CRUD CONFIGURACIÓN GLOBAL DE TURNOS ---

  // Eliminar un turno global o override mensual
  const handleDeleteGlobalTurn = async (
    turnId: string,
    isMonthlyOverride: boolean = false
  ) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);

      if (isMonthlyOverride) {
        if (!localSettings.monthlyOverrides) return;
        const currentOverrides =
          localSettings.monthlyOverrides[currentMonthStr];
        if (Array.isArray(currentOverrides)) {
          localSettings.monthlyOverrides[currentMonthStr] =
            currentOverrides.filter((t) => t.id !== turnId);
        }
      } else {
        localSettings.turns = localSettings.turns.filter(
          (t) => t.id !== turnId
        );
        localSettings.fixedAssignments = localSettings.fixedAssignments.filter(
          (f) => f.turnId !== turnId
        );
      }

      await dbExhibitorsSaveSettings(localSettings);
      setSettings(localSettings);
      triggerSync();

      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'Turno global eliminado correctamente.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir diálogo para añadir/editar turno global
  const handleOpenTurnConfig = (
    turn?: ExhibitorSettingsType['turns'][number]
  ) => {
    const globalLocations = settings?.locations || [];
    if (turn) {
      setTurnConfigDialog({
        open: true,
        id: turn.id,
        days: turn.days,
        startTime: turn.startTime,
        endTime: turn.endTime,
        locations: turn.locations,
        defaultLocation: turn.defaultLocation,
        newLocationText: '',
      });
    } else {
      setTurnConfigDialog({
        open: true,
        id: '',
        days: [],
        startTime: '09:00',
        endTime: '11:00',
        locations: globalLocations,
        defaultLocation: globalLocations[0] || '',
        newLocationText: '',
      });
    }
  };

  // Guardar turno global
  const handleSaveGlobalTurn = async () => {
    if (isSavingTurn) return;

    if (turnConfigDialog.days.length === 0) {
      displaySnackNotification({
        header: 'Aviso',
        message:
          'Debe seleccionar al menos un día de la semana para este turno.',
        severity: 'error',
      });
      return;
    }

    setIsSavingTurn(true);
    try {
      const baseSettings: ExhibitorSettingsType = settings || {
        weekOf: 'settings',
        updatedAt: new Date().toISOString(),
        turns: [],
        locations: [],
        responsibles: [],
        fixedAssignments: [],
        availability: {},
      };

      const localSettings = structuredClone(baseSettings);
      if (!localSettings.turns) localSettings.turns = [];

      const id = turnConfigDialog.id || crypto.randomUUID();
      const updatedTurn = {
        id,
        days: turnConfigDialog.days,
        startTime: turnConfigDialog.startTime,
        endTime: turnConfigDialog.endTime,
        locations: turnConfigDialog.locations,
        defaultLocation:
          turnConfigDialog.defaultLocation ||
          turnConfigDialog.locations[0] ||
          'Exhibidor',
      };

      if (turnConfigDialog.isMonthlyOverride) {
        if (!localSettings.monthlyOverrides)
          localSettings.monthlyOverrides = {};
        let currentOverrides =
          localSettings.monthlyOverrides[currentMonthStr] || [];
        if (!Array.isArray(currentOverrides)) currentOverrides = [];
        const overridesArray = currentOverrides as ExhibitorTurnType[];

        if (turnConfigDialog.id) {
          localSettings.monthlyOverrides[currentMonthStr] = overridesArray.map(
            (t) => (t.id === id ? updatedTurn : t)
          );
        } else {
          localSettings.monthlyOverrides[currentMonthStr] = [
            ...overridesArray,
            updatedTurn,
          ];
        }
      } else {
        if (turnConfigDialog.id) {
          localSettings.turns = localSettings.turns.map((t) =>
            t.id === id ? updatedTurn : t
          );
        } else {
          localSettings.turns.push(updatedTurn);
        }
      }

      await dbExhibitorsSaveSettings(localSettings);
      setSettings(localSettings);
      triggerSync();

      setTurnConfigDialog({ ...turnConfigDialog, open: false });
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'Configuración de turno guardada.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'Error',
        message: 'Ocurrió un error al guardar la configuración del turno.',
        severity: 'error',
      });
    } finally {
      setIsSavingTurn(false);
    }
  };

  // Manejar el catálogo global de ubicaciones de exhibidores
  const handleAddExhibitorLocation = async () => {
    if (!newExhibitorLocation.trim() || !settings) return;
    if (settings.locations?.includes(newExhibitorLocation.trim())) return;

    const updatedSettings = {
      ...settings,
      locations: [...(settings.locations || []), newExhibitorLocation.trim()],
    };

    await dbExhibitorsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
    setNewExhibitorLocation('');
  };

  const handleDeleteExhibitorLocation = async (loc: string) => {
    if (!settings) return;

    const updatedLocations = (settings.locations || []).filter(
      (l) => l !== loc
    );

    const updatedTurns = (settings.turns || []).map((turn) => {
      const turnLocs = turn.locations.filter((l) => l !== loc);
      let defLoc = turn.defaultLocation;
      if (defLoc === loc) {
        defLoc = turnLocs[0] || '';
      }
      return {
        ...turn,
        locations: turnLocs,
        defaultLocation: defLoc,
      };
    });

    const updatedSettings = {
      ...settings,
      locations: updatedLocations,
      turns: updatedTurns,
    };

    await dbExhibitorsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
  };

  // Añadir una ubicación rápidamente desde el diálogo de turno global
  const handleQuickAddLocation = async () => {
    const trimmed = turnConfigDialog.newLocationText.trim();
    if (!trimmed || !settings) return;

    // 1. Guardar globalmente si no existe ya
    const updatedGlobalLocations = settings.locations?.includes(trimmed)
      ? settings.locations
      : [...(settings.locations || []), trimmed];

    const updatedSettings = {
      ...settings,
      locations: updatedGlobalLocations,
    };

    await dbExhibitorsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);

    // 2. Habilitarla inmediatamente para el turno actual
    const updatedTurnLocations = turnConfigDialog.locations.includes(trimmed)
      ? turnConfigDialog.locations
      : [...turnConfigDialog.locations, trimmed];

    setTurnConfigDialog({
      ...turnConfigDialog,
      locations: updatedTurnLocations,
      defaultLocation: turnConfigDialog.defaultLocation || trimmed,
      newLocationText: '',
    });
  };

  // Alternar responsable global
  const handleToggleResponsible = async (personUid: string) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);
      if (!localSettings.responsibles) localSettings.responsibles = [];

      if (localSettings.responsibles.includes(personUid)) {
        localSettings.responsibles = localSettings.responsibles.filter(
          (id) => id !== personUid
        );
      } else {
        localSettings.responsibles.push(personUid);
      }

      await dbExhibitorsSaveSettings(localSettings);
      setSettings(localSettings);
      triggerSync();
    } catch (err) {
      console.error(err);
    }
  };

  // Alternar turno preferido en la disponibilidad del hermano
  const handleToggleAvailability = async (
    personUid: string,
    compositeKey: string
  ) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);
      if (!localSettings.availability) localSettings.availability = {};

      let current = localSettings.availability[personUid] || [];

      // Si hay claves viejas en formato simple (sin guion bajo "_"), las migramos al formato compuesto para este turno.
      // Un formato simple "turnId" se expande en "turnId_day" para cada día configurado en ese turno.
      const turnIdOfKey = compositeKey.split('_')[0];
      const hasOldFormat = current.includes(turnIdOfKey);

      if (hasOldFormat) {
        // Remover el viejo turnId simple
        current = current.filter((id) => id !== turnIdOfKey);
        // Obtener los días de este turno
        const turn = settings.turns?.find((t) => t.id === turnIdOfKey);
        if (turn) {
          // Agregar la disponibilidad para todos los días de este turno
          for (const day of turn.days) {
            const dayKey = `${turnIdOfKey}_${day}`;
            if (!current.includes(dayKey)) {
              current.push(dayKey);
            }
          }
        }
      }

      // Ahora alternamos la clave compuesta
      if (current.includes(compositeKey)) {
        current = current.filter((id) => id !== compositeKey);
      } else {
        current.push(compositeKey);
      }

      localSettings.availability[personUid] = current;

      await dbExhibitorsSaveSettings(localSettings);
      setSettings(localSettings);
      triggerSync();
    } catch (err) {
      console.error(err);
    }
  };

  // Alternar asignación fija
  const handleFixedAssignmentChange = async (
    turnId: string,
    day: string,
    idx: number,
    personUid: string
  ) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);
      if (!localSettings.fixedAssignments) localSettings.fixedAssignments = [];

      // 1. Filtrar asignaciones de otros turnos y días
      const otherAssignments = localSettings.fixedAssignments.filter(
        (f) => !(f.turnId === turnId && f.day === day)
      );

      // 2. Obtener asignaciones actuales de este turno y día
      const turnAssignments = localSettings.fixedAssignments.filter(
        (f) => f.turnId === turnId && f.day === day
      );

      // 3. Normalizar asignaciones para garantizar que tengan la propiedad position
      const normalizedAssignments = turnAssignments.map((f, i) => ({
        ...f,
        position: f.position !== undefined ? f.position : i,
      }));

      // 4. Filtrar la asignación en la posición exacta `idx` que vamos a cambiar/eliminar
      const updatedAssignments = normalizedAssignments.filter(
        (f) => f.position !== idx
      );

      // 5. Si la persona no está vacía, añadir el nuevo registro con su posición explícita
      if (personUid !== '') {
        updatedAssignments.push({
          turnId,
          day,
          personUid,
          isResponsible: idx === 0,
          position: idx,
        });
      }

      localSettings.fixedAssignments = [
        ...otherAssignments,
        ...updatedAssignments,
      ];

      await dbExhibitorsSaveSettings(localSettings);
      setSettings(localSettings);
      triggerSync();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PageTitle
        title="Exhibidores"
        // La configuración va en el ENGRANAJE, no en la barra de abajo: la
        // barra es para HACER cosas con el contenido —autocompletar, exportar,
        // publicar— y el engranaje para cambiar cómo funciona la pantalla.
        // Aquí además el mismo botón hacía las dos cosas: se llamaba
        // "Configuración" para ir y "Programa" para volver, o sea que el botón
        // de una acción cambiaba de significado según dónde estuvieras.
        quickSettings={
          isServiceCommittee
            ? () =>
                setActiveTab(activeTab === 'planner' ? 'settings' : 'planner')
            : undefined
        }
        quickSettingsLabel="Configuración de exhibidores"
        buttons={
          <>
            {isServiceCommittee && (
              <>
                {activeTab === 'planner' && (
                  <>
                    <NavBarButton
                      text={t('tr_autofill', 'Autocompletar')}
                      onClick={handleAutofillMonth}
                      icon={<IconGenerate />}
                    />
                    {pdfExportEnabled && (
                      <NavBarButton
                        text={t('tr_export', 'Exportar')}
                        onClick={handleExportPDF}
                        icon={<IconPrint />}
                      />
                    )}
                  </>
                )}
              </>
            )}
            {isServiceCommittee && !monthIsHistoric && (
              <NavBarButton
                text={monthIsPublished ? 'Publicado' : 'Publicar'}
                main={!monthIsPublished}
                onClick={() => setPublishDialog(true)}
                icon={<IconGroups />}
              />
            )}
          </>
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {/* PANEL IZQUIERDO: Selector de Meses y Años */}
        {/* El MISMO selector de mes a cualquier ancho.
            En escritorio (≥1200) esta página pintaba OTRO control: una barra
            lateral de 280px, pegajosa, con un desplegable de año y una lista de
            los doce meses — cien líneas escritas a mano, con sus radios y sus
            títulos propios, y copiadas enteras en la página gemela. La misma
            tarea, dos controles distintos, y cuál te tocaba dependía de lo
            ancho que tuvieras la ventana.
            Se queda el compartido, que es el que ya usaban esta página en
            móvil, su gemela y Limpieza del salón. */}
        {activeTab === 'planner' && (
          <MonthSelector
            monthNames={MONTH_NAMES}
            year={selectedYear}
            month={selectedMonth}
            years={[new Date().getFullYear(), new Date().getFullYear() + 1]}
            expanded={monthsExpanded}
            onToggle={() => setMonthsExpanded(!monthsExpanded)}
            onChange={({ year, month }) => {
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
          />
        )}

        {/* PANEL PRINCIPAL */}
        <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
          {activeTab === 'planner' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* HEADER SIEMPRE VISIBLE */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexDirection: { mobile: 'column', tablet: 'row' },
                  // Si el grupo de controles no cabe al lado del título, baja
                  // ENTERO a la linea de abajo. Sin esto se estrujaba hasta
                  // dejar "Lista" y "Cuadricula" pegados el uno al otro.
                  flexWrap: 'wrap',
                  gap: '16px',
                  width: '100%',
                }}
              >
                <Typography
                  className="h2"
                  // El título de la sección iba en azul de marca; en esta app
                  // los encabezados van con la tinta normal y el azul se
                  // reserva para lo que se pulsa.
                  color="var(--ink)"
                  sx={{ minWidth: 0 }}
                  style={{ margin: 0 }}
                >
                  {`Programa de exhibidores — ${MONTH_NAMES[selectedMonth].toLowerCase()} ${selectedYear}`}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    // Los dos controles NO se separan uno del otro: lo que
                    // cede cuando falta sitio es el título, que puede pasar a
                    // dos líneas. Antes envolvían ellos y quedaban apilados en
                    // una columna estrecha a la derecha del título.
                    flexWrap: 'nowrap',
                    flexShrink: 0,
                    // En móvil el título ya baja a su propia línea, así que
                    // este grupo se queda solo y toma el ancho entero. Sin
                    // esto se dimensionaba por su contenido —160 del botón +
                    // 12 + 200 del selector = 372— dentro de un hueco de 361,
                    // y "Cuadrícula" asomaba 11px por fuera del margen de la
                    // página. Medido en un móvil de 393.
                    width: { mobile: '100%', tablet: 'auto' },
                  }}
                >
                  {/* El `Button` compartido de la app. Era un Button de MUI en crudo:
                    radio de 12px cuando todos los botones son píldoras,
                    `textTransform: none` cuando la app los pone en mayúsculas,
                    y `fontWeight: bold` a mano. Cuando el mes tiene
                    excepciones se pone naranja, y eso ya lo sabe hacer el
                    componente con su prop `color`. */}
                  <AppButton
                    variant={isCurrentlyOverridden ? 'main' : 'tertiary'}
                    color={isCurrentlyOverridden ? 'orange' : undefined}
                    disableAutoStretch
                    onClick={() => setMonthlySettingsDialog(true)}
                    startIcon={<IconSettings width={18} height={18} />}
                  >
                    Ajustes del mes
                  </AppButton>

                  {/* El `SegmentedControl` compartido — el mismo de la ficha de
                      territorio y del resto de la app. Aquí había uno propio y
                      era el dibujo de "elegido" MÁS ruidoso que quedaba: el
                      segmento activo se pintaba de azul macizo con texto
                      blanco, mientras en todas las demás pantallas "elegido"
                      es un tinte suave con la tinta oscura. */}
                  {/* Los 200 son el ancho cómodo, no un mínimo intocable: en
                      un móvil de 360 el botón de al lado no cabría. Ahí el
                      selector cede lo justo y sigue leyéndose. */}
                  <Box
                    sx={{
                      flexShrink: { mobile: 1, tablet: 0 },
                      minWidth: { mobile: 0, tablet: '200px' },
                      flexBasis: '200px',
                    }}
                  >
                    <SegmentedControl
                      ariaLabel="Vista del programa"
                      tabs={['Lista', 'Cuadrícula']}
                      active={plannerViewMode === 'lista' ? 0 : 1}
                      onChange={(i) =>
                        setPlannerViewMode(i === 0 ? 'lista' : 'mensual')
                      }
                    />
                  </Box>
                </Box>
              </Box>

              {!effectiveTurns || effectiveTurns.length === 0 ? (
                <EmptyState
                  icon={<IconInfo color="var(--accent-dark)" />}
                  title={
                    monthCancelled
                      ? 'Los exhibidores están suspendidos este mes'
                      : 'No hay turnos configurados'
                  }
                />
              ) : (
                /* Vista de Planificador (Grid/Lista) */
                <Box>
                  {plannerViewMode === 'lista' ? (
                    /* Vista de Lista */
                    (() => {
                      const dayMap = new Map<
                        string,
                        typeof generatedSlotsInMonth
                      >();
                      for (const slot of generatedSlotsInMonth) {
                        const key = slot.date;
                        if (!dayMap.has(key)) dayMap.set(key, []);
                        dayMap.get(key)!.push(slot);
                      }

                      // Sort turns for each day chronologically by start time
                      for (const key of dayMap.keys()) {
                        dayMap
                          .get(key)!
                          .sort((a, b) =>
                            a.startTime.localeCompare(b.startTime)
                          );
                      }

                      const weekMap = new Map<
                        string,
                        Array<{
                          dateKey: string;
                          daySlots: typeof generatedSlotsInMonth;
                        }>
                      >();
                      for (const [dateKey, daySlots] of dayMap.entries()) {
                        const weekOf = daySlots[0].weekOf;
                        if (!weekMap.has(weekOf)) weekMap.set(weekOf, []);
                        weekMap.get(weekOf)!.push({ dateKey, daySlots });
                      }

                      const sortedWeeks = Array.from(weekMap.entries()).sort(
                        (a, b) => a[0].localeCompare(b[0])
                      );

                      const getWeekLabel = (weekOfStr: string): string => {
                        const [year, month, day] = weekOfStr
                          .split('/')
                          .map(Number);
                        const monday = new Date(year, month - 1, day);
                        const sunday = new Date(monday);
                        sunday.setDate(sunday.getDate() + 6);

                        const months = [...MESES_ES];

                        const monDayNum = monday.getDate();
                        const monMonth = months[monday.getMonth()];

                        const sunDayNum = sunday.getDate();
                        const sunMonth = months[sunday.getMonth()];

                        if (monday.getMonth() === sunday.getMonth()) {
                          return `Semana del ${monDayNum} al ${sunDayNum} de ${monMonth}`;
                        } else {
                          return `Semana del ${monDayNum} de ${monMonth} al ${sunDayNum} de ${sunMonth}`;
                        }
                      };

                      const weekdays = [
                        'domingo',
                        'lunes',
                        'martes',
                        'miércoles',
                        'jueves',
                        'viernes',
                        'sábado',
                      ];
                      const formatLegibleDate = (dateStr: string): string => {
                        const [year, month, day] = dateStr
                          .split('/')
                          .map(Number);
                        const date = new Date(year, month - 1, day);
                        return `${weekdays[date.getDay()]} ${date.getDate()}`;
                      };

                      return sortedWeeks.map(([weekOf, days]) => {
                        const weekLabel = getWeekLabel(weekOf);
                        return (
                          <Box key={weekOf} sx={{ mb: '32px' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <Typography
                                className="h3"
                                color="var(--ink)"
                                style={{ margin: 0 }}
                              >
                                {weekLabel}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                              }}
                            >
                              {days.map(({ dateKey, daySlots }) => {
                                const dayLabel = formatLegibleDate(dateKey);

                                return (
                                  <Card
                                    key={dateKey}
                                    sx={{
                                      border: '1px solid var(--line)',
                                      borderRadius: 'var(--shape-sm)',
                                      boxShadow: 'none',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        px: '16px',
                                        py: '10px',
                                        // Era un degradado de 135° de azul a
                                        // azul oscuro con texto blanco: el
                                        // único de la app junto al de su
                                        // gemela. La cabecera de una tarjeta
                                        // aquí es un tinte plano con la tinta
                                        // de marca —así lo hacen `card_header`
                                        // y las secciones de Territorios—, y
                                        // así sigue al tema oscuro sola.
                                        backgroundColor: 'var(--accent-100)',
                                        borderBottom: '1px solid var(--line)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                    >
                                      <Typography
                                        className="label-small-semibold"
                                        style={{
                                          color: 'var(--accent-dark)',
                                          textTransform: 'capitalize',
                                        }}
                                      >
                                        {dayLabel}
                                      </Typography>
                                    </Box>

                                    {daySlots.map((slot, idx) => {
                                      const isCancelled = slot.cancelled;
                                      const isAssigned =
                                        slot.assignments.length > 0;
                                      const assignedNames = slot.assignments
                                        .map((ass) =>
                                          getBrotherDisplayName(ass.person)
                                        )
                                        .filter(Boolean)
                                        .join(', ');

                                      return (
                                        <Box
                                          key={slot.id}
                                          onClick={() =>
                                            handleOpenEditTurn(slot)
                                          }
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            px: '16px',
                                            py: '14px',
                                            borderTop:
                                              idx > 0
                                                ? '1px solid var(--line)'
                                                : 'none',
                                            backgroundColor: isCancelled
                                              ? 'rgba(var(--red-main-base), 0.1)'
                                              : 'var(--card)',
                                            cursor: isServiceCommittee
                                              ? 'pointer'
                                              : 'default',
                                            transition:
                                              'background-color 0.15s',
                                            '&:hover': isServiceCommittee
                                              ? {
                                                  backgroundColor: isCancelled
                                                    ? 'rgba(var(--red-main-base), 0.15)'
                                                    : 'var(--accent-100)',
                                                }
                                              : {},
                                          }}
                                        >
                                          <Box sx={{ minWidth: '80px' }}>
                                            <Typography
                                              style={{
                                                fontWeight: '700',
                                                fontSize: '16px',
                                                color: isCancelled
                                                  ? 'var(--grey-500)'
                                                  : 'var(--accent-main)',
                                              }}
                                            >
                                              {slot.startTime}
                                            </Typography>
                                            <Typography
                                              style={{
                                                fontSize: '12px',
                                                color: 'var(--grey-500)',
                                                fontWeight: '500',
                                              }}
                                            >
                                              {slot.endTime}
                                            </Typography>
                                          </Box>

                                          <Box
                                            sx={{
                                              width: '1px',
                                              alignSelf: 'stretch',
                                              backgroundColor: 'var(--line)',
                                            }}
                                          />

                                          {/* Los nombres y el sitio.

                                              En móvil iban en dos columnas y el
                                              sitio ganaba: una dirección entera
                                              en una sola línea pide mucho ancho,
                                              y como los nombres eran `flex: 1`
                                              —que parte de cero— se quedaban con
                                              las sobras. "Jonathan Izquierdo,
                                              Silvia Izquierdo, Lara Izquierdo"
                                              salía en seis renglones de una
                                              palabra, y la dirección igualmente
                                              cortada.

                                              Debajo de 600 se apilan: los
                                              nombres a todo lo ancho y el sitio
                                              debajo, en pequeño y sin cortar
                                              —que ahí tiene línea entera—. De
                                              600 para arriba siguen en columnas,
                                              pero con el sitio topado al 45%
                                              para que no vuelva a comerse el
                                              sitio de los nombres. */}
                                          <Box
                                            sx={{
                                              flex: 1,
                                              minWidth: 0,
                                              display: 'flex',
                                              flexDirection: {
                                                mobile: 'column',
                                                tablet600: 'row',
                                              },
                                              alignItems: {
                                                mobile: 'flex-start',
                                                tablet600: 'center',
                                              },
                                              gap: {
                                                mobile: '2px',
                                                tablet600: '16px',
                                              },
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                minWidth: 0,
                                                width: {
                                                  mobile: '100%',
                                                  tablet600: 'auto',
                                                },
                                                flex: {
                                                  mobile: '0 0 auto',
                                                  tablet600: 1,
                                                },
                                              }}
                                            >
                                              {isCancelled ? (
                                                <Badge
                                                  size="small"
                                                  color="red"
                                                  text="Suspendido"
                                                  icon={
                                                    <IconCancelFilled color="var(--red-main)" />
                                                  }
                                                  sx={{
                                                    alignSelf: 'flex-start',
                                                  }}
                                                />
                                              ) : (
                                                <Typography
                                                  style={{
                                                    fontWeight: '600',
                                                    fontSize: '16px',
                                                    color: isAssigned
                                                      ? 'var(--black)'
                                                      : 'var(--error-main)',
                                                  }}
                                                >
                                                  {assignedNames ||
                                                    'Sin asignar'}
                                                </Typography>
                                              )}
                                            </Box>

                                            <Box
                                              sx={{
                                                minWidth: 0,
                                                maxWidth: {
                                                  mobile: '100%',
                                                  tablet600: '45%',
                                                },
                                                textAlign: {
                                                  mobile: 'left',
                                                  tablet600: 'right',
                                                },
                                                whiteSpace: {
                                                  mobile: 'normal',
                                                  tablet600: 'nowrap',
                                                },
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                              }}
                                            >
                                              <Typography
                                                style={{
                                                  fontSize: '13px',
                                                  color: isCancelled
                                                    ? 'var(--grey-400)'
                                                    : 'var(--grey-600)',
                                                }}
                                              >
                                                {isCancelled
                                                  ? '—'
                                                  : slot.location}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Box>
                                      );
                                    })}
                                  </Card>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      });
                    })()
                  ) : (
                    /* Vista Mensual de Cuadrícula */
                    <Box>
                      {(() => {
                        const weekdaysInfo = [
                          {
                            dayOfWeek: 1,
                            label: 'lun.',
                            englishLabel: 'monday',
                          },
                          {
                            dayOfWeek: 2,
                            label: 'mar.',
                            englishLabel: 'tuesday',
                          },
                          {
                            dayOfWeek: 3,
                            label: 'mié.',
                            englishLabel: 'wednesday',
                          },
                          {
                            dayOfWeek: 4,
                            label: 'jue.',
                            englishLabel: 'thursday',
                          },
                          {
                            dayOfWeek: 5,
                            label: 'vie.',
                            englishLabel: 'friday',
                          },
                          {
                            dayOfWeek: 6,
                            label: 'sáb.',
                            englishLabel: 'saturday',
                          },
                          {
                            dayOfWeek: 0,
                            label: 'dom.',
                            englishLabel: 'sunday',
                          },
                        ];

                        const activeDays = new Set<number>();
                        for (const slot of generatedSlotsInMonth) {
                          const [sYear, sMonth, sDay] = slot.date
                            .split('/')
                            .map(Number);
                          const sDate = new Date(sYear, sMonth - 1, sDay);
                          activeDays.add(sDate.getDay());
                        }
                        const weekdaysToShow = weekdaysInfo.filter((info) =>
                          activeDays.has(info.dayOfWeek)
                        );
                        const weekdaysToShowFinal =
                          weekdaysToShow.length > 0
                            ? weekdaysToShow
                            : weekdaysInfo;

                        const daysInMonth = new Date(
                          selectedYear,
                          selectedMonth + 1,
                          0
                        ).getDate();

                        const weekKeys = new Set<string>();
                        for (let d = 1; d <= daysInMonth; d++) {
                          const date = new Date(selectedYear, selectedMonth, d);
                          weekKeys.add(getWeekOfDate(date));
                        }
                        const sortedWeekKeys = Array.from(weekKeys).sort();

                        const cells: Array<
                          | { type: 'empty'; id: string }
                          | { type: 'day'; dayNum: number; date: Date }
                        > = [];

                        for (const weekKey of sortedWeekKeys) {
                          const [wYear, wMonth, wDay] = weekKey
                            .split('/')
                            .map(Number);
                          const mondayDate = new Date(wYear, wMonth - 1, wDay);

                          for (const dayInfo of weekdaysToShowFinal) {
                            let diffDays = 0;
                            if (dayInfo.dayOfWeek === 1) diffDays = 0;
                            else if (dayInfo.dayOfWeek === 2) diffDays = 1;
                            else if (dayInfo.dayOfWeek === 3) diffDays = 2;
                            else if (dayInfo.dayOfWeek === 4) diffDays = 3;
                            else if (dayInfo.dayOfWeek === 5) diffDays = 4;
                            else if (dayInfo.dayOfWeek === 6) diffDays = 5;
                            else if (dayInfo.dayOfWeek === 0) diffDays = 6;

                            const cellDate = new Date(mondayDate);
                            cellDate.setDate(mondayDate.getDate() + diffDays);

                            if (
                              cellDate.getMonth() === selectedMonth &&
                              cellDate.getFullYear() === selectedYear
                            ) {
                              cells.push({
                                type: 'day',
                                dayNum: cellDate.getDate(),
                                date: cellDate,
                              });
                            } else {
                              cells.push({
                                type: 'empty',
                                id: `empty-${weekKey}-${dayInfo.dayOfWeek}`,
                              });
                            }
                          }
                        }

                        // Group slots by day
                        const daySlotsMap = new Map<
                          number,
                          typeof generatedSlotsInMonth
                        >();
                        for (const slot of generatedSlotsInMonth) {
                          const day = parseInt(slot.date.split('/')[2], 10);
                          if (!daySlotsMap.has(day)) {
                            daySlotsMap.set(day, []);
                          }
                          daySlotsMap.get(day)!.push(slot);
                        }

                        // Sort slots chronologically by start time for each day
                        for (const day of daySlotsMap.keys()) {
                          daySlotsMap
                            .get(day)!
                            .sort((a, b) =>
                              a.startTime.localeCompare(b.startTime)
                            );
                        }

                        const formatLegibleDate = (date: Date): string => {
                          const weekdays = [
                            'domingo',
                            'lunes',
                            'martes',
                            'miércoles',
                            'jueves',
                            'viernes',
                            'sábado',
                          ];
                          return `${weekdays[date.getDay()]} ${date.getDate()}`;
                        };

                        return (
                          <Box
                            sx={{
                              borderRadius: 'var(--shape-md)',
                              border: '1px solid var(--line)',
                              backgroundColor: 'var(--card)',
                              p: { mobile: '12px', tablet: '20px' },
                              boxShadow: 'none',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <Grid
                              container
                              spacing={1}
                              columns={weekdaysToShowFinal.length}
                              sx={{ width: '100%', margin: 0 }}
                            >
                              {weekdaysToShowFinal.map((dayInfo) => (
                                <Grid
                                  size={{ mobile: 1 }}
                                  key={dayInfo.label}
                                  sx={{ p: 0.5 }}
                                >
                                  <Box
                                    sx={{
                                      textAlign: 'center',
                                      py: '6px',
                                      borderBottom: '2px solid var(--line)',
                                      mb: '8px',
                                    }}
                                  >
                                    <Typography
                                      style={{
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        color: 'var(--accent-main)',
                                        textTransform: 'none',
                                      }}
                                    >
                                      {dayInfo.label}
                                    </Typography>
                                  </Box>
                                </Grid>
                              ))}

                              {cells.map((cell) => {
                                if (cell.type === 'empty') {
                                  return (
                                    <Grid
                                      size={{ mobile: 1 }}
                                      key={cell.id}
                                      sx={{ p: 0.5 }}
                                    >
                                      <Box
                                        sx={{
                                          aspectRatio: desktopUp ? 'auto' : '1',
                                          minHeight: desktopUp
                                            ? '110px'
                                            : 'auto',
                                          backgroundColor: 'var(--accent-150)',
                                          border: '1px solid var(--line)',
                                          borderRadius: 'var(--shape-sm)',
                                          opacity: 0.3,
                                        }}
                                      />
                                    </Grid>
                                  );
                                }

                                const daySlots =
                                  daySlotsMap.get(cell.dayNum) || [];
                                const isSelected =
                                  selectedDayNum === cell.dayNum;

                                if (desktopUp) {
                                  // Desktop Calendar Cell
                                  return (
                                    <Grid
                                      size={{ mobile: 1 }}
                                      key={cell.dayNum}
                                      sx={{ p: 0.5 }}
                                    >
                                      <Box
                                        sx={{
                                          minHeight: '130px',
                                          backgroundColor: 'var(--card)',
                                          border: isSelected
                                            ? '2px solid var(--accent-main)'
                                            : '1px solid var(--line)',
                                          borderRadius: 'var(--shape-sm)',
                                          p: '10px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '8px',
                                          height: '100%',
                                          boxShadow: 'none',
                                        }}
                                      >
                                        <Typography
                                          style={{
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            color: isSelected
                                              ? 'var(--accent-main)'
                                              : 'var(--grey-600)',
                                            margin: 0,
                                          }}
                                        >
                                          {cell.dayNum}
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            flexGrow: 1,
                                          }}
                                        >
                                          {daySlots.length === 0 ? (
                                            <Typography
                                              style={{
                                                fontSize: '12px',
                                                color: 'var(--grey-400)',
                                                fontStyle: 'italic',
                                                marginTop: '4px',
                                              }}
                                            >
                                              sin turnos
                                            </Typography>
                                          ) : (
                                            daySlots.map((slot) => {
                                              const isCancelled =
                                                slot.cancelled;
                                              const hasAssignments =
                                                slot.assignments.some(
                                                  (ass) => ass.person !== ''
                                                );

                                              let bgColor = 'var(--accent-150)';
                                              let textColor =
                                                'var(--accent-dark)';
                                              let hoverBgColor =
                                                'var(--accent-200)';

                                              if (isCancelled) {
                                                bgColor =
                                                  'rgba(var(--red-main-base), 0.1)';
                                                textColor = 'var(--error-dark)';
                                                hoverBgColor =
                                                  'rgba(var(--red-main-base), 0.15)';
                                              } else if (!hasAssignments) {
                                                bgColor =
                                                  'rgba(var(--orange-main-base), 0.1)';
                                                textColor =
                                                  'var(--orange-dark)';
                                                hoverBgColor =
                                                  'rgba(var(--orange-main-base), 0.15)';
                                              }

                                              return (
                                                <Box
                                                  key={slot.id}
                                                  onClick={() =>
                                                    handleOpenEditTurn(slot)
                                                  }
                                                  sx={{
                                                    backgroundColor: bgColor,
                                                    color: textColor,
                                                    border: 'none',
                                                    borderRadius:
                                                      'var(--shape-sm)',
                                                    p: '6px 8px',
                                                    cursor: isServiceCommittee
                                                      ? 'pointer'
                                                      : 'default',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '2px',
                                                    transition:
                                                      'all 0.2s ease-in-out',
                                                    boxShadow:
                                                      'var(--small-card-shadow)',
                                                    '&:hover':
                                                      isServiceCommittee
                                                        ? {
                                                            backgroundColor:
                                                              hoverBgColor,
                                                          }
                                                        : {},
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      width: '100%',
                                                      alignItems: 'center',
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontWeight: '800',
                                                        fontSize: '12px',
                                                        whiteSpace: 'nowrap',
                                                        opacity: 0.9,
                                                      }}
                                                    >
                                                      {slot.startTime}
                                                    </span>
                                                    <span
                                                      style={{
                                                        fontSize: '12px',
                                                        opacity: 0.8,
                                                        fontStyle: 'italic',
                                                        maxWidth: '60%',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                          'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                      }}
                                                    >
                                                      {slot.location}
                                                    </span>
                                                  </Box>

                                                  {isCancelled ? (
                                                    <span
                                                      style={{
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        textAlign: 'left',
                                                        color:
                                                          'var(--error-dark)',
                                                      }}
                                                    >
                                                      Suspendido
                                                    </span>
                                                  ) : !hasAssignments ? (
                                                    <span
                                                      style={{
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        textAlign: 'left',
                                                        color:
                                                          'var(--orange-dark)',
                                                      }}
                                                    >
                                                      Sin asignar
                                                    </span>
                                                  ) : (
                                                    <Box
                                                      sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '3px',
                                                        mt: '3px',
                                                        width: '100%',
                                                      }}
                                                    >
                                                      {slot.assignments
                                                        .map((ass) =>
                                                          getBrotherDisplayName(
                                                            ass.person
                                                          )
                                                        )
                                                        .filter(Boolean)
                                                        .map(
                                                          (
                                                            fullName,
                                                            assIdx
                                                          ) => (
                                                            <span
                                                              key={assIdx}
                                                              style={{
                                                                fontSize:
                                                                  '12px',
                                                                fontWeight:
                                                                  '700',
                                                                textAlign:
                                                                  'left',
                                                                lineHeight:
                                                                  '1.25',
                                                                wordBreak:
                                                                  'break-word',
                                                                display:
                                                                  'block',
                                                                width: '100%',
                                                              }}
                                                            >
                                                              {fullName}
                                                            </span>
                                                          )
                                                        )}
                                                    </Box>
                                                  )}
                                                </Box>
                                              );
                                            })
                                          )}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  );
                                } else {
                                  // Mobile Calendar Cell
                                  const dots = daySlots.map((slot) => {
                                    const isCancelled = slot.cancelled;
                                    const isAssigned =
                                      slot.assignments.length > 0;
                                    if (isCancelled) return 'red';
                                    if (isAssigned) return 'green';
                                    return 'yellow';
                                  });

                                  return (
                                    <Grid
                                      size={{ mobile: 1 }}
                                      key={cell.dayNum}
                                      sx={{ p: 0.5 }}
                                    >
                                      <Box
                                        onClick={() =>
                                          setSelectedDayNum(cell.dayNum)
                                        }
                                        sx={{
                                          aspectRatio: '1',
                                          backgroundColor: isSelected
                                            ? 'var(--accent-150)'
                                            : 'var(--card)',
                                          border: isSelected
                                            ? '2px solid var(--accent-main)'
                                            : '1px solid var(--line)',
                                          borderRadius: 'var(--shape-sm)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease',
                                          '&:hover': {
                                            borderColor: 'var(--accent-main)',
                                          },
                                        }}
                                      >
                                        <Typography
                                          style={{
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            color: isSelected
                                              ? 'var(--accent-dark)'
                                              : 'var(--grey-700)',
                                          }}
                                        >
                                          {cell.dayNum}
                                        </Typography>

                                        <Box
                                          sx={{
                                            display: 'flex',
                                            gap: '3px',
                                            mt: '4px',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            px: '2px',
                                          }}
                                        >
                                          {dots.map((dotColor, idx) => (
                                            <Box
                                              key={idx}
                                              sx={{
                                                width: '5px',
                                                height: '5px',
                                                borderRadius:
                                                  'var(--shape-full)',
                                                backgroundColor:
                                                  dotColor === 'green'
                                                    ? 'var(--green-main)'
                                                    : dotColor === 'yellow'
                                                      ? 'var(--orange-main)'
                                                      : 'var(--error-main)',
                                              }}
                                            />
                                          ))}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  );
                                }
                              })}
                            </Grid>

                            {/* Mobile Details Panel */}
                            {!desktopUp && selectedDayNum !== null && (
                              <Box sx={{ mt: '24px' }}>
                                <Card
                                  sx={{
                                    border: '1px solid var(--line)',
                                    borderRadius: 'var(--shape-sm)',
                                    boxShadow: 'none',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      px: '16px',
                                      py: '10px',
                                      backgroundColor: 'var(--accent-100)',
                                      borderBottom: '1px solid var(--line)',
                                    }}
                                  >
                                    <Typography
                                      className="h3"
                                      style={{
                                        fontWeight: '700',
                                        color: 'var(--accent-dark)',
                                        textTransform: 'none',
                                      }}
                                    >
                                      {(() => {
                                        const date = new Date(
                                          selectedYear,
                                          selectedMonth,
                                          selectedDayNum
                                        );
                                        return formatLegibleDate(date);
                                      })()}
                                    </Typography>
                                  </Box>

                                  {(() => {
                                    const selectedDaySlots =
                                      generatedSlotsInMonth
                                        .filter(
                                          (slot) =>
                                            parseInt(
                                              slot.date.split('/')[2],
                                              10
                                            ) === selectedDayNum
                                        )
                                        .sort((a, b) =>
                                          a.startTime.localeCompare(b.startTime)
                                        );

                                    if (selectedDaySlots.length === 0) {
                                      return (
                                        <Box
                                          sx={{
                                            p: '24px',
                                            textAlign: 'center',
                                          }}
                                        >
                                          <Typography
                                            style={{
                                              color: 'var(--grey-500)',
                                              fontSize: '13px',
                                              fontStyle: 'italic',
                                            }}
                                          >
                                            No hay turnos programados para este
                                            día.
                                          </Typography>
                                        </Box>
                                      );
                                    }

                                    return selectedDaySlots.map((slot, idx) => {
                                      const isCancelled = slot.cancelled;
                                      const isAssigned =
                                        slot.assignments.length > 0;

                                      return (
                                        <Box
                                          key={slot.id}
                                          onClick={() =>
                                            handleOpenEditTurn(slot)
                                          }
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            px: '16px',
                                            py: '14px',
                                            borderTop:
                                              idx > 0
                                                ? '1px solid var(--line)'
                                                : 'none',
                                            backgroundColor: isCancelled
                                              ? 'rgba(var(--red-main-base), 0.1)'
                                              : 'var(--card)',
                                            cursor: isServiceCommittee
                                              ? 'pointer'
                                              : 'default',
                                            transition:
                                              'background-color 0.15s',
                                            '&:hover': isServiceCommittee
                                              ? {
                                                  backgroundColor: isCancelled
                                                    ? 'rgba(var(--red-main-base), 0.15)'
                                                    : 'var(--accent-100)',
                                                }
                                              : {},
                                          }}
                                        >
                                          <Box sx={{ minWidth: '80px' }}>
                                            <Typography
                                              style={{
                                                fontWeight: '700',
                                                fontSize: '16px',
                                                color: isCancelled
                                                  ? 'var(--grey-500)'
                                                  : 'var(--accent-main)',
                                              }}
                                            >
                                              {slot.startTime}
                                            </Typography>
                                            <Typography
                                              style={{
                                                fontSize: '12px',
                                                color: 'var(--grey-500)',
                                                fontWeight: '500',
                                              }}
                                            >
                                              {slot.endTime}
                                            </Typography>
                                          </Box>

                                          <Box
                                            sx={{
                                              width: '1px',
                                              alignSelf: 'stretch',
                                              backgroundColor: 'var(--line)',
                                            }}
                                          />

                                          {/* Este panel solo sale en móvil, así
                                              que aquí no hay nada que decidir:
                                              los nombres a todo lo ancho y el
                                              sitio debajo. En dos columnas
                                              pasaba lo mismo que en la vista de
                                              Lista —la dirección se quedaba con
                                              el ancho y los nombres se partían
                                              palabra a palabra—, y encima el
                                              `minWidth: 100px` de la dirección
                                              no la dejaba ceder. */}
                                          <Box
                                            sx={{
                                              flex: 1,
                                              minWidth: 0,
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '2px',
                                            }}
                                          >
                                            {isCancelled ? (
                                              <Badge
                                                size="small"
                                                color="red"
                                                text="Suspendido"
                                                icon={
                                                  <IconCancelFilled color="var(--red-main)" />
                                                }
                                                sx={{ alignSelf: 'flex-start' }}
                                              />
                                            ) : (
                                              <Typography
                                                style={{
                                                  fontWeight: '600',
                                                  fontSize: '13px',
                                                  color: isAssigned
                                                    ? 'var(--black)'
                                                    : 'var(--error-main)',
                                                }}
                                              >
                                                {slot.assignments
                                                  .map((ass) =>
                                                    getBrotherDisplayName(
                                                      ass.person
                                                    )
                                                  )
                                                  .filter(Boolean)
                                                  .join(', ') || 'Sin asignar'}
                                              </Typography>
                                            )}

                                            <Typography
                                              style={{
                                                fontSize: '13px',
                                                color: isCancelled
                                                  ? 'var(--grey-400)'
                                                  : 'var(--grey-600)',
                                              }}
                                            >
                                              {isCancelled
                                                ? '—'
                                                : slot.location}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      );
                                    });
                                  })()}
                                </Card>
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            // PANTALLA DE CONFIGURACIÓN GLOBAL
            <Box
              sx={{
                borderRadius: 'var(--shape-lg)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* Config header */}
              <Box
                sx={{
                  px: { mobile: '20px', tablet: '28px' },
                  py: { mobile: '16px', tablet: '20px' },
                  // Mismo caso que la cabecera del día: degradado fuera,
                  // tinte plano del tema dentro.
                  backgroundColor: 'var(--accent-100)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <IconSettings
                  width={22}
                  height={22}
                  color="var(--accent-dark)"
                />
                <Typography
                  className="h3"
                  style={{ color: 'var(--accent-dark)', margin: 0 }}
                >
                  Configuración de exhibidores
                </Typography>
              </Box>
              <Box sx={{ padding: { mobile: '20px', tablet: '28px' } }}>
                <Tabs
                  value={configSubTab}
                  onChange={(_, val) => setConfigSubTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{ ...appTabsSx, marginBottom: '24px' }}
                >
                  <Tab label="Ubicaciones" />
                  <Tab label="Turnos" />
                  <Tab label="Responsables" />
                  <Tab label="Asignaciones fijas" />
                  <Tab label="Disponibilidad" />
                </Tabs>

                {/* SUB-PESTAÑA 0: UBICACIONES (GLOBAL) */}
                {configSubTab === 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    <Box>
                      <Typography className="h4" color="var(--ink)">
                        Ubicaciones de exhibidores
                      </Typography>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: 'var(--grey-600)',
                          marginTop: '4px',
                        }}
                      >
                        Gestiona los puntos geográficos de predicación pública
                        de la congregación. Luego podrás habilitar cuáles de
                        estas ubicaciones aplican a cada turno global.
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: '12px',
                        maxWidth: '500px',
                        width: '100%',
                        flexDirection: { mobile: 'column', tablet: 'row' },
                        // `alignItems: center` no es un detalle de espaciado.
                        // Sin el, el contenedor estira el boton hasta el alto
                        // del campo (56px), asi que los dos compartian borde
                        // superior e inferior exactos y el ojo los leia como UN
                        // solo objeto — y un objeto con dos radios distintos
                        // canta. Con el boton a su alto normal (40) son dos
                        // cosas separadas, y cada una se queda con la forma que
                        // le toca por su papel: el campo cuadradito, el boton
                        // pildora. De paso, el boton deja de ser un 40% mas
                        // alto que todos los demas botones de la app.
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        label="Nueva ubicación"
                        value={newExhibitorLocation}
                        onChange={(e) =>
                          setNewExhibitorLocation(e.target.value)
                        }
                        size="small"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 'var(--shape-sm)',
                          },
                        }}
                      />
                      <AppButton
                        variant="main"
                        disableAutoStretch
                        onClick={handleAddExhibitorLocation}
                        startIcon={<IconAdd />}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Añadir
                      </AppButton>
                    </Box>

                    {!settings?.locations || settings.locations.length === 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: 'var(--accent-100)',
                          border: '1px dashed var(--line)',
                          borderRadius: 'var(--shape-sm)',
                        }}
                      >
                        <IconInfo color="var(--accent-main)" />
                        <Typography
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-dark)',
                            fontWeight: '500',
                          }}
                        >
                          No hay ubicaciones de exhibidores configuradas. Añade
                          una ubicación en el formulario superior.
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            mobile: '1fr',
                            tablet: '1fr 1fr',
                            laptop: '1fr 1fr 1fr',
                          },
                          gap: '12px',
                          width: '100%',
                        }}
                      >
                        {settings.locations.map((loc) => (
                          <Card
                            key={loc}
                            sx={{
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--shape-sm)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--card)',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ color: 'var(--accent-main)' }}
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <Typography
                                style={{
                                  fontWeight: '700',
                                  fontSize: '13px',
                                  color: 'var(--black)',
                                }}
                              >
                                {loc}
                              </Typography>
                            </Box>
                            <IconButton
                              onClick={() => handleDeleteExhibitorLocation(loc)}
                              sx={{
                                color: 'var(--error-main)',
                                '&:hover': {
                                  backgroundColor: 'var(--error-150)',
                                },
                              }}
                              size="small"
                            >
                              <IconDelete color="var(--red-main)" />
                            </IconButton>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* SUB-PESTAÑA 1: TURNOS */}
                {configSubTab === 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <Box>
                        <Typography className="h4" color="var(--ink)">
                          Configuración de turnos de exhibidores
                        </Typography>
                        <Typography
                          style={{
                            fontSize: '13px',
                            color: 'var(--grey-600)',
                            marginTop: '4px',
                          }}
                        >
                          Define los turnos de exhibidores de la congregación
                          con sus días, horarios, y ubicaciones asociadas.
                        </Typography>
                      </Box>
                      <AppButton
                        variant="main"
                        disableAutoStretch
                        onClick={() => handleOpenTurnConfig()}
                        startIcon={<IconAdd />}
                      >
                        Añadir turno
                      </AppButton>
                    </Box>

                    {!settings?.turns || settings.turns.length === 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: 'var(--accent-100)',
                          border: '1px dashed var(--line)',
                          borderRadius: 'var(--shape-md)',
                          justifyContent: 'center',
                          py: '40px',
                        }}
                      >
                        <IconInfo color="var(--accent-main)" />
                        <Typography
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-dark)',
                            fontWeight: '600',
                          }}
                        >
                          No hay turnos configurados. Añade uno pulsando el
                          botón superior.
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            mobile: '1fr',
                            tablet: '1fr 1fr',
                            laptop: '1fr 1fr 1fr',
                          },
                          gap: '16px',
                          width: '100%',
                        }}
                      >
                        {settings.turns.map((turn) => {
                          return (
                            <Card
                              key={turn.id}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                p: '20px',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--shape-lg)',
                                boxShadow: 'none',
                                backgroundColor: 'var(--card)',
                                ...accentSurface('var(--accent-main)'),
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                }}
                              >
                                {/* Days Tags */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                  }}
                                >
                                  {turn.days.map((d) => {
                                    const dayName =
                                      weekdaysSpanish[weekdaysOrder.indexOf(d)];
                                    const dayNameCapitalized =
                                      dayName.charAt(0).toUpperCase() +
                                      dayName.slice(1);
                                    return (
                                      <Chip
                                        key={d}
                                        label={dayNameCapitalized}
                                        size="small"
                                        sx={{
                                          backgroundColor: 'var(--accent-100)',
                                          color: 'var(--accent-dark)',
                                          fontWeight: '700',
                                          fontSize: '12px',
                                          borderRadius: 'var(--shape-xs)',
                                        }}
                                      />
                                    );
                                  })}
                                </Box>

                                {/* Time Slot */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    mt: '4px',
                                  }}
                                >
                                  <IconCalendar
                                    width={18}
                                    height={18}
                                    color="var(--accent-main)"
                                  />
                                  <Typography className="h4" color="var(--ink)">
                                    {turn.startTime} - {turn.endTime}
                                  </Typography>
                                </Box>

                                {/* Default Location */}
                                {turn.defaultLocation && (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      mt: '4px',
                                    }}
                                  >
                                    <IconLocation
                                      width={16}
                                      height={16}
                                      color="var(--accent-main)"
                                    />
                                    <Typography
                                      style={{
                                        fontSize: '12px',
                                        color: 'var(--grey-600)',
                                      }}
                                    >
                                      Por defecto:{' '}
                                      <strong>{turn.defaultLocation}</strong>
                                    </Typography>
                                  </Box>
                                )}

                                {/* Enabled Locations */}
                                {turn.locations &&
                                  turn.locations.length > 0 && (
                                    <Box sx={{ mt: '8px' }}>
                                      <Typography
                                        style={{
                                          fontWeight: '700',
                                          fontSize: '12px',
                                          color: 'var(--grey-500)',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px',
                                          marginBottom: '4px',
                                        }}
                                      >
                                        Ubicaciones permitidas
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: '6px',
                                        }}
                                      >
                                        {turn.locations.map((loc) => (
                                          <Chip
                                            key={loc}
                                            label={loc}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              borderColor: 'var(--line)',
                                              color: 'var(--grey-600)',
                                              fontSize: '12px',
                                              height: '22px',
                                              borderRadius: 'var(--shape-xs)',
                                            }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  )}
                              </Box>

                              {/* Actions */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  gap: '8px',
                                  mt: '20px',
                                  borderTop: '1px solid var(--accent-150)',
                                  pt: '12px',
                                }}
                              >
                                {/* Eran <Button> de MUI con el color, el peso
                                    y el radio a mano, en una tarjeta donde el
                                    resto de los botones SÍ son de la app: dos
                                    juegos distintos a un centímetro. */}
                                <AppButton
                                  variant="secondary"
                                  disableAutoStretch
                                  onClick={() => handleOpenTurnConfig(turn)}
                                  startIcon={
                                    <IconSettings
                                      width={16}
                                      height={16}
                                      color="var(--accent-main)"
                                    />
                                  }
                                >
                                  Editar
                                </AppButton>
                                <AppButton
                                  variant="secondary"
                                  color="red"
                                  disableAutoStretch
                                  onClick={() =>
                                    handleDeleteGlobalTurn(turn.id)
                                  }
                                  startIcon={
                                    <IconDelete
                                      width={16}
                                      height={16}
                                      color="var(--red-main)"
                                    />
                                  }
                                >
                                  Eliminar
                                </AppButton>
                              </Box>
                            </Card>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}

                {/* SUB-PESTAÑA 2: RESPONSABLES */}
                {configSubTab === 2 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    <Box>
                      <Typography className="h4" color="var(--ink)">
                        Hermanos responsables de turno
                      </Typography>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: 'var(--grey-600)',
                          marginTop: '4px',
                        }}
                      >
                        Selecciona los hermanos habilitados que pueden ejercer
                        como coordinadores o responsables de los turnos de
                        exhibidores.
                      </Typography>
                    </Box>

                    {enabledExhibitorBrothers.filter(
                      (bro) => bro.person_data.male?.value === true
                    ).length === 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: 'var(--accent-100)',
                          border: '1px dashed var(--line)',
                          borderRadius: 'var(--shape-md)',
                          justifyContent: 'center',
                          py: '40px',
                        }}
                      >
                        <IconInfo color="var(--accent-main)" />
                        <Typography
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-dark)',
                            fontWeight: '600',
                          }}
                        >
                          No hay hermanos varones habilitados con el tick
                          &quot;Exhibidores&quot; en sus perfiles personales.
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            mobile: '1fr',
                            tablet: '1fr 1fr',
                            laptop: '1fr 1fr 1fr',
                          },
                          gap: '12px',
                          width: '100%',
                        }}
                      >
                        {enabledExhibitorBrothers
                          .filter((bro) => bro.person_data.male?.value === true)
                          .map((bro) => {
                            const isResponsible =
                              settings?.responsibles?.includes(
                                bro.person_uid
                              ) || false;
                            const name = personGetDisplayName(
                              bro,
                              displayNameEnabled,
                              fullnameOption
                            );
                            const initial = name.trim().charAt(0).toUpperCase();
                            return (
                              <Card
                                key={bro.person_uid}
                                sx={{
                                  padding: '16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  border: '1px solid var(--line)',
                                  borderRadius: 'var(--shape-sm)',
                                  boxShadow: 'none',
                                  backgroundColor: 'var(--card)',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: 'var(--shape-full)',
                                      backgroundColor: isResponsible
                                        ? 'var(--accent-150)'
                                        : 'var(--grey-100)',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    <Typography
                                      style={{
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        color: isResponsible
                                          ? 'var(--accent-dark)'
                                          : 'var(--grey-600)',
                                      }}
                                    >
                                      {initial}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    style={{
                                      fontWeight: '700',
                                      fontSize: '13px',
                                      color: 'var(--black)',
                                    }}
                                  >
                                    {name}
                                  </Typography>
                                </Box>
                                <FormControlLabel
                                  control={
                                    // El interruptor compartido de la app. Era el
                                    // de MUI en crudo con la pista repintada a
                                    // mano, asi que ni su forma ni su tamano
                                    // coincidian con los de Ajustes.
                                    <AppSwitch
                                      checked={isResponsible}
                                      onChange={() =>
                                        handleToggleResponsible(bro.person_uid)
                                      }
                                    />
                                  }
                                  label={
                                    isResponsible ? 'Responsable' : 'Habilitar'
                                  }
                                  labelPlacement="start"
                                  sx={{
                                    margin: 0,
                                    '& .MuiFormControlLabel-label': {
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      color: isResponsible
                                        ? 'var(--accent-main)'
                                        : 'var(--grey-500)',
                                      mr: '6px',
                                    },
                                  }}
                                />
                              </Card>
                            );
                          })}
                      </Box>
                    )}
                  </Box>
                )}

                {/* SUB-PESTAÑA 3: ASIGNACIONES FIJAS */}
                {configSubTab === 3 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    <Box>
                      <Typography className="h4" color="var(--ink)">
                        Asignaciones fijas por turno
                      </Typography>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: 'var(--grey-600)',
                          marginTop: '4px',
                        }}
                      >
                        Configura los 3 hermanos que normalmente asisten a cada
                        turno. Al inicializar un mes, estos hermanos se
                        pre-asignarán de forma automática.
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                      }}
                    >
                      {(() => {
                        const activeWeekdays = weekdaysOrder.filter((d) =>
                          settings?.turns?.some((t) => t.days.includes(d))
                        );

                        if (activeWeekdays.length === 0) {
                          return (
                            <Typography
                              sx={{
                                color: 'var(--grey-500)',
                                fontStyle: 'italic',
                                p: 2,
                              }}
                            >
                              No hay turnos creados. Configura primero tus
                              turnos globales.
                            </Typography>
                          );
                        }

                        return activeWeekdays.map((day) => {
                          const dayNameSpanish =
                            weekdaysSpanish[weekdaysOrder.indexOf(day)];
                          const dayLabelCapitalized =
                            dayNameSpanish.charAt(0).toUpperCase() +
                            dayNameSpanish.slice(1);
                          const turnsForDay =
                            settings?.turns?.filter((t) =>
                              t.days.includes(day)
                            ) || [];

                          return (
                            <Box key={day} sx={{ mb: '12px' }}>
                              <Typography
                                className="h4"
                                color="var(--ink)"
                                style={{ marginBottom: '16px' }}
                              >
                                {dayLabelCapitalized}
                              </Typography>

                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '16px',
                                }}
                              >
                                {turnsForDay.map((turn) => {
                                  const turnAssignments =
                                    settings.fixedAssignments?.filter(
                                      (f) =>
                                        f.turnId === turn.id && f.day === day
                                    ) || [];

                                  return (
                                    <Card
                                      key={turn.id}
                                      sx={{
                                        padding: '20px',
                                        border: '1px solid var(--line)',
                                        borderRadius: 'var(--shape-sm)',
                                        boxShadow: 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px',
                                        backgroundColor: 'var(--card)',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          borderColor: 'var(--line)',
                                          boxShadow:
                                            '0 4px 12px rgba(48, 108, 180, 0.04)',
                                        },
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          borderBottom:
                                            '1px solid var(--accent-150)',
                                          pb: '10px',
                                        }}
                                      >
                                        <IconCalendar
                                          width={18}
                                          height={18}
                                          color="var(--accent-main)"
                                        />
                                        <Typography
                                          style={{
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            color: 'var(--accent-dark)',
                                          }}
                                        >
                                          Horario: {turn.startTime} -{' '}
                                          {turn.endTime}
                                        </Typography>
                                      </Box>

                                      <Box
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns: {
                                            mobile: '1fr',
                                            tablet: '1fr 1fr 1fr',
                                          },
                                          gap: '20px',
                                        }}
                                      >
                                        {[0, 1, 2].map((idx) => {
                                          const assignment =
                                            turnAssignments.find((f, i) =>
                                              f.position !== undefined
                                                ? f.position === idx
                                                : i === idx
                                            );
                                          const currentVal =
                                            assignment?.personUid || '';
                                          const labelText =
                                            idx === 0
                                              ? 'Posición 1 (Responsable de turno)'
                                              : `Posición ${idx + 1}`;

                                          // Filter candidates: Posición 1 is only for configured responsibles
                                          const candidates =
                                            idx === 0
                                              ? enabledExhibitorBrothers.filter(
                                                  (bro) =>
                                                    settings?.responsibles?.includes(
                                                      bro.person_uid
                                                    )
                                                )
                                              : enabledExhibitorBrothers;

                                          return (
                                            <Box
                                              key={idx}
                                              sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                p: '12px',
                                                border:
                                                  '1px solid var(--accent-150)',
                                                borderRadius: 'var(--shape-sm)',
                                                backgroundColor:
                                                  'var(--accent-100)',
                                              }}
                                            >
                                              <Typography
                                                style={{
                                                  fontWeight: '800',
                                                  fontSize: '12px',
                                                  color: 'var(--accent-main)',
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.5px',
                                                }}
                                              >
                                                {labelText}
                                              </Typography>
                                              {/* Un buscador, no un desplegable.
                                                  Era un Select con la lista
                                                  entera de hermanos
                                                  habilitados —en una
                                                  congregación mediana pasan
                                                  de cien— sin agrupar y sin
                                                  forma de escribir: con el
                                                  dedo hay que arrastrar por
                                                  una lista de cien nombres
                                                  para encontrar uno. En
                                                  Reuniones el mismo acto ya
                                                  se hace escribiendo. */}
                                              <AutoComplete
                                                fullWidth
                                                // Sin etiqueta dentro: cada
                                                // columna ya se titula
                                                // "Posición 1/2/3" encima, así
                                                // que "Hermano" lo decía dos
                                                // veces — y en una columna de
                                                // un tercio de ancho ni
                                                // siquiera cabía: salía
                                                // recortada a "Herma…".
                                                placeholder="Buscar hermano…"
                                                options={candidates}
                                                value={
                                                  candidates.find(
                                                    (b) =>
                                                      b.person_uid ===
                                                      currentVal
                                                  ) ?? null
                                                }
                                                isOptionEqualToValue={(
                                                  o: PersonType,
                                                  v: PersonType
                                                ) =>
                                                  o.person_uid === v.person_uid
                                                }
                                                getOptionLabel={(
                                                  o: PersonType
                                                ) =>
                                                  personGetDisplayName(
                                                    o,
                                                    displayNameEnabled,
                                                    fullnameOption
                                                  )
                                                }
                                                onChange={(_, v) =>
                                                  handleFixedAssignmentChange(
                                                    turn.id,
                                                    day,
                                                    idx,
                                                    (v as PersonType)
                                                      ?.person_uid ?? ''
                                                  )
                                                }
                                                noOptionsText="Ningún hermano habilitado"
                                              />
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Card>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        });
                      })()}
                    </Box>
                  </Box>
                )}

                {/* SUB-PESTAÑA 4: DISPONIBILIDAD */}
                {configSubTab === 4 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    <Box>
                      <Typography className="h4" color="var(--ink)">
                        Matriz de disponibilidad de hermanos
                      </Typography>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: 'var(--grey-600)',
                          marginTop: '4px',
                        }}
                      >
                        Indica las preferencias de turnos de cada hermano. Esta
                        información se utilizará para sugerirte hermanos
                        recomendados al planificar cada semana.
                      </Typography>
                    </Box>

                    {(() => {
                      const columns: Array<{
                        key: string;
                        turnId: string;
                        day: string;
                        dayAbbrev: string;
                        dayIndex: number;
                        startTime: string;
                        endTime: string;
                      }> = [];

                      const dayAbbrevs: Record<string, string> = {
                        monday: 'Lun',
                        tuesday: 'Mar',
                        wednesday: 'Mié',
                        thursday: 'Jue',
                        friday: 'Vie',
                        saturday: 'Sáb',
                        sunday: 'Dom',
                      };

                      settings?.turns?.forEach((turn) => {
                        turn.days.forEach((day) => {
                          columns.push({
                            key: `${turn.id}_${day}`,
                            turnId: turn.id,
                            day,
                            dayAbbrev: dayAbbrevs[day] || day.slice(0, 3),
                            dayIndex: weekdaysOrder.indexOf(day),
                            startTime: turn.startTime,
                            endTime: turn.endTime,
                          });
                        });
                      });

                      columns.sort((a, b) => {
                        if (a.dayIndex !== b.dayIndex) {
                          return a.dayIndex - b.dayIndex;
                        }
                        return a.startTime.localeCompare(b.startTime);
                      });

                      if (columns.length === 0) {
                        return (
                          <Typography
                            sx={{
                              color: 'var(--grey-500)',
                              fontStyle: 'italic',
                              p: 2,
                            }}
                          >
                            No hay turnos creados. Configura primero tus turnos
                            globales.
                          </Typography>
                        );
                      }

                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {enabledExhibitorBrothers.map((bro) => {
                            const name = personGetDisplayName(
                              bro,
                              displayNameEnabled,
                              fullnameOption
                            );
                            const initial = name.trim().charAt(0).toUpperCase();
                            const pref =
                              settings?.availability?.[bro.person_uid] || [];

                            return (
                              <Box
                                key={bro.person_uid}
                                sx={{
                                  display: 'flex',
                                  flexDirection: {
                                    mobile: 'column',
                                    tablet: 'row',
                                  },
                                  alignItems: {
                                    mobile: 'flex-start',
                                    tablet: 'center',
                                  },
                                  justifyContent: 'space-between',
                                  p: '16px',
                                  border: '1px solid var(--line)',
                                  borderRadius: 'var(--shape-sm)',
                                  backgroundColor: 'var(--card)',
                                  gap: '16px',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: 'var(--line)',
                                    boxShadow:
                                      '0 4px 12px rgba(48, 108, 180, 0.04)',
                                  },
                                }}
                              >
                                {/* Izquierda: Nombre y Avatar */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: 'var(--shape-full)',
                                      backgroundColor: 'var(--accent-150)',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Typography
                                      style={{
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        color: 'var(--accent-dark)',
                                      }}
                                    >
                                      {initial}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    style={{
                                      fontWeight: '700',
                                      fontSize: '13px',
                                      color: 'var(--black)',
                                    }}
                                  >
                                    {name}
                                  </Typography>
                                </Box>

                                {/* Derecha: Chips interactivos de Disponibilidad */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    width: { mobile: '100%', tablet: 'auto' },
                                  }}
                                >
                                  {columns.map((col) => {
                                    const isChecked =
                                      pref.includes(col.key) ||
                                      pref.includes(col.turnId);
                                    return (
                                      <Box
                                        key={col.key}
                                        onClick={() =>
                                          handleToggleAvailability(
                                            bro.person_uid,
                                            col.key
                                          )
                                        }
                                        sx={{
                                          cursor: 'pointer',
                                          padding: '6px 14px',
                                          borderRadius: 'var(--shape-full)',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          userSelect: 'none',
                                          transition: 'all 0.2s ease-in-out',
                                          ...(isChecked
                                            ? {
                                                backgroundColor:
                                                  'var(--accent-150)',
                                                color: 'var(--accent-dark)',
                                                border:
                                                  '1px solid var(--accent-main)',
                                                '&:hover': {
                                                  backgroundColor:
                                                    'var(--state-selected-strong)',
                                                },
                                              }
                                            : {
                                                backgroundColor:
                                                  'var(--accent-100)',
                                                color: 'var(--grey-600)',
                                                border: '1px solid var(--line)',
                                                '&:hover': {
                                                  backgroundColor:
                                                    'var(--state-hover)',
                                                },
                                              }),
                                        }}
                                      >
                                        {isChecked ? (
                                          <IconCheck
                                            width={11}
                                            height={11}
                                            color="var(--accent-main)"
                                          />
                                        ) : (
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              width: '5px',
                                              height: '5px',
                                              borderRadius: 'var(--shape-full)',
                                              backgroundColor:
                                                'var(--grey-400)',
                                            }}
                                          />
                                        )}
                                        {`${col.dayAbbrev} ${col.startTime} - ${col.endTime}`}
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            );
                          })}
                          {enabledExhibitorBrothers.length === 0 && (
                            <Typography
                              sx={{
                                color: 'var(--grey-500)',
                                fontStyle: 'italic',
                                p: 2,
                              }}
                            >
                              No hay hermanos habilitados.
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* --- DIÁLOGO 1: EDICIÓN DE TURNO SEMANAL (ASIGNAR 3 HERMANOS) --- */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        maxWidth={false}
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '480px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--shape-xl)',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--pop-up-shadow)',
          },
        }}
        slotProps={{
          backdrop: {
            style: { backgroundColor: 'var(--accent-dark-overlay)' },
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--line)', pb: '12px' }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Asignar turno de exhibidor
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            mt: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {dialogWarnings.map((warning, wIdx) => (
            <InfoTip key={wIdx} isBig={false} color="warning" text={warning} />
          ))}

          {/* Toggle de Suspensión */}
          <SwitchWithLabel
            label="Suspender turno para esta semana"
            checked={editDialog.cancelled}
            onChange={(checked) =>
              setEditDialog({ ...editDialog, cancelled: checked })
            }
          />

          {!editDialog.cancelled && (
            <>
              {/* Asignación de 3 Hermanos */}
              {[0, 1, 2].map((idx) => {
                const currentVal = editDialog.assignments[idx]?.person || '';
                const labelText =
                  idx === 0
                    ? 'Posición 1 (Responsable de turno)'
                    : `Posición ${idx + 1}`;

                // Filter candidates: Posición 1 is only for configured responsibles
                const candidates =
                  idx === 0
                    ? enabledExhibitorBrothers.filter((bro) =>
                        settings?.responsibles?.includes(bro.person_uid)
                      )
                    : enabledExhibitorBrothers;

                // Filtrar hermanos recomendados (los que tienen este turno en su disponibilidad de preferencia para este día)
                const recommended = [];
                const others = [];

                // Obtener el día de la semana para esta fecha
                const [y, m, d] = editDialog.date.split('/').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayOfWeek = dateObj.getDay();
                const dayLabel =
                  weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

                for (const bro of candidates) {
                  const pref = settings?.availability?.[bro.person_uid] || [];
                  const matchesSpecific = pref.includes(
                    `${editDialog.turnId}_${dayLabel}`
                  );
                  const matchesFallback = pref.includes(editDialog.turnId);

                  if (matchesSpecific || matchesFallback) {
                    recommended.push(bro);
                  } else {
                    others.push(bro);
                  }
                }

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      borderBottom: '1px solid var(--accent-150)',
                      pb: '12px',
                    }}
                  >
                    <Typography
                      className="body-small-semibold"
                      sx={{ color: 'var(--ink-2)' }}
                    >
                      {labelText}
                    </Typography>

                    {/* Un buscador con los recomendados arriba, no un
                        desplegable. Agrupar ya ayudaba, pero seguía sin poder
                        escribirse: con más de cien hermanos habilitados hay
                        que recorrer la lista entera con el dedo. `groupBy`
                        conserva los dos apartados que ya había. */}
                    <AutoComplete
                      fullWidth
                      label="Hermano"
                      options={[...recommended, ...others]}
                      value={
                        [...recommended, ...others].find(
                          (b) => b.person_uid === currentVal
                        ) ?? null
                      }
                      isOptionEqualToValue={(o: PersonType, v: PersonType) =>
                        o.person_uid === v.person_uid
                      }
                      getOptionLabel={(o: PersonType) =>
                        personGetDisplayName(
                          o,
                          displayNameEnabled,
                          fullnameOption
                        )
                      }
                      groupBy={(o: PersonType) =>
                        recommended.some((r) => r.person_uid === o.person_uid)
                          ? 'Recomendados (tienen este turno de preferencia)'
                          : 'Otros hermanos habilitados'
                      }
                      onChange={(_, v) =>
                        handleAssignmentChange(
                          idx,
                          (v as PersonType)?.person_uid ?? ''
                        )
                      }
                      noOptionsText="Ningún hermano habilitado"
                    />
                  </Box>
                );
              })}

              {/* Ubicación Personalizada.
                  Sin `label`: este es un `Select` de MUI suelto, sin el
                  `FormControl` + `InputLabel` que hacen falta para que la
                  etiqueta se dibuje. La prop `label="Ubicación"` que tenía no
                  pintaba nada — solo reservaba hueco en un contorno que aquí
                  tampoco existe. El rótulo de verdad es el Typography de
                  encima, que es la convención de ESTE diálogo (y tiene que
                  serlo: "Días aplicables" rotula un grupo de casillas, y eso
                  no puede ir dentro de ningún campo). */}
              <Select
                value={editDialog.location}
                onChange={(e) =>
                  setEditDialog({ ...editDialog, location: e.target.value })
                }
                size="small"
                fullWidth
              >
                {settings?.turns
                  ?.find((t) => t.id === editDialog.turnId)
                  ?.locations?.map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
              </Select>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          {/* Botón para desvincular el override manual (destructivo/reset,
              separado a la izquierda — ver DESIGN_SYSTEM.md §6.1) */}
          {exhibitorsList.some(
            (w) =>
              w.weekOf === editDialog.weekOf &&
              w.turns?.some(
                (t) =>
                  t.turnId === editDialog.turnId && t.date === editDialog.date
              )
          ) && (
            <AppButton
              variant="secondary"
              color="red"
              disableAutoStretch
              onClick={handleResetWeekTurn}
              sx={{ marginRight: 'auto' }}
            >
              Restaurar fijos
            </AppButton>
          )}
          <AppButton
            variant="tertiary"
            disableAutoStretch
            onClick={() => setEditDialog({ ...editDialog, open: false })}
          >
            Cancelar
          </AppButton>
          <AppButton
            variant="main"
            disableAutoStretch
            disabled={isSavingTurn}
            onClick={handleSaveWeekTurn}
          >
            Guardar
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: Ajustes Mensuales (excepciones de horario/turnos). Mismo
          tratamiento que "Ajustes del mes" en predicacion_salidas — ver
          DESIGN_SYSTEM.md §6/§9. */}
      <Dialog
        open={publishDialog}
        onClose={() => setPublishDialog(false)}
        maxWidth="mobile"
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--shape-xl)',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--pop-up-shadow)',
          },
        }}
        slotProps={{
          backdrop: {
            style: { backgroundColor: 'var(--accent-dark-overlay)' },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            {monthIsPublished ? 'Retirar' : 'Publicar'}:{' '}
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            mt: '8px',
          }}
        >
          <InfoTip
            isBig={false}
            color={monthIsPublished ? 'warning' : 'info'}
            text={
              monthIsPublished
                ? 'Al retirarlo, este mes vuelve a ser un borrador: dejará de aparecer en las asignaciones de los hermanos y en el programa semanal.'
                : 'Al publicarlo, cada hermano verá sus turnos de este mes en "Mis asignaciones" y en el programa semanal, y recibirá el aviso correspondiente.'
            }
          />

          {!monthIsPublished && emptySlotsInMonth > 0 && (
            <InfoTip
              isBig={false}
              color="warning"
              text={`Hay ${emptySlotsInMonth} ${emptySlotsInMonth === 1 ? 'turno sin nadie asignado' : 'turnos sin nadie asignado'}. Puedes publicarlo igualmente si el resto ya está decidido.`}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          <AppButton
            variant="secondary"
            disableAutoStretch
            onClick={() => setPublishDialog(false)}
          >
            Cancelar
          </AppButton>
          <AppButton
            variant="main"
            color={monthIsPublished ? 'red' : 'primary'}
            disableAutoStretch
            onClick={handleTogglePublishMonth}
          >
            {monthIsPublished ? 'Retirar' : 'Publicar'}
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={monthlySettingsDialog}
        onClose={() => setMonthlySettingsDialog(false)}
        maxWidth="mobile"
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--shape-xl)',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--pop-up-shadow)',
          },
        }}
        slotProps={{
          backdrop: {
            style: { backgroundColor: 'var(--accent-dark-overlay)' },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Ajustes: {MONTH_NAMES[selectedMonth]} {selectedYear}
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            mt: '8px',
          }}
        >
          <InfoTip
            isBig={false}
            color={isCurrentlyOverridden ? 'warning' : 'info'}
            text={
              isCurrentlyOverridden
                ? 'Este mes tiene una configuración personalizada que sobrescribe la global.'
                : 'Usando configuración global. Si necesitas horarios diferentes este mes, personalízalos aquí.'
            }
          />

          <SwitchWithLabel
            label="Suspender exhibidores todo el mes"
            checked={monthCancelled}
            onChange={handleToggleCancelMonth}
          />

          {monthCancelled && (
            <TextField
              label="Texto adicional (opcional)"
              placeholder="Ej. Por la asamblea de circuito"
              value={cancelledMessageInput}
              onChange={(e) => setCancelledMessageInput(e.target.value)}
              onBlur={handleSaveCancelledMonthMessage}
              multiline
              minRows={2}
              fullWidth
              helperText='Sale debajo de "Los turnos de exhibidores están suspendidos este mes." en Programas semanales.'
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--shape-sm)',
                },
              }}
            />
          )}

          {!monthCancelled && (
            <Box sx={{ mt: '8px' }}>
              <Typography
                className="h4"
                sx={{ color: 'var(--ink)', mb: '12px' }}
              >
                Turnos activos este mes
              </Typography>

              {effectiveTurns.length === 0 ? (
                <Typography
                  className="body-small-regular"
                  sx={{ color: 'var(--ink-2)' }}
                >
                  No hay turnos.
                </Typography>
              ) : (
                <List
                  sx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {effectiveTurns.map((turn) => (
                    <Card
                      key={turn.id}
                      sx={{
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--shape-sm)',
                        boxShadow: 'none',
                        p: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--always-white)',
                      }}
                    >
                      <Box>
                        <Typography
                          className="body-regular-semibold"
                          sx={{ color: 'var(--ink)' }}
                        >
                          {turn.startTime} - {turn.endTime}
                        </Typography>
                        <Typography
                          className="body-small-regular"
                          sx={{ color: 'var(--ink-2)' }}
                        >
                          {turn.days
                            .map((d) => {
                              const idx = weekdaysOrder.indexOf(d);
                              return weekdaysSpanish[idx];
                            })
                            .join(', ')}
                        </Typography>
                      </Box>
                      {isCurrentlyOverridden && (
                        <Box sx={{ display: 'flex', gap: '8px' }}>
                          <AppButton
                            variant="tertiary"
                            disableAutoStretch
                            onClick={() => {
                              setTurnConfigDialog({
                                open: true,
                                id: turn.id,
                                days: turn.days,
                                startTime: turn.startTime,
                                endTime: turn.endTime,
                                locations: turn.locations,
                                defaultLocation: turn.defaultLocation,
                                newLocationText: '',
                                isMonthlyOverride: true,
                              });
                            }}
                          >
                            Editar
                          </AppButton>
                          <IconButton
                            aria-label="Eliminar el turno"
                            size="small"
                            onClick={() =>
                              handleDeleteGlobalTurn(turn.id, true)
                            }
                          >
                            <IconDelete color="var(--red-main)" />
                          </IconButton>
                        </Box>
                      )}
                    </Card>
                  ))}
                </List>
              )}

              {!isCurrentlyOverridden ? (
                <AppButton
                  variant="main"
                  onClick={handleCreateOverride}
                  sx={{ mt: '16px', width: '100%' }}
                >
                  Personalizar turnos para este mes
                </AppButton>
              ) : (
                <AppButton
                  variant="tertiary"
                  startIcon={<IconAdd />}
                  onClick={() => {
                    setTurnConfigDialog({
                      open: true,
                      id: '',
                      days: [],
                      startTime: '09:00',
                      endTime: '11:00',
                      locations: settings?.locations || [],
                      defaultLocation: settings?.locations?.[0] || '',
                      newLocationText: '',
                      isMonthlyOverride: true,
                    });
                  }}
                  sx={{ mt: '16px', width: '100%', borderStyle: 'dashed' }}
                >
                  Añadir turno excepcional
                </AppButton>
              )}
            </Box>
          )}
        </DialogContent>
        {/* "Restaurar a global" es la acción de reset (destructiva), separada
            a la izquierda; "Cerrar" es la única acción de confirmación — no
            hay un borrador pendiente que requiera un "Guardar" aparte aquí
            (los cambios de este diálogo se aplican al instante). */}
        <DialogActions
          sx={{ padding: '16px', justifyContent: 'space-between' }}
        >
          {isCurrentlyOverridden ? (
            <AppButton
              variant="secondary"
              color="red"
              disableAutoStretch
              onClick={handleRestoreGlobal}
            >
              Restaurar a global
            </AppButton>
          ) : (
            <Box /> // Spacer
          )}
          <AppButton
            variant="main"
            disableAutoStretch
            onClick={() => setMonthlySettingsDialog(false)}
          >
            Cerrar
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* --- DIÁLOGO 2: DIÁLOGO DE CONFIGURACIÓN GLOBAL O MENSUAL DE TURNO --- */}
      <Dialog
        open={turnConfigDialog.open}
        onClose={() =>
          setTurnConfigDialog({ ...turnConfigDialog, open: false })
        }
        maxWidth={false}
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--shape-xl)',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--pop-up-shadow)',
          },
        }}
        slotProps={{
          backdrop: {
            style: { backgroundColor: 'var(--accent-dark-overlay)' },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            {turnConfigDialog.id ? 'Editar turno' : 'Crear turno'}
          </Typography>
          {turnConfigDialog.isMonthlyOverride && (
            <Typography
              className="body-small-regular"
              sx={{ color: 'var(--accent-main)' }}
            >
              (excepción para este mes)
            </Typography>
          )}
        </DialogTitle>
        <DialogContent
          sx={{
            mt: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Días de la semana */}
          <Typography
            className="body-small-semibold"
            sx={{ color: 'var(--ink)' }}
          >
            Días aplicables
          </Typography>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}
          >
            {weekdaysOrder.map((day) => {
              const idx = weekdaysOrder.indexOf(day);
              const label = weekdaysSpanish[idx];
              const isChecked = turnConfigDialog.days.includes(day);

              return (
                <Checkbox
                  key={day}
                  checked={isChecked}
                  onChange={(_e, checked) => {
                    const updated = checked
                      ? [...turnConfigDialog.days, day]
                      : turnConfigDialog.days.filter((d) => d !== day);
                    setTurnConfigDialog({ ...turnConfigDialog, days: updated });
                  }}
                  label={label}
                />
              );
            })}
          </Box>

          {/* Horarios */}
          <Box sx={{ display: 'flex', gap: '16px' }}>
            {/* `minWidth: 0` en las dos columnas: `flex: 1` por sí solo NO
                deja encoger por debajo del ancho mínimo del contenido, y el
                TimePicker compartido es más ancho que el <input type="time">
                nativo que había antes. Sin esto el diálogo se desborda a lo
                ancho y sale una barra de desplazamiento horizontal. */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                className="label-small-semibold"
                sx={{ color: 'var(--ink-2)', mb: '4px' }}
              >
                Hora de inicio
              </Typography>
              {/* El `TimePicker` de la app, no `<TextField type="time">`.
                  Aquel es el control NATIVO del navegador: se ve distinto en
                  cada sistema operativo, y en la pantalla gemela —Salidas de
                  predicación— la misma hora de un turno ya se pide con este.
                  La misma acción se hacía de dos maneras según la pestaña. */}
              <TimePicker
                ampm={!hour24}
                value={generateDateFromTime(turnConfigDialog.startTime)}
                onChange={(nueva) => {
                  const h = String(nueva.getHours()).padStart(2, '0');
                  const m = String(nueva.getMinutes()).padStart(2, '0');
                  setTurnConfigDialog({
                    ...turnConfigDialog,
                    startTime: `${h}:${m}`,
                  });
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                className="label-small-semibold"
                sx={{ color: 'var(--ink-2)', mb: '4px' }}
              >
                Hora de finalización
              </Typography>
              <TimePicker
                ampm={!hour24}
                value={generateDateFromTime(turnConfigDialog.endTime)}
                onChange={(nueva) => {
                  const h = String(nueva.getHours()).padStart(2, '0');
                  const m = String(nueva.getMinutes()).padStart(2, '0');
                  setTurnConfigDialog({
                    ...turnConfigDialog,
                    endTime: `${h}:${m}`,
                  });
                }}
              />
            </Box>
          </Box>

          {/* Ubicaciones del Turno (Checkboxes de Ubicaciones Globales) */}
          <Typography
            className="body-small-semibold"
            sx={{ color: 'var(--ink)' }}
          >
            Ubicaciones habilitadas para el turno
          </Typography>
          {!settings?.locations || settings.locations.length === 0 ? (
            <InfoTip
              isBig={false}
              color="warning"
              text="No hay ubicaciones configuradas globales. Añade una rápidamente con el formulario inferior."
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                // Dos columnas SIEMPRE dejaban ~150px por ubicación en un
                // móvil, y un nombre como "La Paella (Calle Padre Manjón con
                // Avenida de Ronda)" se partía en cinco renglones con la
                // casilla flotando a media altura al lado. Las otras cinco
                // rejillas de esta pantalla ya bajaban a una columna en
                // móvil; esta era la única que no.
                gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' },
                gap: '4px',
                mb: '8px',
              }}
            >
              {settings.locations.map((loc) => {
                const isChecked = turnConfigDialog.locations.includes(loc);
                return (
                  <Checkbox
                    key={loc}
                    checked={isChecked}
                    onChange={(_e, checked) => {
                      const updated = checked
                        ? [...turnConfigDialog.locations, loc]
                        : turnConfigDialog.locations.filter((l) => l !== loc);

                      let defLoc = turnConfigDialog.defaultLocation;
                      if (!checked && defLoc === loc) {
                        defLoc = updated[0] || '';
                      } else if (checked && !defLoc) {
                        defLoc = loc;
                      }

                      setTurnConfigDialog({
                        ...turnConfigDialog,
                        locations: updated,
                        defaultLocation: defLoc,
                      });
                    }}
                    label={loc}
                  />
                );
              })}
            </Box>
          )}

          {/* Añadir ubicación rápida */}
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              mt: '4px',
              mb: '8px',
              alignItems: 'center',
            }}
          >
            <TextField
              // "Nueva ubicación rápida..." no cabía al lado del botón en un
              // móvil y se leía "Nueva ubicación ráp". Es el mismo campo que
              // el de la pestaña de Ubicaciones, que ya se llama así.
              placeholder="Nueva ubicación"
              value={turnConfigDialog.newLocationText}
              onChange={(e) =>
                setTurnConfigDialog({
                  ...turnConfigDialog,
                  newLocationText: e.target.value,
                })
              }
              size="small"
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--shape-sm)',
                },
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddLocation();
                }
              }}
            />
            <AppButton
              variant="tertiary"
              disableAutoStretch
              onClick={handleQuickAddLocation}
              startIcon={<IconAdd color="var(--accent-main)" />}
            >
              Añadir
            </AppButton>
          </Box>

          {/* Ubicación por Defecto */}
          {turnConfigDialog.locations.length > 0 && (
            <Box>
              <Typography
                className="label-small-semibold"
                sx={{ color: 'var(--ink-2)', mb: '4px' }}
              >
                Ubicación por defecto
              </Typography>
              <Select
                value={turnConfigDialog.defaultLocation}
                onChange={(e) =>
                  setTurnConfigDialog({
                    ...turnConfigDialog,
                    defaultLocation: e.target.value,
                  })
                }
                size="small"
                fullWidth
              >
                {turnConfigDialog.locations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          <AppButton
            variant="tertiary"
            disableAutoStretch
            onClick={() =>
              setTurnConfigDialog({ ...turnConfigDialog, open: false })
            }
          >
            Cancelar
          </AppButton>
          <AppButton
            variant="main"
            disableAutoStretch
            disabled={isSavingTurn}
            onClick={handleSaveGlobalTurn}
          >
            Guardar turno
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Exhibitors;
