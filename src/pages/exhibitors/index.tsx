import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Alert,
  MenuItem,
  Select,
  Checkbox,
  FormGroup,
  ListSubheader,
  Grid,
  Chip,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { useAtom, useAtomValue } from 'jotai';
import { useAppTranslation, useBreakpoints, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { Typography } from '@components/index';
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
} from '@components/icons';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import ExhibitorsPDF from '@views/exhibitors';
import { ExhibitorPDFCell, ExhibitorPDFTurnItem } from '@views/exhibitors/index.types';
import { ExhibitorWeekTurnType, ExhibitorSettingsType } from '@definition/exhibitors';
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
import { congNameState, displayNameMeetingsEnableState, fullnameOptionState, pdfExportEnabledState } from '@states/settings';
import { personsStateFind } from '@services/states/persons';
import { personGetDisplayName } from '@utils/common';
import { getEffectiveTurnsForMonth, getMonthCancelledMessage, isMonthCancelled } from '../../utils/exhibitors';

const weekdaysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekdaysSpanish = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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
    (val: ExhibitorSettingsType | null) => void
  ];

  // Cargar configuración por defecto en Jotai si está vacía
  useEffect(() => {
    if (!settings) {
      dbExhibitorsGetSettings().then(setSettings);
    }
  }, [settings, setSettings]);

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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [monthsExpanded, setMonthsExpanded] = useState<boolean>(false);
  const [plannerViewMode, setPlannerViewMode] = useState<'lista' | 'mensual'>('mensual');
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  // Inicializar selectedDayNum
  const initialSelectedDay = useMemo(() => {
    const today = new Date();
    if (today.getFullYear() === selectedYear && today.getMonth() === selectedMonth) {
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
    localSettings.monthlyOverrides[currentMonthStr] = structuredClone(settings.turns || []);
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

  // Forzar sincronización con la nube
  const handleForceSync = () => {
    worker.postMessage('startWorker');
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: t('tr_syncInProgress', 'Sincronización en curso...'),
      severity: 'success',
    });
  };



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
        const savedTurn = weekRecord?.turns?.find((t) => t.turnId === turn.id && t.date === dateStr);

        let finalAssignments = savedTurn?.assignments || [];
        const finalLocation = savedTurn?.location || turn.defaultLocation || 'Exhibidor';
        const finalCancelled = savedTurn?.cancelled || false;

        // Auto-asignación de turnos fijos si no hay registro específico de la semana
        if (!savedTurn) {
          const fixed = settings.fixedAssignments?.filter((f) => 
            f.turnId === turn.id && (!f.day || f.day === dayLabel)
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
      const uniqueWeeks = Array.from(new Set(generatedSlotsInMonth.map((s) => s.weekOf)));
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
        const weekSlots = generatedSlotsInMonth.filter((s) => s.weekOf === weekOf);
        let weekModified = false;

        for (const slot of weekSlots) {
          // Si el turno ya tiene asignaciones manuales locales (es decir, ya estaba guardado en IndexedDB), lo omitimos
          const alreadySaved = weekRecord.turns.some((t) => t.turnId === slot.turnId && t.date === slot.date);
          if (alreadySaved) continue;

          // Autocompletar con turnos fijos
          const fixed = settings.fixedAssignments?.filter((f) => 
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
          message: 'Todos los turnos de este mes ya se encuentran inicializados o editados.',
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
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
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
            const daySlots = generatedSlotsInMonth.filter((s) => s.date === dateStr);

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

      saveAs(blob, `Exhibidores_${monthNames[selectedMonth]}_${selectedYear}.pdf`);

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
  const handleOpenEditTurn = (slot: ExhibitorWeekTurnType & { weekOf: string }) => {
    if (!isServiceCommittee) return; // Sólo lectura para publicadores normales

    setEditDialog({
      open: true,
      weekOf: slot.weekOf,
      date: slot.date,
      turnId: slot.turnId,
      assignments: slot.assignments.length > 0 ? slot.assignments : [
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
      const cleanAssignments = editDialog.assignments.filter((a) => a.person !== '');

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

    const activeBrothers = editDialog.assignments.filter((a) => a.person !== '');
    if (activeBrothers.length > 0 && activeBrothers.length < 3) {
      warnings.push('Se recomienda asignar 3 hermanos para este turno.');
    }

    // Al menos 1 debe ser varón y responsable de turno
    const hasResponsible = activeBrothers.some((a) => {
      const isConfiguredResponsible = settings?.responsibles?.includes(a.person) || false;
      const personData = personsStateFind(a.person);
      const isMale = personData?.person_data.male || false;
      return a.isResponsible && isConfiguredResponsible && isMale;
    });

    if (activeBrothers.length > 0 && !hasResponsible) {
      warnings.push('Al menos uno de los hermanos asignados debe ser varón y estar designado como "Responsable de turno".');
    }

    return warnings;
  }, [editDialog, settings]);

  // Manejar cambio de asignado en el diálogo
  const handleAssignmentChange = (idx: number, personUid: string) => {
    const updated = [...editDialog.assignments];
    // Considerar responsable solo si el hermano está en la lista de responsables configurados
    const isConfiguredResponsible = settings?.responsibles?.includes(personUid) ?? false;
    updated[idx] = {
      person: personUid,
      isResponsible: isConfiguredResponsible,
    };

    setEditDialog({
      ...editDialog,
      assignments: updated,
    });
  };

  // --- CRUD CONFIGURACIÓN GLOBAL DE TURNOS ---

  // Eliminar un turno global o override mensual
  const handleDeleteGlobalTurn = async (turnId: string, isMonthlyOverride: boolean = false) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);

      if (isMonthlyOverride) {
        if (!localSettings.monthlyOverrides) return;
        const currentOverrides = localSettings.monthlyOverrides[currentMonthStr];
        if (Array.isArray(currentOverrides)) {
          localSettings.monthlyOverrides[currentMonthStr] = currentOverrides.filter((t) => t.id !== turnId);
        }
      } else {
        localSettings.turns = localSettings.turns.filter((t) => t.id !== turnId);
        localSettings.fixedAssignments = localSettings.fixedAssignments.filter((f) => f.turnId !== turnId);
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
  const handleOpenTurnConfig = (turn?: ExhibitorSettingsType['turns'][number]) => {
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
        message: 'Debe seleccionar al menos un día de la semana para este turno.',
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
        defaultLocation: turnConfigDialog.defaultLocation || turnConfigDialog.locations[0] || 'Exhibidor',
      };

      if (turnConfigDialog.isMonthlyOverride) {
        if (!localSettings.monthlyOverrides) localSettings.monthlyOverrides = {};
        let currentOverrides = localSettings.monthlyOverrides[currentMonthStr] || [];
        if (!Array.isArray(currentOverrides)) currentOverrides = [];
        const overridesArray = currentOverrides as ExhibitorTurnType[];

        if (turnConfigDialog.id) {
          localSettings.monthlyOverrides[currentMonthStr] = overridesArray.map((t) => (t.id === id ? updatedTurn : t));
        } else {
          localSettings.monthlyOverrides[currentMonthStr] = [...overridesArray, updatedTurn];
        }
      } else {
        if (turnConfigDialog.id) {
          localSettings.turns = localSettings.turns.map((t) => (t.id === id ? updatedTurn : t));
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

    const updatedLocations = (settings.locations || []).filter((l) => l !== loc);

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
        localSettings.responsibles = localSettings.responsibles.filter((id) => id !== personUid);
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
  const handleToggleAvailability = async (personUid: string, compositeKey: string) => {
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
      const updatedAssignments = normalizedAssignments.filter((f) => f.position !== idx);

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

      localSettings.fixedAssignments = [...otherAssignments, ...updatedAssignments];

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
        buttons={
          <>
            {isServiceCommittee && (
              <>
                <NavBarButton
                  text={activeTab === 'planner' ? 'Configuración' : 'Programa'}
                  onClick={() => setActiveTab(activeTab === 'planner' ? 'settings' : 'planner')}
                  icon={activeTab === 'planner' ? <IconSettings /> : <IconCalendar />}
                />
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
            <NavBarButton
              text={t('tr_publish', 'Publicar')}
              main
              onClick={handleForceSync}
              icon={<IconGroups />}
            />
          </>
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: desktopUp ? 'row' : 'column',
          gap: '24px',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {/* PANEL IZQUIERDO: Selector de Meses y Años */}
        {activeTab === 'planner' && (
          desktopUp ? (
            <Box
              sx={{
                width: '280px',
                flexShrink: 0,
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'sticky',
                top: 70,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Typography className="h3" style={{ color: 'var(--accent-main)' }}>
                  Seleccionar año
                </Typography>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  size="small"
                  fullWidth
                  sx={{
                    borderRadius: 'var(--radius-l)',
                    borderColor: 'var(--line)',
                  }}
                >
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map((yr) => (
                    <MenuItem key={yr} value={yr}>
                      {yr}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ borderTop: '1px solid var(--line)', my: '4px' }} />

              <Typography className="h3" style={{ color: 'var(--accent-main)' }}>
                Meses
              </Typography>
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {MONTH_NAMES.map((monthName, idx) => {
                  const isSelected = selectedMonth === idx;
                  return (
                    <ListItemButton
                      key={monthName}
                      selected={isSelected}
                      onClick={() => setSelectedMonth(idx)}
                      sx={{
                        borderRadius: 'var(--radius-l)',
                        borderLeft: isSelected ? '4px solid var(--accent-main)' : '4px solid transparent',
                        backgroundColor: isSelected ? 'var(--accent-150)' : 'transparent',
                        '&.Mui-selected': {
                          backgroundColor: 'var(--accent-150)',
                          '&:hover': {
                            backgroundColor: 'var(--line)',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'var(--accent-100)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={monthName}
                        primaryTypographyProps={{
                          style: {
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? 'var(--accent-dark)' : 'var(--black)',
                          },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ) : (
            <Card
              sx={{
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-l)',
                boxShadow: 'none',
                overflow: 'hidden',
                mb: '8px',
              }}
            >
              <ListItemButton
                onClick={() => setMonthsExpanded(!monthsExpanded)}
                sx={{
                  backgroundColor: 'var(--accent-100)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: '12px',
                  px: '16px',
                }}
              >
                <Typography style={{ fontWeight: '700', color: 'var(--accent-dark)', fontSize: '15px' }}>
                  {`${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                </Typography>
                <Typography style={{ fontSize: '13px', color: 'var(--accent-main)', fontWeight: '700' }}>
                  {monthsExpanded ? 'Cerrar selector ✕' : 'Cambiar mes ▾'}
                </Typography>
              </ListItemButton>

              {monthsExpanded && (
                <Box sx={{ p: '16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-main)' }}>
                      Seleccionar año
                    </Typography>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      size="small"
                      fullWidth
                    >
                      {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ borderTop: '1px solid var(--line)', my: '4px' }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-main)' }}>
                      Seleccionar mes
                    </Typography>
                    <Grid container spacing={1}>
                      {MONTH_NAMES.map((monthName, idx) => {
                        const isSelected = selectedMonth === idx;
                        return (
                          <Grid size={{ mobile: 4 }} key={monthName}>
                            <Button
                              variant={isSelected ? 'contained' : 'outlined'}
                              onClick={() => {
                                setSelectedMonth(idx);
                                setMonthsExpanded(false);
                              }}
                              fullWidth
                              size="small"
                              sx={{
                                py: '6px',
                                textTransform: 'none',
                                borderRadius: 'var(--radius-l)',
                                fontWeight: '600',
                                fontSize: '13px',
                                boxShadow: 'none',
                                ...(isSelected ? {
                                  backgroundColor: 'var(--accent-main)',
                                  color: 'var(--always-white)',
                                  '&:hover': {
                                    backgroundColor: 'var(--accent-dark)',
                                  }
                                } : {
                                  borderColor: 'var(--line)',
                                  color: 'var(--black)',
                                  '&:hover': {
                                    backgroundColor: 'var(--accent-100)',
                                  }
                                })
                              }}
                            >
                              {monthName}
                            </Button>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                </Box>
              )}
            </Card>
          )
        )}

        {/* PANEL PRINCIPAL */}
        <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
          {activeTab === 'planner' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* HEADER SIEMPRE VISIBLE */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexDirection: { mobile: 'column', tablet: 'row' }, gap: '16px', width: '100%' }}>
                <Typography className="h2" style={{ color: 'var(--accent-main)', margin: 0 }}>
                  {`Programa de exhibidores — ${MONTH_NAMES[selectedMonth].toLowerCase()} ${selectedYear}`}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant={isCurrentlyOverridden ? 'contained' : 'outlined'}
                    color="primary"
                    size="small"
                    onClick={() => setMonthlySettingsDialog(true)}
                    startIcon={<IconSettings color={isCurrentlyOverridden ? 'var(--always-white)' : 'var(--accent-main)'} width={18} height={18} />}
                    sx={{ 
                      borderRadius: 'var(--radius-l)', 
                      textTransform: 'none', 
                      fontWeight: 'bold', 
                      boxShadow: 'none',
                      height: '36px',
                      ...(isCurrentlyOverridden && {
                        backgroundColor: 'var(--orange-main)',
                        color: 'var(--always-white)',
                        '&:hover': {
                          backgroundColor: 'var(--orange-dark)',
                        }
                      })
                    }}
                  >
                    Ajustes del mes
                  </Button>

                  {/* Selector de modo de vista */}
                  <Box sx={{ display: 'flex', gap: '4px', backgroundColor: 'var(--accent-150)', padding: '4px', borderRadius: 'var(--radius-l)', border: '1px solid var(--line)', height: '36px', alignItems: 'center' }}>
                    <Button
                      onClick={() => setPlannerViewMode('lista')}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-s)',
                        py: '4px',
                        px: '16px',
                        fontSize: '13px',
                        boxShadow: 'none',
                        minWidth: 'unset',
                        ...(plannerViewMode === 'lista' ? {
                          backgroundColor: 'var(--accent-main)',
                          color: 'var(--always-white)',
                          '&:hover': { backgroundColor: 'var(--accent-dark)' }
                        } : {
                          color: 'var(--grey-600)',
                          '&:hover': { backgroundColor: 'var(--line)' }
                        })
                      }}
                    >
                      Lista
                    </Button>
                    <Button
                      onClick={() => setPlannerViewMode('mensual')}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-s)',
                        py: '4px',
                        px: '16px',
                        fontSize: '13px',
                        boxShadow: 'none',
                        minWidth: 'unset',
                        ...(plannerViewMode === 'mensual' ? {
                          backgroundColor: 'var(--accent-main)',
                          color: 'var(--always-white)',
                          '&:hover': { backgroundColor: 'var(--accent-dark)' }
                        } : {
                          color: 'var(--grey-600)',
                          '&:hover': { backgroundColor: 'var(--line)' }
                        })
                      }}
                    >
                      Cuadrícula
                    </Button>
                  </Box>
                </Box>
              </Box>

              {(!effectiveTurns || effectiveTurns.length === 0) ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '24px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-xl)',
                    justifyContent: 'center',
                  }}
                >
                  <IconInfo color="var(--grey-400)" />
                  <Typography sx={{ color: 'var(--grey-400)', fontWeight: '600' }}>
                    {monthCancelled ? 'Los exhibidores están suspendidos para este mes.' : 'No hay turnos configurados.'}
                  </Typography>
                </Box>
              ) : (
                /* Vista de Planificador (Grid/Lista) */
                <Box>

                  {plannerViewMode === 'lista' ? (
                    /* Vista de Lista */
                    (() => {
                      const dayMap = new Map<string, typeof generatedSlotsInMonth>();
                      for (const slot of generatedSlotsInMonth) {
                        const key = slot.date;
                        if (!dayMap.has(key)) dayMap.set(key, []);
                        dayMap.get(key)!.push(slot);
                      }

                      // Sort turns for each day chronologically by start time
                      for (const key of dayMap.keys()) {
                        dayMap.get(key)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
                      }

                      const weekMap = new Map<string, Array<{ dateKey: string; daySlots: typeof generatedSlotsInMonth }>>();
                      for (const [dateKey, daySlots] of dayMap.entries()) {
                        const weekOf = daySlots[0].weekOf;
                        if (!weekMap.has(weekOf)) weekMap.set(weekOf, []);
                        weekMap.get(weekOf)!.push({ dateKey, daySlots });
                      }

                      const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                      const getWeekLabel = (weekOfStr: string): string => {
                        const [year, month, day] = weekOfStr.split('/').map(Number);
                        const monday = new Date(year, month - 1, day);
                        const sunday = new Date(monday);
                        sunday.setDate(sunday.getDate() + 6);

                        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                        
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

                      const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                      const formatLegibleDate = (dateStr: string): string => {
                        const [year, month, day] = dateStr.split('/').map(Number);
                        const date = new Date(year, month - 1, day);
                        return `${weekdays[date.getDay()]} ${date.getDate()}`;
                      };

                      return sortedWeeks.map(([weekOf, days]) => {
                        const weekLabel = getWeekLabel(weekOf);
                        return (
                          <Box key={weekOf} sx={{ mb: '32px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                              <Typography
                                className="h3"
                                style={{
                                  fontWeight: '700',
                                  color: 'var(--accent-main)',
                                  textTransform: 'none',
                                  borderLeft: '4px solid var(--accent-main)',
                                  paddingLeft: '12px',
                                  margin: 0,
                                }}
                              >
                                {weekLabel}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {days.map(({ dateKey, daySlots }) => {
                                const dayLabel = formatLegibleDate(dateKey);

                                return (
                                  <Card
                                    key={dateKey}
                                    sx={{
                                      border: '1px solid var(--line)',
                                      borderRadius: 'var(--radius-l)',
                                      boxShadow: 'none',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        px: '16px',
                                        py: '10px',
                                        background: 'linear-gradient(135deg, var(--accent-main) 0%, var(--accent-dark) 100%)',
                                        borderBottom: '1px solid var(--accent-dark)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                    >
                                      <Typography
                                        className="label-small-semibold"
                                        style={{
                                          fontWeight: '700',
                                          color: 'var(--always-white)',
                                          textTransform: 'capitalize',
                                          letterSpacing: '0.02em',
                                          opacity: 0.92,
                                        }}
                                      >
                                        {dayLabel}
                                      </Typography>
                                    </Box>

                                    {daySlots.map((slot, idx) => {
                                      const isCancelled = slot.cancelled;
                                      const isAssigned = slot.assignments.length > 0;
                                      const assignedNames = slot.assignments
                                        .map((ass) => getBrotherDisplayName(ass.person))
                                        .filter(Boolean)
                                        .join(', ');

                                      return (
                                        <Box
                                          key={slot.id}
                                          onClick={() => handleOpenEditTurn(slot)}
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            px: '16px',
                                            py: '14px',
                                            borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                                            backgroundColor: isCancelled ? 'rgba(var(--red-main-base), 0.1)' : 'var(--card)',
                                            cursor: isServiceCommittee ? 'pointer' : 'default',
                                            transition: 'background-color 0.15s',
                                            '&:hover': isServiceCommittee ? {
                                              backgroundColor: isCancelled ? 'rgba(var(--red-main-base), 0.15)' : 'var(--accent-100)'
                                            } : {},
                                          }}
                                        >
                                          <Box sx={{ minWidth: '80px' }}>
                                            <Typography
                                              style={{
                                                fontWeight: '700',
                                                fontSize: '15px',
                                                color: isCancelled ? 'var(--grey-500)' : 'var(--accent-main)',
                                              }}
                                            >
                                              {slot.startTime}
                                            </Typography>
                                            <Typography
                                              style={{ fontSize: '12px', color: 'var(--grey-500)', fontWeight: '500' }}
                                            >
                                              {slot.endTime}
                                            </Typography>
                                          </Box>

                                          <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--line)' }} />

                                          <Box sx={{ flex: 1 }}>
                                            {isCancelled ? (
                                              <Chip
                                                icon={<IconCancelFilled color="var(--error-main)" />}
                                                label="Suspendido"
                                                size="small"
                                                sx={{
                                                  backgroundColor: 'var(--error-150)',
                                                  color: 'var(--error-dark)',
                                                  fontWeight: '600',
                                                }}
                                              />
                                            ) : (
                                              <Typography
                                                style={{
                                                  fontWeight: '600',
                                                  fontSize: '15px',
                                                  color: isAssigned ? 'var(--black)' : 'var(--error-main)',
                                                }}
                                              >
                                                {assignedNames || 'Sin asignar'}
                                              </Typography>
                                            )}
                                          </Box>

                                          <Box sx={{ textAlign: 'right', minWidth: '120px' }}>
                                            <Typography
                                              style={{
                                                fontSize: '13px',
                                                color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
                                              }}
                                            >
                                              {isCancelled ? '—' : slot.location}
                                            </Typography>
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
                          { dayOfWeek: 1, label: 'lun.', englishLabel: 'monday' },
                          { dayOfWeek: 2, label: 'mar.', englishLabel: 'tuesday' },
                          { dayOfWeek: 3, label: 'mié.', englishLabel: 'wednesday' },
                          { dayOfWeek: 4, label: 'jue.', englishLabel: 'thursday' },
                          { dayOfWeek: 5, label: 'vie.', englishLabel: 'friday' },
                          { dayOfWeek: 6, label: 'sáb.', englishLabel: 'saturday' },
                          { dayOfWeek: 0, label: 'dom.', englishLabel: 'sunday' },
                        ];

                        const activeDays = new Set<number>();
                        for (const slot of generatedSlotsInMonth) {
                          const [sYear, sMonth, sDay] = slot.date.split('/').map(Number);
                          const sDate = new Date(sYear, sMonth - 1, sDay);
                          activeDays.add(sDate.getDay());
                        }
                        const weekdaysToShow = weekdaysInfo.filter(info => activeDays.has(info.dayOfWeek));
                        const weekdaysToShowFinal = weekdaysToShow.length > 0 ? weekdaysToShow : weekdaysInfo;

                        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                        
                        const weekKeys = new Set<string>();
                        for (let d = 1; d <= daysInMonth; d++) {
                          const date = new Date(selectedYear, selectedMonth, d);
                          weekKeys.add(getWeekOfDate(date));
                        }
                        const sortedWeekKeys = Array.from(weekKeys).sort();

                        const cells: Array<{ type: 'empty'; id: string } | { type: 'day'; dayNum: number; date: Date }> = [];

                        for (const weekKey of sortedWeekKeys) {
                          const [wYear, wMonth, wDay] = weekKey.split('/').map(Number);
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
                            
                            if (cellDate.getMonth() === selectedMonth && cellDate.getFullYear() === selectedYear) {
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
                        const daySlotsMap = new Map<number, typeof generatedSlotsInMonth>();
                        for (const slot of generatedSlotsInMonth) {
                          const day = parseInt(slot.date.split('/')[2], 10);
                          if (!daySlotsMap.has(day)) {
                            daySlotsMap.set(day, []);
                          }
                          daySlotsMap.get(day)!.push(slot);
                        }

                        // Sort slots chronologically by start time for each day
                        for (const day of daySlotsMap.keys()) {
                          daySlotsMap.get(day)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
                        }

                        const formatLegibleDate = (date: Date): string => {
                          const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                          return `${weekdays[date.getDay()]} ${date.getDate()}`;
                        };

                        return (
                          <Box sx={{
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--line)',
                            backgroundColor: 'var(--card)',
                            p: { mobile: '12px', tablet: '20px' },
                            boxShadow: 'none',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}>
                            <Grid container spacing={1} columns={weekdaysToShowFinal.length} sx={{ width: '100%', margin: 0 }}>
                              {weekdaysToShowFinal.map((dayInfo) => (
                                <Grid size={{ mobile: 1 }} key={dayInfo.label} sx={{ p: 0.5 }}>
                                  <Box sx={{
                                    textAlign: 'center',
                                    py: '6px',
                                    borderBottom: '2px solid var(--line)',
                                    mb: '8px'
                                  }}>
                                    <Typography style={{ fontWeight: '700', fontSize: '12px', color: 'var(--accent-main)', textTransform: 'none' }}>
                                      {dayInfo.label}
                                    </Typography>
                                  </Box>
                                </Grid>
                              ))}
                              
                              {cells.map((cell) => {
                                if (cell.type === 'empty') {
                                  return (
                                    <Grid size={{ mobile: 1 }} key={cell.id} sx={{ p: 0.5 }}>
                                      <Box sx={{
                                        aspectRatio: desktopUp ? 'auto' : '1',
                                        minHeight: desktopUp ? '110px' : 'auto',
                                        backgroundColor: 'var(--accent-150)',
                                        border: '1px solid var(--line)',
                                        borderRadius: 'var(--radius-l)',
                                        opacity: 0.3
                                      }} />
                                    </Grid>
                                  );
                                }

                                const daySlots = daySlotsMap.get(cell.dayNum) || [];
                                const isSelected = selectedDayNum === cell.dayNum;

                                if (desktopUp) {
                                  // Desktop Calendar Cell
                                  return (
                                    <Grid size={{ mobile: 1 }} key={cell.dayNum} sx={{ p: 0.5 }}>
                                      <Box sx={{
                                        minHeight: '130px',
                                        backgroundColor: 'var(--card)',
                                        border: isSelected ? '2px solid var(--accent-main)' : '1px solid var(--line)',
                                        borderRadius: 'var(--radius-l)',
                                        p: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        height: '100%',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'none',
                                        '&:hover': {
                                          borderColor: 'var(--line)',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                                        }
                                      }}>
                                        <Typography style={{
                                          fontWeight: '800',
                                          fontSize: '14px',
                                          color: isSelected ? 'var(--accent-main)' : 'var(--grey-600)',
                                          margin: 0
                                        }}>
                                          {cell.dayNum}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                                          {daySlots.length === 0 ? (
                                            <Typography style={{ fontSize: '11px', color: 'var(--grey-400)', fontStyle: 'italic', marginTop: '4px' }}>
                                              sin turnos
                                            </Typography>
                                          ) : (
                                            daySlots.map((slot) => {
                                              const isCancelled = slot.cancelled;
                                              const hasAssignments = slot.assignments.some((ass) => ass.person !== '');

                                              let bgColor = 'var(--accent-150)';
                                              let textColor = 'var(--accent-dark)';
                                              let hoverBgColor = 'var(--accent-200)';
                                              
                                              if (isCancelled) {
                                                bgColor = 'rgba(var(--red-main-base), 0.1)';
                                                textColor = 'var(--error-dark)';
                                                hoverBgColor = 'rgba(var(--red-main-base), 0.15)';
                                              } else if (!hasAssignments) {
                                                bgColor = 'rgba(var(--orange-main-base), 0.1)';
                                                textColor = 'var(--orange-dark)';
                                                hoverBgColor = 'rgba(var(--orange-main-base), 0.15)';
                                              }

                                              return (
                                                <Box
                                                  key={slot.id}
                                                  onClick={() => handleOpenEditTurn(slot)}
                                                  sx={{
                                                    backgroundColor: bgColor,
                                                    color: textColor,
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-l)',
                                                    p: '6px 8px',
                                                    cursor: isServiceCommittee ? 'pointer' : 'default',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '2px',
                                                    transition: 'all 0.2s ease-in-out',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                                                    '&:hover': isServiceCommittee ? {
                                                      transform: 'translateY(-1px)',
                                                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                                      backgroundColor: hoverBgColor,
                                                    } : {}
                                                  }}
                                                >
                                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '800', fontSize: '12px', whiteSpace: 'nowrap', opacity: 0.9 }}>
                                                      {slot.startTime}
                                                    </span>
                                                    <span style={{ fontSize: '11px', opacity: 0.8, fontStyle: 'italic', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {slot.location}
                                                    </span>
                                                  </Box>
                                                  
                                                  {isCancelled ? (
                                                    <span style={{ fontSize: '12px', fontWeight: '700', textAlign: 'left', color: 'var(--error-dark)' }}>
                                                      Suspendido
                                                    </span>
                                                  ) : !hasAssignments ? (
                                                    <span style={{ fontSize: '12px', fontWeight: '700', textAlign: 'left', color: 'var(--orange-dark)' }}>
                                                      Sin asignar
                                                    </span>
                                                  ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', mt: '3px', width: '100%' }}>
                                                      {slot.assignments
                                                        .map((ass) => getBrotherDisplayName(ass.person))
                                                        .filter(Boolean)
                                                        .map((fullName, assIdx) => (
                                                          <span
                                                            key={assIdx}
                                                            style={{
                                                              fontSize: '12px',
                                                              fontWeight: '700',
                                                              textAlign: 'left',
                                                              lineHeight: '1.25',
                                                              wordBreak: 'break-word',
                                                              display: 'block',
                                                              width: '100%'
                                                            }}
                                                          >
                                                            {fullName}
                                                          </span>
                                                        ))}
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
                                    const isAssigned = slot.assignments.length > 0;
                                    if (isCancelled) return 'red';
                                    if (isAssigned) return 'green';
                                    return 'yellow';
                                  });

                                  return (
                                    <Grid size={{ mobile: 1 }} key={cell.dayNum} sx={{ p: 0.5 }}>
                                      <Box
                                        onClick={() => setSelectedDayNum(cell.dayNum)}
                                        sx={{
                                          aspectRatio: '1',
                                          backgroundColor: isSelected ? 'var(--accent-150)' : 'var(--card)',
                                          border: isSelected ? '2px solid var(--accent-main)' : '1px solid var(--line)',
                                          borderRadius: 'var(--radius-l)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease',
                                          '&:hover': {
                                            borderColor: 'var(--accent-main)',
                                          }
                                        }}
                                      >
                                        <Typography style={{
                                          fontWeight: '700',
                                          fontSize: '14px',
                                          color: isSelected ? 'var(--accent-dark)' : 'var(--grey-700)'
                                        }}>
                                          {cell.dayNum}
                                        </Typography>
                                        
                                        <Box sx={{ display: 'flex', gap: '3px', mt: '4px', flexWrap: 'wrap', justifyContent: 'center', px: '2px' }}>
                                          {dots.map((dotColor, idx) => (
                                            <Box
                                              key={idx}
                                              sx={{
                                                width: '5px',
                                                height: '5px',
                                                borderRadius: '50%',
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
                                    borderRadius: 'var(--radius-l)',
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
                                      style={{ fontWeight: '700', color: 'var(--accent-dark)', textTransform: 'none' }}
                                    >
                                      {(() => {
                                        const date = new Date(selectedYear, selectedMonth, selectedDayNum);
                                        return formatLegibleDate(date);
                                      })()}
                                    </Typography>
                                  </Box>

                                  {(() => {
                                    const selectedDaySlots = generatedSlotsInMonth.filter(
                                      (slot) => parseInt(slot.date.split('/')[2], 10) === selectedDayNum
                                    ).sort((a, b) => a.startTime.localeCompare(b.startTime));

                                    if (selectedDaySlots.length === 0) {
                                      return (
                                        <Box sx={{ p: '24px', textAlign: 'center' }}>
                                          <Typography style={{ color: 'var(--grey-500)', fontSize: '14px', fontStyle: 'italic' }}>
                                            No hay turnos programados para este día.
                                          </Typography>
                                        </Box>
                                      );
                                    }

                                    return selectedDaySlots.map((slot, idx) => {
                                      const isCancelled = slot.cancelled;
                                      const isAssigned = slot.assignments.length > 0;
                                      
                                      return (
                                        <Box
                                          key={slot.id}
                                          onClick={() => handleOpenEditTurn(slot)}
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            px: '16px',
                                            py: '14px',
                                            borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                                            backgroundColor: isCancelled ? 'rgba(var(--red-main-base), 0.1)' : 'var(--card)',
                                            cursor: isServiceCommittee ? 'pointer' : 'default',
                                            transition: 'background-color 0.15s',
                                            '&:hover': isServiceCommittee
                                              ? { backgroundColor: isCancelled ? 'rgba(var(--red-main-base), 0.15)' : 'var(--accent-100)' }
                                              : {},
                                          }}
                                        >
                                          <Box sx={{ minWidth: '80px' }}>
                                            <Typography
                                              style={{
                                                fontWeight: '700',
                                                fontSize: '15px',
                                                color: isCancelled ? 'var(--grey-500)' : 'var(--accent-main)',
                                              }}
                                            >
                                              {slot.startTime}
                                            </Typography>
                                            <Typography
                                              style={{ fontSize: '12px', color: 'var(--grey-500)', fontWeight: '500' }}
                                            >
                                              {slot.endTime}
                                            </Typography>
                                          </Box>

                                          <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--line)' }} />

                                          <Box sx={{ flex: 1 }}>
                                            {isCancelled ? (
                                              <Chip
                                                icon={<IconCancelFilled color="var(--error-main)" />}
                                                label="Suspendido"
                                                size="small"
                                                sx={{
                                                  backgroundColor: 'var(--error-150)',
                                                  color: 'var(--error-dark)',
                                                  fontWeight: '600',
                                                }}
                                              />
                                            ) : (
                                              <Typography
                                                style={{
                                                  fontWeight: '600',
                                                  fontSize: '14px',
                                                  color: isAssigned ? 'var(--black)' : 'var(--error-main)',
                                                }}
                                              >
                                                {slot.assignments.map((ass) => getBrotherDisplayName(ass.person)).filter(Boolean).join(', ') || 'Sin asignar'}
                                              </Typography>
                                            )}
                                          </Box>

                                          <Box sx={{ textAlign: 'right', minWidth: '100px' }}>
                                            <Typography
                                              style={{
                                                fontSize: '13px',
                                                color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
                                              }}
                                            >
                                              {isCancelled ? '—' : slot.location}
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
                borderRadius: 'var(--radius-xl)',
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
                  background: 'linear-gradient(135deg, var(--accent-main) 0%, var(--accent-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <IconSettings width={22} height={22} color="var(--always-white)" />
                <Typography
                  className="h3"
                  style={{ color: 'var(--always-white)', margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}
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
                sx={{
                  borderBottom: '1px solid var(--line)',
                  marginBottom: '24px',
                  width: '100%',
                  maxWidth: '100%',
                  '& .MuiTabs-scroller': {
                    overflowX: 'auto !important',
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'var(--accent-main)',
                  },
                  '& .MuiTab-root': {
                    fontWeight: '700',
                    color: 'var(--grey-600)',
                    fontSize: '13.5px',
                    minHeight: '48px',
                    py: '8px',
                    px: '16px',
                    '&.Mui-selected': {
                      color: 'var(--accent-main)',
                    },
                  },
                }}
              >
                <Tab label="UBICACIONES" />
                <Tab label="TURNOS" />
                <Tab label="RESPONSABLES" />
                <Tab label="ASIGNACIONES FIJAS" />
                <Tab label="DISPONIBILIDAD" />
              </Tabs>

              {/* SUB-PESTAÑA 0: UBICACIONES (GLOBAL) */}
              {configSubTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Ubicaciones de exhibidores
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Gestiona los puntos geográficos de predicación pública de la congregación. Luego podrás habilitar cuáles de estas ubicaciones aplican a cada turno global.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: '12px', maxWidth: '500px', width: '100%', flexDirection: { mobile: 'column', tablet: 'row' } }}>
                    <TextField
                      label="Nueva ubicación"
                      value={newExhibitorLocation}
                      onChange={(e) => setNewExhibitorLocation(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 'var(--radius-l)',
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddExhibitorLocation}
                      startIcon={<IconAdd color="var(--always-white)" />}
                      sx={{
                        backgroundColor: 'var(--accent-main)',
                        color: 'var(--always-white)',
                        borderRadius: 'var(--radius-l)',
                        boxShadow: 'none',
                        textTransform: 'none',
                        fontWeight: '700',
                        py: '8px',
                        px: '20px',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      Añadir
                    </Button>
                  </Box>

                  {(!settings?.locations || settings.locations.length === 0) ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--line)',
                        borderRadius: 'var(--radius-l)',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13px', color: 'var(--accent-dark)', fontWeight: '500' }}>
                        No hay ubicaciones de exhibidores configuradas. Añade una ubicación en el formulario superior.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
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
                            borderRadius: 'var(--radius-l)',
                            boxShadow: 'none',
                            backgroundColor: 'var(--card)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              borderColor: 'var(--accent-main)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 16px rgba(48, 108, 180, 0.08)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-main)' }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <Typography style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--black)' }}>
                              {loc}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => handleDeleteExhibitorLocation(loc)}
                            sx={{
                              color: 'var(--error-main)',
                              '&:hover': { backgroundColor: 'var(--error-light)' },
                            }}
                            size="small"
                          >
                            <IconDelete />
                          </IconButton>
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* SUB-PESTAÑA 1: TURNOS */}
              {configSubTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <Box>
                      <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                        Configuración de turnos de exhibidores
                      </Typography>
                      <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                        Define los turnos de exhibidores de la congregación con sus días, horarios, y ubicaciones asociadas.
                      </Typography>
                    </Box>
                     <Button
                      variant="contained"
                      onClick={() => handleOpenTurnConfig()}
                      startIcon={<IconAdd color="var(--always-white)" />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: '700',
                        backgroundColor: 'var(--accent-main)',
                        color: 'var(--always-white)',
                        borderRadius: 'var(--radius-l)',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                          boxShadow: 'none',
                        }
                      }}
                    >
                      Añadir turno
                    </Button>
                  </Box>

                  {(!settings?.turns || settings.turns.length === 0) ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--line)',
                        borderRadius: 'var(--radius-xl)',
                        justifyContent: 'center',
                        py: '40px',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13.5px', color: 'var(--accent-dark)', fontWeight: '600' }}>
                        No hay turnos configurados. Añade uno pulsando el botón superior.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
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
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--card)',
                              borderLeft: '4px solid var(--accent-main)',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                boxShadow: '0 6px 20px rgba(48, 108, 180, 0.08)',
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Days Tags */}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {turn.days.map((d) => {
                                  const dayName = weekdaysSpanish[weekdaysOrder.indexOf(d)];
                                  const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                  return (
                                    <Chip
                                      key={d}
                                      label={dayNameCapitalized}
                                      size="small"
                                      sx={{
                                        backgroundColor: 'var(--accent-100)',
                                        color: 'var(--accent-dark)',
                                        fontWeight: '700',
                                        fontSize: '11px',
                                        borderRadius: 'var(--radius-s)',
                                      }}
                                    />
                                  );
                                })}
                              </Box>

                              {/* Time Slot */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px' }}>
                                <IconCalendar width={18} height={18} color="var(--accent-main)" />
                                <Typography style={{ fontWeight: '800', fontSize: '15px', color: 'var(--accent-dark)' }}>
                                  {turn.startTime} - {turn.endTime}
                                </Typography>
                              </Box>

                              {/* Default Location */}
                              {turn.defaultLocation && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px' }}>
                                  <IconLocation width={16} height={16} color="var(--accent-main)" />
                                  <Typography style={{ fontSize: '12.5px', color: 'var(--grey-600)' }}>
                                    Por defecto: <strong>{turn.defaultLocation}</strong>
                                  </Typography>
                                </Box>
                              )}

                              {/* Enabled Locations */}
                              {turn.locations && turn.locations.length > 0 && (
                                <Box sx={{ mt: '8px' }}>
                                  <Typography style={{ fontWeight: '700', fontSize: '11px', color: 'var(--grey-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    Ubicaciones permitidas
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {turn.locations.map((loc) => (
                                      <Chip
                                        key={loc}
                                        label={loc}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          borderColor: 'var(--line)',
                                          color: 'var(--grey-600)',
                                          fontSize: '11px',
                                          height: '22px',
                                          borderRadius: 'var(--radius-s)',
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '20px', borderTop: '1px solid var(--accent-150)', pt: '12px' }}>
                              <Button
                                onClick={() => handleOpenTurnConfig(turn)}
                                size="small"
                                startIcon={<IconSettings width={16} height={16} color="var(--accent-main)" />}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: '700',
                                  color: 'var(--accent-main)',
                                  '&:hover': { backgroundColor: 'var(--accent-100)' },
                                  borderRadius: 'var(--radius-l)',
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                onClick={() => handleDeleteGlobalTurn(turn.id)}
                                size="small"
                                startIcon={<IconDelete width={16} height={16} color="var(--error-main)" />}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: '700',
                                  color: 'var(--error-main)',
                                  '&:hover': { backgroundColor: 'var(--error-light)' },
                                  borderRadius: 'var(--radius-l)',
                                }}
                              >
                                Eliminar
                              </Button>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Hermanos responsables de turno
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Selecciona los hermanos habilitados que pueden ejercer como coordinadores o responsables de los turnos de exhibidores.
                    </Typography>
                  </Box>

                  {enabledExhibitorBrothers.filter((bro) => bro.person_data.male?.value === true).length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--line)',
                        borderRadius: 'var(--radius-xl)',
                        justifyContent: 'center',
                        py: '40px',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13.5px', color: 'var(--accent-dark)', fontWeight: '600' }}>
                        No hay hermanos varones habilitados con el tick &quot;Exhibidores&quot; en sus perfiles personales.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
                        gap: '12px',
                        width: '100%',
                      }}
                    >
                      {enabledExhibitorBrothers.filter((bro) => bro.person_data.male?.value === true).map((bro) => {
                        const isResponsible = settings?.responsibles?.includes(bro.person_uid) || false;
                        const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
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
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--card)',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                boxShadow: '0 6px 16px rgba(48, 108, 180, 0.06)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Box
                                sx={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: isResponsible ? 'var(--accent-150)' : 'var(--grey-100)',
                                  border: `1px solid ${isResponsible ? 'var(--line)' : 'var(--grey-300)'}`,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Typography style={{ fontWeight: '800', fontSize: '12px', color: isResponsible ? 'var(--accent-dark)' : 'var(--grey-600)' }}>
                                  {initial}
                                </Typography>
                              </Box>
                              <Typography style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--black)' }}>
                                {name}
                              </Typography>
                            </Box>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={isResponsible}
                                  onChange={() => handleToggleResponsible(bro.person_uid)}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: 'var(--accent-main)',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: 'var(--accent-main)',
                                    },
                                  }}
                                />
                              }
                              label={isResponsible ? 'Responsable' : 'Habilitar'}
                              labelPlacement="start"
                              sx={{
                                margin: 0,
                                '& .MuiFormControlLabel-label': {
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: isResponsible ? 'var(--accent-main)' : 'var(--grey-500)',
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Asignaciones fijas por turno
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Configura los 3 hermanos que normalmente asisten a cada turno. Al inicializar un mes, estos hermanos se pre-asignarán de forma automática.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {(() => {
                      const activeWeekdays = weekdaysOrder.filter((d) =>
                        settings?.turns?.some((t) => t.days.includes(d))
                      );

                      if (activeWeekdays.length === 0) {
                        return (
                          <Typography sx={{ color: 'var(--grey-500)', fontStyle: 'italic', p: 2 }}>
                            No hay turnos creados. Configura primero tus turnos globales.
                          </Typography>
                        );
                      }

                      return activeWeekdays.map((day) => {
                        const dayNameSpanish = weekdaysSpanish[weekdaysOrder.indexOf(day)];
                        const dayLabelCapitalized = dayNameSpanish.charAt(0).toUpperCase() + dayNameSpanish.slice(1);
                        const turnsForDay = settings?.turns?.filter((t) => t.days.includes(day)) || [];

                        return (
                          <Box key={day} sx={{ mb: '12px' }}>
                            <Typography
                              style={{
                                fontWeight: '800',
                                fontSize: '15px',
                                color: 'var(--accent-main)',
                                borderLeft: '4px solid var(--accent-main)',
                                paddingLeft: '12px',
                                marginBottom: '16px',
                              }}
                            >
                              {dayLabelCapitalized}
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {turnsForDay.map((turn) => {
                                const turnAssignments = settings.fixedAssignments?.filter(
                                  (f) => f.turnId === turn.id && f.day === day
                                ) || [];

                                return (
                                  <Card
                                    key={turn.id}
                                    sx={{
                                      padding: '20px',
                                      border: '1px solid var(--line)',
                                      borderRadius: 'var(--radius-l)',
                                      boxShadow: 'none',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '16px',
                                      backgroundColor: 'var(--card)',
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        borderColor: 'var(--line)',
                                        boxShadow: '0 4px 12px rgba(48, 108, 180, 0.04)',
                                      }
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--accent-150)', pb: '10px' }}>
                                      <IconCalendar width={18} height={18} color="var(--accent-main)" />
                                      <Typography style={{ fontWeight: '800', fontSize: '14px', color: 'var(--accent-dark)' }}>
                                        Horario: {turn.startTime} - {turn.endTime}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr 1fr' }, gap: '20px' }}>
                                      {[0, 1, 2].map((idx) => {
                                        const assignment = turnAssignments.find((f, i) =>
                                          f.position !== undefined ? f.position === idx : i === idx
                                        );
                                        const currentVal = assignment?.personUid || '';
                                        const labelText = idx === 0 ? 'Posición 1 (Responsable de turno)' : `Posición ${idx + 1}`;

                                        // Filter candidates: Posición 1 is only for configured responsibles
                                        const candidates = idx === 0
                                          ? enabledExhibitorBrothers.filter((bro) => settings?.responsibles?.includes(bro.person_uid))
                                          : enabledExhibitorBrothers;

                                        return (
                                          <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: '8px', p: '12px', border: '1px solid var(--accent-150)', borderRadius: 'var(--radius-l)', backgroundColor: 'var(--accent-50)' }}>
                                            <Typography style={{ fontWeight: '800', fontSize: '11px', color: 'var(--accent-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                              {labelText}
                                            </Typography>
                                            <Select
                                              value={currentVal}
                                              onChange={(e) => handleFixedAssignmentChange(turn.id, day, idx, e.target.value)}
                                              size="small"
                                              displayEmpty
                                              fullWidth
                                              sx={{
                                                backgroundColor: 'var(--card)',
                                                borderRadius: 'var(--radius-l)',
                                              }}
                                            >
                                              <MenuItem value="">
                                                <em>Vacío / sin asignar</em>
                                              </MenuItem>
                                              {candidates.map((bro) => {
                                                const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
                                                return (
                                                  <MenuItem key={bro.person_uid} value={bro.person_uid}>
                                                    {name}
                                                  </MenuItem>
                                                );
                                              })}
                                            </Select>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Matriz de disponibilidad de hermanos
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Indica las preferencias de turnos de cada hermano. Esta información se utilizará para sugerirte hermanos recomendados al planificar cada semana.
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
                      sunday: 'Dom'
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
                        <Typography sx={{ color: 'var(--grey-500)', fontStyle: 'italic', p: 2 }}>
                          No hay turnos creados. Configura primero tus turnos globales.
                        </Typography>
                      );
                    }

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {enabledExhibitorBrothers.map((bro) => {
                          const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
                          const initial = name.trim().charAt(0).toUpperCase();
                          const pref = settings?.availability?.[bro.person_uid] || [];

                          return (
                            <Box
                              key={bro.person_uid}
                              sx={{
                                display: 'flex',
                                flexDirection: { mobile: 'column', tablet: 'row' },
                                alignItems: { mobile: 'flex-start', tablet: 'center' },
                                justifyContent: 'space-between',
                                p: '16px',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--radius-l)',
                                backgroundColor: 'var(--card)',
                                gap: '16px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: 'var(--line)',
                                  boxShadow: '0 4px 12px rgba(48, 108, 180, 0.04)',
                                }
                              }}
                            >
                              {/* Izquierda: Nombre y Avatar */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Box
                                  sx={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--accent-150)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Typography style={{ fontWeight: '800', fontSize: '12px', color: 'var(--accent-dark)' }}>
                                    {initial}
                                  </Typography>
                                </Box>
                                <Typography style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--black)' }}>
                                  {name}
                                </Typography>
                              </Box>

                              {/* Derecha: Chips interactivos de Disponibilidad */}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: { mobile: '100%', tablet: 'auto' } }}>
                                {columns.map((col) => {
                                  const isChecked = pref.includes(col.key) || pref.includes(col.turnId);
                                  return (
                                    <Box
                                      key={col.key}
                                      onClick={() => handleToggleAvailability(bro.person_uid, col.key)}
                                      sx={{
                                        cursor: 'pointer',
                                        padding: '6px 14px',
                                        borderRadius: '100px',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        userSelect: 'none',
                                        transition: 'all 0.2s ease-in-out',
                                        ...(isChecked ? {
                                          backgroundColor: 'var(--accent-150)',
                                          color: 'var(--accent-dark)',
                                          border: '1px solid var(--accent-main)',
                                          '&:hover': {
                                            backgroundColor: 'var(--line)',
                                            transform: 'translateY(-1px)',
                                          }
                                        } : {
                                          backgroundColor: 'var(--accent-50)',
                                          color: 'var(--grey-600)',
                                          border: '1px solid var(--line)',
                                          '&:hover': {
                                            backgroundColor: 'var(--accent-100)',
                                            borderColor: 'var(--line)',
                                            transform: 'translateY(-1px)',
                                          }
                                        })
                                      }}
                                    >
                                      {isChecked ? (
                                        <span style={{ fontSize: '11px', color: 'var(--accent-main)', fontWeight: '800' }}>✓</span>
                                      ) : (
                                        <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--grey-400)' }} />
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
                          <Typography sx={{ color: 'var(--grey-500)', fontStyle: 'italic', p: 2 }}>
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
        PaperProps={{ style: { borderRadius: 'var(--radius-xl)', maxWidth: '480px', width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: '800', borderBottom: '1px solid var(--line)', pb: '12px' }}>
          Asignar Turno de Exhibidor
        </DialogTitle>
        <DialogContent sx={{ mt: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {dialogWarnings.map((warning, wIdx) => (
            <Alert key={wIdx} severity="warning" sx={{ borderRadius: 'var(--radius-l)', fontWeight: '600' }}>
              {warning}
            </Alert>
          ))}

          {/* Toggle de Suspensión */}
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.cancelled}
                onChange={(e) => setEditDialog({ ...editDialog, cancelled: e.target.checked })}
                color="error"
              />
            }
            label={<strong>Suspender turno para esta semana</strong>}
          />

          {!editDialog.cancelled && (
            <>
              {/* Asignación de 3 Hermanos */}
              {[0, 1, 2].map((idx) => {
                const currentVal = editDialog.assignments[idx]?.person || '';
                const labelText = idx === 0 ? 'Posición 1 (Responsable de turno)' : `Posición ${idx + 1}`;

                // Filter candidates: Posición 1 is only for configured responsibles
                const candidates = idx === 0
                  ? enabledExhibitorBrothers.filter((bro) => settings?.responsibles?.includes(bro.person_uid))
                  : enabledExhibitorBrothers;

                // Filtrar hermanos recomendados (los que tienen este turno en su disponibilidad de preferencia para este día)
                const recommended = [];
                const others = [];

                // Obtener el día de la semana para esta fecha
                const [y, m, d] = editDialog.date.split('/').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayOfWeek = dateObj.getDay();
                const dayLabel = weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

                for (const bro of candidates) {
                  const pref = settings?.availability?.[bro.person_uid] || [];
                  const matchesSpecific = pref.includes(`${editDialog.turnId}_${dayLabel}`);
                  const matchesFallback = pref.includes(editDialog.turnId);

                  if (matchesSpecific || matchesFallback) {
                    recommended.push(bro);
                  } else {
                    others.push(bro);
                  }
                }

                return (
                  <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--accent-150)', pb: '12px' }}>
                    <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--grey-600)' }}>
                      {labelText}
                    </Typography>

                    <Select
                      value={currentVal}
                      onChange={(e) => handleAssignmentChange(idx, e.target.value)}
                      size="small"
                      displayEmpty
                      fullWidth
                    >
                      <MenuItem value="">
                        <em>Ninguno / Sin asignar</em>
                      </MenuItem>
                      {recommended.length > 0 && (
                        <ListSubheader sx={{ fontWeight: '800', lineHeight: '30px', color: 'var(--accent-dark)' }}>
                          RECOMENDADOS (Tienen este turno de preferencia)
                        </ListSubheader>
                      )}
                      {recommended.map((bro) => {
                        const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
                        return (
                          <MenuItem key={bro.person_uid} value={bro.person_uid}>
                            {name}
                          </MenuItem>
                        );
                      })}
                      {others.length > 0 && (
                        <ListSubheader sx={{ fontWeight: '800', lineHeight: '30px', color: 'var(--grey-600)' }}>
                          OTROS HERMANOS HABILITADOS
                        </ListSubheader>
                      )}
                      {others.map((bro) => {
                        const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
                        return (
                          <MenuItem key={bro.person_uid} value={bro.person_uid}>
                            {name}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </Box>
                );
              })}

              {/* Ubicación Personalizada */}
              <Select
                value={editDialog.location}
                onChange={(e) => setEditDialog({ ...editDialog, location: e.target.value })}
                size="small"
                fullWidth
                label="Ubicación"
              >
                {settings?.turns?.find((t) => t.id === editDialog.turnId)?.locations?.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          {/* Botón para desvincular el override manual */}
          {exhibitorsList.some(w => w.weekOf === editDialog.weekOf && w.turns?.some(t => t.turnId === editDialog.turnId && t.date === editDialog.date)) && (
            <Button
              onClick={handleResetWeekTurn}
              sx={{ color: 'var(--error-main)', fontWeight: '600', textTransform: 'none', marginRight: 'auto' }}
            >
              Restaurar Fijos
            </Button>
          )}
          <Button
            onClick={() => setEditDialog({ ...editDialog, open: false })}
            sx={{ color: 'var(--grey-600)', fontWeight: '600', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveWeekTurn}
            disabled={isSavingTurn}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-l)',
            }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: Ajustes Mensuales */}
      <Dialog
        open={monthlySettingsDialog}
        onClose={() => setMonthlySettingsDialog(false)}
        maxWidth="mobile"
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{ style: { borderRadius: 'var(--radius-xl)' } }}
      >
        <DialogTitle sx={{ fontWeight: '700', paddingBottom: '8px' }}>
          Ajustes: {MONTH_NAMES[selectedMonth]} {selectedYear}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px', mt: '8px' }}>
          {isCurrentlyOverridden ? (
            <Alert severity="warning" sx={{ borderRadius: 'var(--radius-l)' }}>
              Este mes tiene una configuración personalizada que sobreescribe la Global.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 'var(--radius-l)' }}>
              Usando Configuración Global. Si necesitas horarios diferentes este mes, personalízalos aquí.
            </Alert>
          )}

          <FormGroup sx={{ mt: '8px' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={monthCancelled}
                  onChange={handleToggleCancelMonth}
                  color="error"
                />
              }
              label={
                <Typography sx={{ fontWeight: '600', color: monthCancelled ? 'var(--error-main)' : 'var(--black)' }}>
                  Suspender exhibidores todo el mes
                </Typography>
              }
            />
          </FormGroup>

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
                  borderRadius: 'var(--radius-l)',
                },
              }}
            />
          )}

          {!monthCancelled && (
            <Box sx={{ mt: '8px' }}>
              <Typography sx={{ fontWeight: '700', fontSize: '14px', mb: '12px' }}>
                Turnos activos este mes
              </Typography>
              
              {effectiveTurns.length === 0 ? (
                <Typography sx={{ color: 'var(--grey-500)', fontSize: '14px' }}>No hay turnos.</Typography>
              ) : (
                <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {effectiveTurns.map((turn) => (
                    <Card
                      key={turn.id}
                      sx={{
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-l)',
                        boxShadow: 'none',
                        p: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--always-white)'
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: '700', fontSize: '15px' }}>
                          {turn.startTime} - {turn.endTime}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--grey-500)' }}>
                          {turn.days.map((d) => {
                            const idx = weekdaysOrder.indexOf(d);
                            return weekdaysSpanish[idx];
                          }).join(', ')}
                        </Typography>
                      </Box>
                      {isCurrentlyOverridden && (
                        <Box sx={{ display: 'flex', gap: '8px' }}>
                          <Button
                            size="small"
                            variant="outlined"
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
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteGlobalTurn(turn.id, true)}
                          >
                            <IconDelete />
                          </IconButton>
                        </Box>
                      )}
                    </Card>
                  ))}
                </List>
              )}

              {!isCurrentlyOverridden ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCreateOverride}
                  sx={{ mt: '16px', borderRadius: 'var(--radius-l)', textTransform: 'none', fontWeight: 'bold' }}
                >
                  Personalizar turnos para este mes
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
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
                  sx={{ mt: '16px', borderRadius: 'var(--radius-l)', textTransform: 'none', fontWeight: 'bold', borderStyle: 'dashed' }}
                >
                  Añadir turno excepcional
                </Button>
              )}
            </Box>
          )}

        </DialogContent>
        <DialogActions sx={{ padding: '16px', justifyContent: 'space-between' }}>
          {isCurrentlyOverridden ? (
            <Button
              color="error"
              onClick={handleRestoreGlobal}
              sx={{ fontWeight: '600', textTransform: 'none' }}
            >
              Restaurar al Global
            </Button>
          ) : (
            <Box /> // Spacer
          )}
          <Button
            onClick={() => setMonthlySettingsDialog(false)}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              color: 'var(--always-white)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-l)',
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIÁLOGO 2: DIÁLOGO DE CONFIGURACIÓN GLOBAL O MENSUAL DE TURNO --- */}
      <Dialog
        open={turnConfigDialog.open}
        onClose={() => setTurnConfigDialog({ ...turnConfigDialog, open: false })}
        maxWidth={false}
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{ style: { borderRadius: 'var(--radius-xl)' } }}
      >
        <DialogTitle sx={{ fontWeight: '700', paddingBottom: '8px' }}>
          {turnConfigDialog.id ? 'Editar turno' : 'Crear turno'}
          {turnConfigDialog.isMonthlyOverride && (
            <Typography variant="body2" sx={{ color: 'var(--accent-main)', fontWeight: 'bold' }}>
              (Excepción para este mes)
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Días de la semana */}
          <Typography style={{ fontWeight: '700', fontSize: '13.5px' }}>Días aplicables</Typography>
          <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {weekdaysOrder.map((day) => {
              const idx = weekdaysOrder.indexOf(day);
              const label = weekdaysSpanish[idx];
              const isChecked = turnConfigDialog.days.includes(day);

              return (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...turnConfigDialog.days, day]
                          : turnConfigDialog.days.filter((d) => d !== day);
                        setTurnConfigDialog({ ...turnConfigDialog, days: updated });
                      }}
                    />
                  }
                  label={label}
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '13px', fontWeight: '500' } }}
                />
              );
            })}
          </FormGroup>

          {/* Horarios */}
          <Box sx={{ display: 'flex', gap: '16px' }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: '700', fontSize: '12px', color: 'var(--grey-600)', mb: '4px' }}>Hora de inicio</Typography>
              <TextField
                type="time"
                value={turnConfigDialog.startTime}
                onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, startTime: e.target.value })}
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-l)',
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: '700', fontSize: '12px', color: 'var(--grey-600)', mb: '4px' }}>Hora de finalización</Typography>
              <TextField
                type="time"
                value={turnConfigDialog.endTime}
                onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, endTime: e.target.value })}
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-l)',
                  }
                }}
              />
            </Box>
          </Box>

          {/* Ubicaciones del Turno (Checkboxes de Ubicaciones Globales) */}
          <Typography style={{ fontWeight: '700', fontSize: '13.5px' }}>Ubicaciones habilitadas para el turno</Typography>
          {(!settings?.locations || settings.locations.length === 0) ? (
            <Alert severity="warning" sx={{ borderRadius: 'var(--radius-l)', fontWeight: '600', mb: '8px' }}>
              No hay ubicaciones configuradas globales. Añade una rápidamente con el formulario inferior.
            </Alert>
          ) : (
            <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', mb: '8px' }}>
              {settings.locations.map((loc) => {
                const isChecked = turnConfigDialog.locations.includes(loc);
                return (
                  <FormControlLabel
                    key={loc}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...turnConfigDialog.locations, loc]
                            : turnConfigDialog.locations.filter((l) => l !== loc);
                          
                          let defLoc = turnConfigDialog.defaultLocation;
                          if (!e.target.checked && defLoc === loc) {
                            defLoc = updated[0] || '';
                          } else if (e.target.checked && !defLoc) {
                            defLoc = loc;
                          }

                          setTurnConfigDialog({
                            ...turnConfigDialog,
                            locations: updated,
                            defaultLocation: defLoc,
                          });
                        }}
                      />
                    }
                    label={loc}
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '13px', fontWeight: '500' } }}
                  />
                );
              })}
            </FormGroup>
          )}

          {/* Añadir ubicación rápida */}
          <Box sx={{ display: 'flex', gap: '8px', mt: '4px', mb: '8px', alignItems: 'center' }}>
            <TextField
              placeholder="Nueva ubicación rápida..."
              value={turnConfigDialog.newLocationText}
              onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, newLocationText: e.target.value })}
              size="small"
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--radius-l)',
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddLocation();
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleQuickAddLocation}
              size="small"
              startIcon={<IconAdd color="var(--accent-main)" />}
              sx={{
                borderRadius: 'var(--radius-l)',
                textTransform: 'none',
                fontWeight: '700',
                borderColor: 'var(--accent-main)',
                color: 'var(--accent-main)',
                '&:hover': {
                  borderColor: 'var(--accent-dark)',
                  backgroundColor: 'var(--accent-50)',
                }
              }}
            >
              Añadir
            </Button>
          </Box>

          {/* Ubicación por Defecto */}
          {turnConfigDialog.locations.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: '700', fontSize: '12px', color: 'var(--grey-600)', mb: '4px' }}>
                Ubicación por defecto
              </Typography>
              <Select
                value={turnConfigDialog.defaultLocation}
                onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, defaultLocation: e.target.value })}
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
          <Button
            onClick={() => setTurnConfigDialog({ ...turnConfigDialog, open: false })}
            sx={{ color: 'var(--grey-600)', fontWeight: '600', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveGlobalTurn}
            disabled={isSavingTurn}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              color: 'var(--always-white)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-l)',
            }}
          >
            Guardar turno
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Exhibitors;
