import { useState, useMemo } from 'react';
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
  IconCheckCircle,
  IconAssignment,
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
import { congNameState, displayNameMeetingsEnableState, fullnameOptionState } from '@states/settings';
import { personsStateFind } from '@services/states/persons';
import { personGetDisplayName } from '@utils/common';

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
  const congName = useAtomValue(congNameState);
  const [exhibitorsList, setExhibitorsList] = useAtom(exhibitorsListState);
  const [settings, setSettings] = useAtom(exhibitorsSettingsState) as [
    ExhibitorSettingsType | null,
    (val: ExhibitorSettingsType | null) => void
  ];

  // Cargar configuración por defecto en Jotai si está vacía
  useMemo(() => {
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

  useMemo(() => {
    setSelectedDayNum(initialSelectedDay);
  }, [initialSelectedDay]);

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
  }>({
    open: false,
    id: '',
    days: [],
    startTime: '09:00',
    endTime: '11:00',
    locations: [],
    defaultLocation: '',
    newLocationText: '',
  });

  // Forzar sincronización con la nube
  const handleForceSync = () => {
    worker.postMessage('startWorker');
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: t('tr_syncInProgress', 'Sincronización en curso...'),
      severity: 'success',
    });
  };



  // Filtrar hermanos con tick "Exhibidores" habilitado en el perfil
  const enabledExhibitorBrothers = useMemo(() => {
    return persons.filter(
      (p) => p.person_data.predicacion_exhibidores?.value === true
    );
  }, [persons]);

  // Turnos configurados activos en el mes
  const generatedSlotsInMonth = useMemo(() => {
    if (!settings || !settings.turns || settings.turns.length === 0) return [];

    const slots = [];
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);

    const date = new Date(start);
    while (date <= end) {
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
      const dayLabel = weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

      // Buscar si hay turnos configurados para este día
      const dayTurns = settings.turns.filter((t) => t.days.includes(dayLabel));

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
          finalAssignments = fixed.map((f) => ({
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
  }, [selectedYear, selectedMonth, settings, exhibitorsList]);

  // Determinar qué días de la semana tienen al menos un turno para la cuadrícula horizontal
  const activeWeekdaysInMonth = useMemo(() => {
    if (!settings || !settings.turns || settings.turns.length === 0) return weekdaysOrder;
    const active = new Set<string>();
    for (const turn of settings.turns) {
      for (const day of turn.days) {
        active.add(day);
      }
    }
    return weekdaysOrder.filter((d) => active.has(d));
  }, [settings]);

  // Autocompletar todo el mes con turnos fijos
  const handleAutofillMonth = async () => {
    if (!settings || !settings.turns || settings.turns.length === 0) return;

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
          const assignments = fixed.map((f) => ({
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
    if (!settings) return;

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
  const handleAssignmentChange = (idx: number, field: 'person' | 'isResponsible', value: string | boolean) => {
    const updated = [...editDialog.assignments];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };

    // Si es responsable, asegurar que sea varón y habilitado (sólo aviso visual, el selector se encarga del filtro)
    setEditDialog({
      ...editDialog,
      assignments: updated,
    });
  };

  // --- CRUD CONFIGURACIÓN GLOBAL DE TURNOS ---

  // Eliminar un turno global
  const handleDeleteGlobalTurn = async (turnId: string) => {
    if (!settings) return;
    try {
      const updatedTurns = settings.turns.filter((t) => t.id !== turnId);
      const updatedFixed = settings.fixedAssignments.filter((f) => f.turnId !== turnId);
      
      const newSettings = {
        ...settings,
        turns: updatedTurns,
        fixedAssignments: updatedFixed,
      };

      await dbExhibitorsSaveSettings(newSettings);
      setSettings(newSettings);
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
    if (turnConfigDialog.days.length === 0) {
      displaySnackNotification({
        header: 'Aviso',
        message: 'Debe seleccionar al menos un día de la semana para este turno.',
        severity: 'error',
      });
      return;
    }

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

      if (turnConfigDialog.id) {
        localSettings.turns = localSettings.turns.map((t) => (t.id === id ? updatedTurn : t));
      } else {
        localSettings.turns.push(updatedTurn);
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
    personUid: string,
    isResponsible: boolean
  ) => {
    if (!settings) return;
    try {
      const localSettings = structuredClone(settings);
      if (!localSettings.fixedAssignments) localSettings.fixedAssignments = [];

      // Filtrar asignación fija en esta posición del turno y día
      const otherAssignments = localSettings.fixedAssignments.filter(
        (f) => !(f.turnId === turnId && f.day === day)
      );
      const turnAssignments = localSettings.fixedAssignments.filter(
        (f) => f.turnId === turnId && f.day === day
      );

      if (personUid === '') {
        // Eliminar slot en la posición
        turnAssignments.splice(idx, 1);
      } else {
        const record = { turnId, day, personUid, isResponsible };
        if (idx < turnAssignments.length) {
          turnAssignments[idx] = record;
        } else {
          turnAssignments.push(record);
        }
      }

      localSettings.fixedAssignments = [...otherAssignments, ...turnAssignments];

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
                    <NavBarButton
                      text={t('tr_export', 'Exportar')}
                      onClick={handleExportPDF}
                      icon={<IconPrint />}
                    />
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
                border: '1px solid var(--accent-300)',
                backgroundColor: 'var(--white)',
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
                    borderRadius: 'var(--radius-m)',
                    borderColor: 'var(--accent-300)',
                  }}
                >
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map((yr) => (
                    <MenuItem key={yr} value={yr}>
                      {yr}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ borderTop: '1px solid var(--accent-300)', my: '4px' }} />

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
                        borderRadius: 'var(--radius-m)',
                        borderLeft: isSelected ? '4px solid var(--accent-main)' : '4px solid transparent',
                        backgroundColor: isSelected ? 'var(--accent-150)' : 'transparent',
                        '&.Mui-selected': {
                          backgroundColor: 'var(--accent-150)',
                          '&:hover': {
                            backgroundColor: 'var(--accent-200)',
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
                border: '1px solid var(--accent-300)',
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
                <Box sx={{ p: '16px', borderTop: '1px solid var(--accent-300)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

                  <Box sx={{ borderTop: '1px solid var(--accent-200)', my: '4px' }} />

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
                                borderRadius: 'var(--radius-m)',
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
                                  borderColor: 'var(--accent-200)',
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
              {(!settings || !settings.turns || settings.turns.length === 0) ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '24px',
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--accent-300)',
                    borderRadius: 'var(--radius-xl)',
                    justifyContent: 'center',
                  }}
                >
                  <IconInfo color="var(--grey-400)" />
                  <Typography sx={{ color: 'var(--grey-400)', fontWeight: '600' }}>
                    No hay turnos configurados globales. Ve a la pestaña &quot;Configuración&quot; en la cabecera para definir tus turnos de exhibidores.
                  </Typography>
                </Box>
              ) : (
                /* Vista de Planificador con selector */
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexDirection: { mobile: 'column', tablet: 'row' }, gap: '16px', width: '100%' }}>
                    <Typography className="h2" style={{ color: 'var(--accent-main)', margin: 0 }}>
                      {`Programa de exhibidores — ${MONTH_NAMES[selectedMonth].toLowerCase()} ${selectedYear}`}
                    </Typography>
                    
                    {/* Selector de modo de vista */}
                    <Box sx={{ display: 'flex', gap: '4px', backgroundColor: 'var(--accent-150)', padding: '4px', borderRadius: 'var(--radius-m)', border: '1px solid var(--accent-300)' }}>
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
                          ...(plannerViewMode === 'lista' ? {
                            backgroundColor: 'var(--accent-main)',
                            color: 'var(--always-white)',
                            '&:hover': { backgroundColor: 'var(--accent-dark)' }
                          } : {
                            color: 'var(--grey-600)',
                            '&:hover': { backgroundColor: 'var(--accent-200)' }
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
                          ...(plannerViewMode === 'mensual' ? {
                            backgroundColor: 'var(--accent-main)',
                            color: 'var(--always-white)',
                            '&:hover': { backgroundColor: 'var(--accent-dark)' }
                          } : {
                            color: 'var(--grey-600)',
                            '&:hover': { backgroundColor: 'var(--accent-200)' }
                          })
                        }}
                      >
                        Cuadrícula
                      </Button>
                    </Box>
                  </Box>

                  {plannerViewMode === 'lista' ? (
                    /* Vista de Lista */
                    (() => {
                      const dayMap = new Map<string, typeof generatedSlotsInMonth>();
                      for (const slot of generatedSlotsInMonth) {
                        const key = slot.date;
                        if (!dayMap.has(key)) dayMap.set(key, []);
                        dayMap.get(key)!.push(slot);
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
                                      border: '1px solid var(--accent-300)',
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
                                        borderBottom: '1px solid var(--accent-300)',
                                      }}
                                    >
                                      <Typography
                                        className="h3"
                                        style={{ fontWeight: '700', color: 'var(--accent-dark)', textTransform: 'none' }}
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
                                            borderTop: idx > 0 ? '1px solid var(--accent-200)' : 'none',
                                            backgroundColor: isCancelled ? '#fce8e6' : 'var(--white)',
                                            cursor: isServiceCommittee ? 'pointer' : 'default',
                                            transition: 'background-color 0.15s',
                                            '&:hover': isServiceCommittee ? {
                                              backgroundColor: isCancelled ? '#f8d7d4' : 'var(--accent-100)'
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

                                          <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--accent-200)' }} />

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
                          activeDays.add(new Date(slot.date).getDay());
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
                          const day = new Date(slot.date).getDate();
                          if (!daySlotsMap.has(day)) {
                            daySlotsMap.set(day, []);
                          }
                          daySlotsMap.get(day)!.push(slot);
                        }

                        const getAbbreviatedName = (fullName: string) => {
                          if (!fullName || fullName === 'Sin asignar') return 'Sin asignar';
                          const parts = fullName.trim().split(/\s+/);
                          if (parts.length === 1) return parts[0];
                          const firstName = parts[0];
                          const lastName = parts[parts.length - 1];
                          return `${firstName.charAt(0)}. ${lastName}`;
                        };

                        const formatLegibleDate = (date: Date): string => {
                          const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                          return `${weekdays[date.getDay()]} ${date.getDate()}`;
                        };

                        return (
                          <Box sx={{
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--accent-300)',
                            backgroundColor: 'var(--white)',
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
                                    borderBottom: '2px solid var(--accent-300)',
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
                                        backgroundColor: 'var(--accent-50, #f8fafd)',
                                        border: '1px solid var(--accent-200)',
                                        borderRadius: 'var(--radius-m)',
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
                                        backgroundColor: 'var(--white)',
                                        border: isSelected ? '2px solid var(--accent-main)' : '1px solid var(--accent-200)',
                                        borderRadius: 'var(--radius-l)',
                                        p: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        height: '100%',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'none',
                                        '&:hover': {
                                          borderColor: 'var(--accent-300)',
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
                                              const assignedNames = slot.assignments
                                                .map((ass) => getBrotherDisplayName(ass.person))
                                                .filter(Boolean)
                                                .map(getAbbreviatedName)
                                                .join(', ');

                                              let bgColor = '#e8f0fe';
                                              let textColor = 'var(--accent-dark)';
                                              let hoverBgColor = '#d2e3fc';
                                              
                                              if (isCancelled) {
                                                bgColor = '#fce8e6';
                                                textColor = 'var(--error-dark)';
                                                hoverBgColor = '#fad2cf';
                                              } else if (!assignedNames) {
                                                bgColor = '#fef7e0';
                                                textColor = '#855000';
                                                hoverBgColor = '#feebb3';
                                              }

                                              return (
                                                <Box
                                                  key={slot.id}
                                                  onClick={() => handleOpenEditTurn(slot)}
                                                  sx={{
                                                    backgroundColor: bgColor,
                                                    color: textColor,
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-m)',
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
                                                    <span style={{ fontWeight: '800', fontSize: '11px', whiteSpace: 'nowrap', opacity: 0.9 }}>
                                                      {slot.startTime}
                                                    </span>
                                                    <span style={{ fontSize: '10px', opacity: 0.8, fontStyle: 'italic', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {slot.location}
                                                    </span>
                                                  </Box>
                                                  <span style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    width: '100%',
                                                    fontSize: '11.5px',
                                                    fontWeight: '700',
                                                    textAlign: 'left'
                                                  }} title={assignedNames || 'Sin asignar'}>
                                                    {isCancelled ? 'Suspendido' : (assignedNames || 'Sin asignar')}
                                                  </span>
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
                                          backgroundColor: isSelected ? 'var(--accent-150)' : 'var(--white)',
                                          border: isSelected ? '2px solid var(--accent-main)' : '1px solid var(--accent-300)',
                                          borderRadius: 'var(--radius-m)',
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
                                                    ? '#2e7d32'
                                                    : dotColor === 'yellow'
                                                    ? '#ed6c02'
                                                    : '#d32f2f',
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
                                    border: '1px solid var(--accent-300)',
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
                                      borderBottom: '1px solid var(--accent-300)',
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
                                      (slot) => new Date(slot.date).getDate() === selectedDayNum
                                    );

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
                                            borderTop: idx > 0 ? '1px solid var(--accent-200)' : 'none',
                                            backgroundColor: isCancelled ? '#fce8e6' : 'var(--white)',
                                            cursor: isServiceCommittee ? 'pointer' : 'default',
                                            transition: 'background-color 0.15s',
                                            '&:hover': isServiceCommittee
                                              ? { backgroundColor: isCancelled ? '#f8d7d4' : 'var(--accent-100)' }
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

                                          <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--accent-200)' }} />

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
            <Card
              sx={{
                padding: '20px',
                border: '1px solid var(--accent-300)',
                borderRadius: 'var(--radius-l)',
                boxShadow: 'none',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <Tabs
                value={configSubTab}
                onChange={(_, val) => setConfigSubTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  borderBottom: '1px solid var(--accent-300)',
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
                    textTransform: 'none',
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
                <Tab label="Ubicaciones" icon={<IconLocation width={18} height={18} />} iconPosition="start" sx={{ gap: '6px' }} />
                <Tab label="Turnos" icon={<IconCalendar width={18} height={18} />} iconPosition="start" sx={{ gap: '6px' }} />
                <Tab label="Responsables" icon={<IconGroups width={18} height={18} />} iconPosition="start" sx={{ gap: '6px' }} />
                <Tab label="Asignaciones fijas" icon={<IconAssignment width={18} height={18} />} iconPosition="start" sx={{ gap: '6px' }} />
                <Tab label="Disponibilidad" icon={<IconCheckCircle width={18} height={18} />} iconPosition="start" sx={{ gap: '6px' }} />
              </Tabs>

              {/* SUB-PESTAÑA 0: UBICACIONES (GLOBAL) */}
              {configSubTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Ubicaciones de exhibidores
                    </Typography>
                    <Typography style={{ fontSize: '13px', color: 'var(--grey-500)', marginTop: '4px' }}>
                      Gestiona los puntos geográficos de predicación pública de la congregación. Luego podrás habilitar cuáles de estas ubicaciones aplican a cada turno global.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: '12px', maxWidth: '500px', width: '100%', flexDirection: { xs: 'column', tablet: 'row' } }}>
                    <TextField
                      label="Nueva ubicación"
                      value={newExhibitorLocation}
                      onChange={(e) => setNewExhibitorLocation(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 'var(--radius-m)',
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddExhibitorLocation}
                      startIcon={<IconAdd />}
                      sx={{
                        backgroundColor: 'var(--accent-main)',
                        color: 'var(--always-white)',
                        borderRadius: 'var(--radius-m)',
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
                        border: '1px dashed var(--accent-300)',
                        borderRadius: 'var(--radius-m)',
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
                        gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
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
                            border: '1px solid var(--accent-200)',
                            borderRadius: 'var(--radius-l)',
                            boxShadow: 'none',
                            backgroundColor: 'var(--white)',
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Configuración de turnos de exhibidores
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => handleOpenTurnConfig()}
                      startIcon={<IconAdd />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: '700',
                        backgroundColor: 'var(--accent-main)',
                        borderRadius: 'var(--radius-m)',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                          boxShadow: 'none',
                        }
                      }}
                    >
                      Añadir Turno
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
                        border: '1px dashed var(--accent-300)',
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
                        gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
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
                              border: '1px solid var(--accent-200)',
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--white)',
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
                                          borderColor: 'var(--accent-300)',
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
                                  borderRadius: 'var(--radius-m)',
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
                                  borderRadius: 'var(--radius-m)',
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

                  {enabledExhibitorBrothers.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--accent-300)',
                        borderRadius: 'var(--radius-xl)',
                        justifyContent: 'center',
                        py: '40px',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13.5px', color: 'var(--accent-dark)', fontWeight: '600' }}>
                        No hay hermanos habilitados con el tick &quot;Exhibidores&quot; en sus perfiles personales.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
                        gap: '12px',
                        width: '100%',
                      }}
                    >
                      {enabledExhibitorBrothers.map((bro) => {
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
                              border: '1px solid var(--accent-200)',
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--white)',
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
                                  border: `1px solid ${isResponsible ? 'var(--accent-300)' : 'var(--grey-300)'}`,
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
                                      border: '1px solid var(--accent-200)',
                                      borderRadius: 'var(--radius-l)',
                                      boxShadow: 'none',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '16px',
                                      backgroundColor: 'var(--white)',
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        borderColor: 'var(--accent-300)',
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

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr 1fr' }, gap: '20px' }}>
                                      {[0, 1, 2].map((idx) => {
                                        const assignment = turnAssignments[idx];
                                        const currentVal = assignment?.personUid || '';
                                        const isResp = assignment?.isResponsible || false;

                                        return (
                                          <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: '8px', p: '12px', border: '1px solid var(--accent-150)', borderRadius: 'var(--radius-m)', backgroundColor: 'var(--accent-50)' }}>
                                            <Typography style={{ fontWeight: '800', fontSize: '11px', color: 'var(--accent-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                              Posición {idx + 1}
                                            </Typography>
                                            <Select
                                              value={currentVal}
                                              onChange={(e) => handleFixedAssignmentChange(turn.id, day, idx, e.target.value, isResp)}
                                              size="small"
                                              displayEmpty
                                              fullWidth
                                              sx={{
                                                backgroundColor: 'var(--white)',
                                                borderRadius: 'var(--radius-m)',
                                              }}
                                            >
                                              <MenuItem value="">
                                                <em>Vacío / sin asignar</em>
                                              </MenuItem>
                                              {enabledExhibitorBrothers.map((bro) => {
                                                const name = personGetDisplayName(bro, displayNameEnabled, fullnameOption);
                                                return (
                                                  <MenuItem key={bro.person_uid} value={bro.person_uid}>
                                                    {name}
                                                  </MenuItem>
                                                );
                                              })}
                                            </Select>

                                            {currentVal !== '' && (
                                              <FormControlLabel
                                                control={
                                                  <Switch
                                                    checked={isResp}
                                                    onChange={(e) => handleFixedAssignmentChange(turn.id, day, idx, currentVal, e.target.checked)}
                                                    size="small"
                                                  />
                                                }
                                                label="¿Es responsable?"
                                                sx={{ '& .MuiFormControlLabel-label': { fontSize: '11px', fontWeight: '700', color: 'var(--grey-600)' }, mt: '4px' }}
                                              />
                                            )}
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
                                border: '1px solid var(--accent-200)',
                                borderRadius: 'var(--radius-l)',
                                backgroundColor: 'var(--white)',
                                gap: '16px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: 'var(--accent-300)',
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
                                            backgroundColor: 'var(--accent-200)',
                                            transform: 'translateY(-1px)',
                                          }
                                        } : {
                                          backgroundColor: 'var(--accent-50)',
                                          color: 'var(--grey-600)',
                                          border: '1px solid var(--accent-200)',
                                          '&:hover': {
                                            backgroundColor: 'var(--accent-100)',
                                            borderColor: 'var(--accent-300)',
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
            </Card>
          )}
        </Box>
      </Box>

      {/* --- DIÁLOGO 1: EDICIÓN DE TURNO SEMANAL (ASIGNAR 3 HERMANOS) --- */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        maxWidth="tablet"
        fullWidth
        PaperProps={{ style: { borderRadius: 'var(--radius-l)' } }}
      >
        <DialogTitle sx={{ fontWeight: '800', borderBottom: '1px solid var(--accent-200)', pb: '12px' }}>
          Asignar Turno de Exhibidor
        </DialogTitle>
        <DialogContent sx={{ mt: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {dialogWarnings.map((warning, wIdx) => (
            <Alert key={wIdx} severity="warning" sx={{ borderRadius: 'var(--radius-m)', fontWeight: '600' }}>
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
                const isResp = editDialog.assignments[idx]?.isResponsible || false;

                // Filtrar hermanos recomendados (los que tienen este turno en su disponibilidad de preferencia para este día)
                const recommended = [];
                const others = [];

                // Obtener el día de la semana para esta fecha
                const [y, m, d] = editDialog.date.split('/').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayOfWeek = dateObj.getDay();
                const dayLabel = weekdaysOrder[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

                for (const bro of enabledExhibitorBrothers) {
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
                      Publicador {idx + 1}
                    </Typography>

                    <Select
                      value={currentVal}
                      onChange={(e) => handleAssignmentChange(idx, 'person', e.target.value)}
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

                    {currentVal !== '' && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isResp}
                            onChange={(e) => handleAssignmentChange(idx, 'isResponsible', e.target.checked)}
                          />
                        }
                        label="¿Es responsable del turno?"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', fontWeight: '600' } }}
                      />
                    )}
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
          <Button
            onClick={() => setEditDialog({ ...editDialog, open: false })}
            sx={{ color: 'var(--grey-600)', fontWeight: '600', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveWeekTurn}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-m)',
            }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIÁLOGO 2: DIÁLOGO DE CONFIGURACIÓN GLOBAL DE TURNO --- */}
      <Dialog
        open={turnConfigDialog.open}
        onClose={() => setTurnConfigDialog({ ...turnConfigDialog, open: false })}
        maxWidth={false}
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
        PaperProps={{ style: { borderRadius: 'var(--radius-l)' } }}
      >
        <DialogTitle sx={{ fontWeight: '800', borderBottom: '1px solid var(--accent-200)', pb: '12px' }}>
          {turnConfigDialog.id ? 'Editar Turno Global' : 'Crear Turno Global'}
        </DialogTitle>
        <DialogContent sx={{ mt: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Días de la semana */}
          <Typography style={{ fontWeight: '700', fontSize: '13.5px' }}>Días Aplicables</Typography>
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
              <Typography sx={{ fontWeight: '700', fontSize: '12px', color: 'var(--grey-600)', mb: '4px' }}>Hora Inicio</Typography>
              <TextField
                type="time"
                value={turnConfigDialog.startTime}
                onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, startTime: e.target.value })}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: '700', fontSize: '12px', color: 'var(--grey-600)', mb: '4px' }}>Hora Fin</Typography>
              <TextField
                type="time"
                value={turnConfigDialog.endTime}
                onChange={(e) => setTurnConfigDialog({ ...turnConfigDialog, endTime: e.target.value })}
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          {/* Ubicaciones del Turno (Checkboxes de Ubicaciones Globales) */}
          <Typography style={{ fontWeight: '700', fontSize: '13.5px' }}>Ubicaciones Habilitadas para el Turno</Typography>
          {(!settings?.locations || settings.locations.length === 0) ? (
            <Alert severity="warning" sx={{ borderRadius: 'var(--radius-m)', fontWeight: '600', mb: '8px' }}>
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
                  borderRadius: 'var(--radius-m)',
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
              startIcon={<IconAdd />}
              sx={{
                borderRadius: 'var(--radius-m)',
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
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-m)',
            }}
          >
            Guardar Turno
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Exhibitors;
