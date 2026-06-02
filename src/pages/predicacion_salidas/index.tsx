import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Grid,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Chip,
  ListSubheader,
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
  IconCancelFilled,
  IconCalendar,
  IconPrint,
  IconSparkles,
  IconGenerate,
  IconLocation,
  IconInfo,
} from '@components/icons';
import { outingsStartAutofill } from '@services/app/outingsAutofill';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import OutingsSchedulePDF from '@views/field_service_outings';
import { CalendarCellPDF, OutingPDFItem } from '@views/field_service_outings/index.types';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { personsState } from '@states/persons';
import TimePicker from '@components/time_picker';
import { generateDateFromTime } from '@utils/date';
import { hour24FormatState, congNameState } from '@states/settings';
import {
  serviceOutingsListState,
  serviceOutingsSettingsState,
} from '@states/service_outings';
import {
  dbServiceOutingsSaveWeek,
  dbServiceOutingsSaveSettings,
  dbServiceOutingsGetSettings,
} from '@services/dexie/service_outings';
import worker from '@services/worker/backupWorker';
import { displaySnackNotification } from '@services/states/app';

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper para obtener el lunes de la semana (formato YYYY/MM/DD)
const getWeekOfDate = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  // Ajustar si es Domingo (-6) o cualquier otro día (-day + 1)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`;
};

// Helper para formatear fecha a DB (YYYY/MM/DD)
const formatToDbDate = (date: Date): string => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

// Helper para formatear fecha legible
const formatLegibleDate = (date: Date): string => {
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${weekdays[date.getDay()]} ${date.getDate()}`;
};

const PredicacionSalidas = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { isServiceCommittee, person: currentPerson } = useCurrentUser();

  // Estados reactivos de Jotai
  const persons = useAtomValue(personsState);
  const hour24 = useAtomValue(hour24FormatState);
  const congName = useAtomValue(congNameState);
  const [outingsWeeks, setOutingsWeeks] = useAtom(serviceOutingsListState);
  // useAtom with nullable atom — destructure read and write separately
  const [settings, setSettings] = useAtom(serviceOutingsSettingsState) as [
    ServiceOutingSettingsType | null,
    (val: ServiceOutingSettingsType | null) => void
  ];

  // Selector de Año y Mes activo
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [monthsExpanded, setMonthsExpanded] = useState<boolean>(false);

  // Control de Vista del Planificador ("lista" o "mensual")
  const [plannerViewMode, setPlannerViewMode] = useState<'lista' | 'mensual'>('lista');

  // Día seleccionado en la cuadrícula mensual móvil (inicializado reactivamente)
  const initialSelectedDay = useMemo(() => {
    const today = new Date();
    if (today.getFullYear() === selectedYear && today.getMonth() === selectedMonth) {
      return today.getDate();
    }
    return 1;
  }, [selectedYear, selectedMonth]);

  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  // Sincronizar selectedDayNum cuando cambie el mes seleccionado
  useMemo(() => {
    setSelectedDayNum(initialSelectedDay);
  }, [initialSelectedDay]);

  // Diálogo de Exportación de PDF
  const [pdfExportDialogOpen, setPdfExportDialogOpen] = useState<boolean>(false);
  const [pdfExportMonth, setPdfExportMonth] = useState<number>(selectedMonth);
  const [pdfExportYear, setPdfExportYear] = useState<number>(selectedYear);

  // Control de Vista Activa ("planner" o "settings")
  const [activeTab, setActiveTab] = useState<'planner' | 'settings'>('planner');

  // Control de Sub-tabs de Configuración
  const [settingsSubTab, setSettingsSubTab] = useState<number>(0);

  // Diálogo de Edición de Salida
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    date: Date | null;
    time: string;
    slotId: string;
    timeKey: string;
    outingId: string;
  }>({
    open: false,
    date: null,
    time: '',
    slotId: '',
    timeKey: '',
    outingId: '',
  });

  const [editPerson, setEditPerson] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editCancelled, setEditCancelled] = useState<boolean>(false);

  // Nuevas ubicaciones y horas
  const [newLocation, setNewLocation] = useState<string>('');
  const [hoursConfig, setHoursConfig] = useState<{ [key: string]: string }>({});

  // Estados para salidas compartidas
  const [sharedSlotKey, setSharedSlotKey] = useState<string>('monday_morning');
  const [sharedCongregation, setSharedCongregation] = useState<string>('');

  // Estados para diálogo de ajustes de semana
  const [weekSettingsDialog, setWeekSettingsDialog] = useState<{
    open: boolean;
    weekOf: string;
  }>({ open: false, weekOf: '' });
  const [showAdjustHours, setShowAdjustHours] = useState<boolean>(false);
  const [weekHoursConfig, setWeekHoursConfig] = useState<Record<string, string>>({});
  const [tempCOWeek, setTempCOWeek] = useState<boolean>(false);

  // Cargar configuración por defecto en Jotai si está vacía
  useMemo(() => {
    if (!settings) {
      dbServiceOutingsGetSettings().then(setSettings);
    } else {
      setHoursConfig(settings.defaultHours || {});
    }
  }, [settings, setSettings]);

  // Catálogo de hermanos habilitados (varones con tick en Predicación)
  const enabledBrothers = useMemo(() => {
    return persons.filter(
      (p) => p.person_data.male && p.person_data.predicacion_salidas?.value === true
    );
  }, [persons]);

  // Generar dinámicamente todos los slots de salidas del mes/año seleccionado
  const outingsSlotsInMonth = useMemo(() => {
    if (!settings) return [];

    const defaultHours = settings.defaultHours || {
      monday_morning: '10:00',
      monday_afternoon: '17:00',
      tuesday_morning: '10:00',
      tuesday_afternoon: '17:00',
      wednesday_morning: '10:00',
      wednesday_afternoon: '17:00',
      thursday_morning: '10:00',
      thursday_afternoon: '17:00',
      friday_morning: '10:00',
      friday_afternoon: '17:30',
      saturday_morning: '09:45',
      saturday_afternoon: '17:00',
      sunday_morning: '10:30',
      sunday_afternoon: '17:00',
    };

    const slots = [];
    const disabledSlots = settings.disabledSlots || [];
    // Recorrer todos los días del mes
    const date = new Date(selectedYear, selectedMonth, 1);
    while (date.getMonth() === selectedMonth) {
      const dayOfWeek = date.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb

      // Determinar el prefijo del día en inglés
      let dayLabel = '';
      if (dayOfWeek === 1) dayLabel = 'monday';
      else if (dayOfWeek === 2) dayLabel = 'tuesday';
      else if (dayOfWeek === 3) dayLabel = 'wednesday';
      else if (dayOfWeek === 4) dayLabel = 'thursday';
      else if (dayOfWeek === 5) dayLabel = 'friday';
      else if (dayOfWeek === 6) dayLabel = 'saturday';
      else if (dayOfWeek === 0) dayLabel = 'sunday';

      if (dayLabel) {
        const weekOfRecord = getWeekOfDate(date);
        const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
        const overrideHours = weekRecord?.weekOverrideHours || {};

        // Turno Mañana
        const morningType = `${dayLabel}_morning`;
        // Para compatibilidad hacia atrás, si disabledSlots incluye el nombre del día legacy (ej: 'friday'), lo consideramos deshabilitado
        if (!disabledSlots.includes(morningType) && !disabledSlots.includes(dayLabel)) {
          slots.push({
            date: new Date(date),
            slotType: morningType,
            time: overrideHours[morningType] || defaultHours[morningType as keyof typeof defaultHours] || '10:00',
            slotId: `${formatToDbDate(date)}_morning`,
          });
        }

        // Turno Tarde
        const afternoonType = `${dayLabel}_afternoon`;
        if (!disabledSlots.includes(afternoonType) && !disabledSlots.includes(dayLabel)) {
          slots.push({
            date: new Date(date),
            slotType: afternoonType,
            time: overrideHours[afternoonType] || defaultHours[afternoonType as keyof typeof defaultHours] || '17:00',
            slotId: `${formatToDbDate(date)}_afternoon`,
          });
        }
      }

      date.setDate(date.getDate() + 1);
    }
    return slots;
  }, [selectedYear, selectedMonth, settings, outingsWeeks]);

  const triggerSync = () => {
    import('@services/worker/backupWorker').then(
      ({ default: worker }) => worker.postMessage('startWorker')
    );
  };

  // Forzar sincronización remota de datos
  const handleForceSync = () => {
    worker.postMessage('startWorker');
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: t('tr_syncInProgress', 'Sincronización en curso...'),
      severity: 'success',
    });
  };

  // Abrir diálogo de edición de una salida específica
  const handleOpenEdit = (slot: typeof outingsSlotsInMonth[0]) => {
    if (!isServiceCommittee) return; // Solo el comité de servicio puede editar

    const weekOf = getWeekOfDate(slot.date);
    const dbDate = formatToDbDate(slot.date);
    const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);
    const outing = weekRecord?.outings?.find(
      (o) => o.date === dbDate && o.time === slot.time
    );

    setEditDialog({
      open: true,
      date: slot.date,
      time: slot.time,
      slotId: slot.slotId,
      timeKey: slot.slotType,
      outingId: outing?.id || crypto.randomUUID(),
    });

    setEditPerson(outing?.person || '');
    setEditLocation(outing?.location || settings?.locations?.[0] || 'Salón del Reino');
    setEditCancelled(outing?.cancelled || false);
  };

  // Guardar asignación de la salida específica
  const handleSaveOuting = async () => {
    if (!editDialog.date) return;

    const weekOf = getWeekOfDate(editDialog.date);
    const dbDate = formatToDbDate(editDialog.date);

    let weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);
    if (!weekRecord) {
      weekRecord = {
        weekOf,
        outings: [],
      };
    } else {
      weekRecord = structuredClone(weekRecord);
    }

    if (!weekRecord.outings) {
      weekRecord.outings = [];
    }

    // Filtrar la salida anterior si ya existía para sobreescribirla
    weekRecord.outings = weekRecord.outings.filter(
      (o) => !(o.date === dbDate && o.time === editDialog.time)
    );

    // Agregar nueva salida solo si no es un slot completamente vacío y activo (evitando registros vacíos redundantes)
    const isUnassignedAndActive = editPerson === '' && !editCancelled;

    if (!isUnassignedAndActive) {
      weekRecord.outings.push({
        id: editDialog.outingId,
        date: dbDate,
        time: editDialog.time,
        person: editPerson,
        location: editLocation,
        cancelled: editCancelled,
      });
    }

    // Guardar localmente en Dexie y reactivar Jotai
    await dbServiceOutingsSaveWeek(weekRecord);
    triggerSync();
    setOutingsWeeks((prev) => {
      const filtered = prev.filter((w) => w.weekOf !== weekOf);
      return [...filtered, weekRecord!];
    });

    setEditDialog({
      open: false,
      date: null,
      time: '',
      slotId: '',
      timeKey: '',
      outingId: '',
    });

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: 'Salida actualizada correctamente.',
      severity: 'success',
    });
  };

  // Manejar el catálogo de ubicaciones
  const handleAddLocation = async () => {
    if (!newLocation.trim() || !settings) return;
    if (settings.locations?.includes(newLocation.trim())) return;

    const updatedSettings = {
      ...settings,
      locations: [...(settings.locations || []), newLocation.trim()],
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
    setNewLocation('');
  };

  const handleDeleteLocation = async (loc: string) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      locations: (settings.locations || []).filter((l) => l !== loc),
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
  };

  // Guardar configuración de horas recurrentes
  const handleSaveHoursConfig = async () => {
    if (!settings) return;

    const updatedSettings: ServiceOutingSettingsType = {
      ...settings,
      defaultHours: {
        ...settings.defaultHours,
        ...hoursConfig,
      } as ServiceOutingSettingsType['defaultHours'],
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: 'Horarios recurrentes actualizados.',
      severity: 'success',
    });
  };

  // Alternar disponibilidad de un hermano para un slot específico
  const handleToggleAvailability = async (personUid: string, slotKey: string) => {
    if (!settings) return;

    const currentAvailability = settings.availability || {};
    const personSlots = currentAvailability[personUid] || [];

    let updatedSlots;
    if (personSlots.includes(slotKey)) {
      updatedSlots = personSlots.filter((s) => s !== slotKey);
    } else {
      updatedSlots = [...personSlots, slotKey];
    }

    const updatedSettings = {
      ...settings,
      availability: {
        ...currentAvailability,
        [personUid]: updatedSlots,
      },
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
  };

  // Añadir una salida compartida
  const handleAddSharedSlot = async () => {
    if (!settings || !sharedCongregation.trim()) return;

    const currentShared = settings.sharedSlots || [];
    if (currentShared.some((s) => s.slotKey === sharedSlotKey)) {
      displaySnackNotification({
        header: 'Error',
        message: 'Este turno ya tiene una congregación compartida configurada.',
        severity: 'error',
      });
      return;
    }

    const updatedSettings = {
      ...settings,
      sharedSlots: [
        ...currentShared,
        {
          id: sharedSlotKey,
          slotKey: sharedSlotKey,
          congregation: sharedCongregation.trim(),
        },
      ],
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
    setSharedCongregation('');
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: 'Salida compartida registrada con éxito.',
      severity: 'success',
    });
  };

  // Eliminar una salida compartida
  const handleDeleteSharedSlot = async (slotKey: string) => {
    if (!settings) return;

    const currentShared = settings.sharedSlots || [];
    const updatedSettings = {
      ...settings,
      sharedSlots: currentShared.filter((s) => s.slotKey !== slotKey),
    };

    await dbServiceOutingsSaveSettings(updatedSettings);
    triggerSync();
    setSettings(updatedSettings);
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: 'Salida compartida eliminada.',
      severity: 'success',
    });
  };

  // Abrir diálogo de ajustes de semana
  const handleOpenWeekSettings = (weekOf: string) => {
    const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);
    setWeekSettingsDialog({
      open: true,
      weekOf,
    });
    setTempCOWeek(!!weekRecord?.isCircuitOverseerWeek);
    setShowAdjustHours(!!weekRecord?.weekOverrideHours);
    setWeekHoursConfig(weekRecord?.weekOverrideHours || {});
  };

  // Guardar ajustes de semana
  const handleSaveWeekSettings = async () => {
    const { weekOf } = weekSettingsDialog;
    let weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);

    if (!weekRecord) {
      weekRecord = {
        weekOf,
        outings: [],
      };
    } else {
      weekRecord = structuredClone(weekRecord);
    }

    weekRecord.isCircuitOverseerWeek = tempCOWeek;
    if (showAdjustHours) {
      weekRecord.weekOverrideHours = weekHoursConfig;
    } else {
      delete weekRecord.weekOverrideHours;
    }

    await dbServiceOutingsSaveWeek(weekRecord);
    triggerSync();
    setOutingsWeeks((prev) => {
      const filtered = prev.filter((w) => w.weekOf !== weekOf);
      return [...filtered, weekRecord!];
    });

    setWeekSettingsDialog({ open: false, weekOf: '' });
    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: 'Ajustes semanales actualizados correctamente.',
      severity: 'success',
    });
  };

  // Autocompletar asignaciones de la semana actual
  const handleAutofillWeek = async () => {
    const { weekOf } = weekSettingsDialog;
    if (!weekOf) return;

    try {
      const count = await outingsStartAutofill(weekOf);
      
      if (count > 0) {
        triggerSync();
        displaySnackNotification({
          header: t('tr_done', 'Hecho'),
          message: `Asignaciones autocompletadas con éxito. Se asignaron ${count} salidas.`,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: 'Info',
          message: 'No se encontraron turnos vacíos que requieran autocompletado para esta semana.',
          severity: 'success',
        });
      }
      
      // Cerrar el diálogo para que el usuario vea los cambios inmediatamente
      setWeekSettingsDialog({ open: false, weekOf: '' });
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'Error',
        message: 'Ocurrió un error al autocompletar las salidas de la semana.',
        severity: 'error',
      });
    }
  };

  // Autocompletar todas las semanas del mes seleccionado
  const handleAutofillMonth = async () => {
    if (!settings) return;

    try {
      // 1. Determinar qué semanas naturales (Monday dates) tienen días en este mes
      const weekKeys = new Set<string>();
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      
      const date = new Date(start);
      // Para encontrar los días de la semana configurables
      const weekdaysInfo = [
        { dayOfWeek: 1, englishLabel: 'monday' },
        { dayOfWeek: 2, englishLabel: 'tuesday' },
        { dayOfWeek: 3, englishLabel: 'wednesday' },
        { dayOfWeek: 4, englishLabel: 'thursday' },
        { dayOfWeek: 5, englishLabel: 'friday' },
        { dayOfWeek: 6, englishLabel: 'saturday' },
        { dayOfWeek: 0, englishLabel: 'sunday' },
      ];
      const disabledSlots = settings.disabledSlots || [];

      while (date <= end) {
        const dayOfWeek = date.getDay();
        const dayInfo = weekdaysInfo.find((w) => w.dayOfWeek === dayOfWeek);
        if (dayInfo) {
          const morningType = `${dayInfo.englishLabel}_morning`;
          const afternoonType = `${dayInfo.englishLabel}_afternoon`;
          const hasMorning = !disabledSlots.includes(morningType) && !disabledSlots.includes(dayInfo.englishLabel);
          const hasAfternoon = !disabledSlots.includes(afternoonType) && !disabledSlots.includes(dayInfo.englishLabel);
          
          if (hasMorning || hasAfternoon) {
            weekKeys.add(getWeekOfDate(date));
          }
        }
        date.setDate(date.getDate() + 1);
      }

      const sortedWeeks = Array.from(weekKeys).sort();
      let totalCount = 0;

      // 2. Ejecutar el autocompletado semana a semana para todo el mes
      for (const weekOf of sortedWeeks) {
        const count = await outingsStartAutofill(weekOf);
        totalCount += count;
      }

      if (totalCount > 0) {
        triggerSync();
        displaySnackNotification({
          header: t('tr_done', 'Hecho'),
          message: `Asignaciones autocompletadas con éxito. Se asignaron ${totalCount} salidas en todo el mes.`,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: 'Info',
          message: 'No se encontraron turnos vacíos que requieran autocompletado en este mes.',
          severity: 'success',
        });
      }
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'Error',
        message: 'Ocurrió un error al autocompletar las salidas del mes.',
        severity: 'error',
      });
    }
  };

  // Función para exportar el programa de salidas a PDF
  const handleExportPDF = async () => {
    if (!settings) return;

    try {
      const defaultHours = settings.defaultHours || {
        monday_morning: '10:00',
        monday_afternoon: '17:00',
        tuesday_morning: '10:00',
        tuesday_afternoon: '17:00',
        wednesday_morning: '10:00',
        wednesday_afternoon: '17:00',
        thursday_morning: '10:00',
        thursday_afternoon: '17:00',
        friday_morning: '10:00',
        friday_afternoon: '17:30',
        saturday_morning: '09:45',
        saturday_afternoon: '17:00',
        sunday_morning: '10:30',
        sunday_afternoon: '17:00',
      };

      const disabledSlots = settings.disabledSlots || [];

      // Función para abreviar nombres en celdas pequeñas
      const getAbbreviatedName = (fullName: string) => {
        if (!fullName || fullName === 'Sin asignar') return 'Sin asignar';
        if (fullName === 'Superintendente de circuito' || settings?.sharedSlots?.some((s) => s.congregation === fullName)) {
          return fullName;
        }
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        return `${firstName.charAt(0)}. ${lastName}`;
      };

      // 1. Determinar qué días de la semana tienen salidas configuradas en este mes
      const weekdaysInfo = [
        { dayOfWeek: 1, label: 'lunes', englishLabel: 'monday' },
        { dayOfWeek: 2, label: 'martes', englishLabel: 'tuesday' },
        { dayOfWeek: 3, label: 'miércoles', englishLabel: 'wednesday' },
        { dayOfWeek: 4, label: 'jueves', englishLabel: 'thursday' },
        { dayOfWeek: 5, label: 'viernes', englishLabel: 'friday' },
        { dayOfWeek: 6, label: 'sábado', englishLabel: 'saturday' },
        { dayOfWeek: 0, label: 'domingo', englishLabel: 'sunday' },
      ];

      const activeDays = new Set<number>();
      const tempDate = new Date(pdfExportYear, pdfExportMonth, 1);
      while (tempDate.getMonth() === pdfExportMonth) {
        const dayOfWeek = tempDate.getDay();
        let dayLabel = '';
        if (dayOfWeek === 1) dayLabel = 'monday';
        else if (dayOfWeek === 2) dayLabel = 'tuesday';
        else if (dayOfWeek === 3) dayLabel = 'wednesday';
        else if (dayOfWeek === 4) dayLabel = 'thursday';
        else if (dayOfWeek === 5) dayLabel = 'friday';
        else if (dayOfWeek === 6) dayLabel = 'saturday';
        else if (dayOfWeek === 0) dayLabel = 'sunday';

        if (dayLabel) {
          const morningType = `${dayLabel}_morning`;
          if (!disabledSlots.includes(morningType) && !disabledSlots.includes(dayLabel)) {
            activeDays.add(dayOfWeek);
          }
          const afternoonType = `${dayLabel}_afternoon`;
          if (!disabledSlots.includes(afternoonType) && !disabledSlots.includes(dayLabel)) {
            activeDays.add(dayOfWeek);
          }
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const weekdaysToShow = weekdaysInfo.filter(info => activeDays.has(info.dayOfWeek));
      const weekdaysToShowFinal = weekdaysToShow.length > 0 ? weekdaysToShow : weekdaysInfo;

      // 2. Calcular límites del mes y semanas naturales ( Monday of week )
      const daysInMonth = new Date(pdfExportYear, pdfExportMonth + 1, 0).getDate();
      const weekKeys = new Set<string>();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(pdfExportYear, pdfExportMonth, d);
        weekKeys.add(getWeekOfDate(date));
      }
      const sortedWeekKeys = Array.from(weekKeys).sort();

      const cells: CalendarCellPDF[] = [];

      // Construir la cuadrícula fila por fila (semana por semana)
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
          
          if (cellDate.getMonth() === pdfExportMonth && cellDate.getFullYear() === pdfExportYear) {
            const dateKey = formatToDbDate(cellDate);
            const dayOutings: OutingPDFItem[] = [];

            // Comprobar Turno Mañana
            const morningType = `${dayInfo.englishLabel}_morning`;
            if (!disabledSlots.includes(morningType) && !disabledSlots.includes(dayInfo.englishLabel)) {
              const weekOfRecord = getWeekOfDate(cellDate);
              const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
              const overrideHours = weekRecord?.weekOverrideHours || {};
              const timeVal = overrideHours[morningType] || defaultHours[morningType] || '10:00';
              const outing = weekRecord?.outings?.find(
                (o) => o.date === dateKey && o.time === timeVal
              );
              const assignedBrother = persons.find((b) => b.person_uid === outing?.person);
              let brotherName = 'Sin asignar';
              let isAssigned = !!assignedBrother;

              if (outing?.person?.startsWith('SHARED_CONG:')) {
                brotherName = outing.person.replace('SHARED_CONG:', '');
                isAssigned = true;
              } else if (outing?.person === 'CIRCUIT_OVERSEER') {
                brotherName = 'Superintendente de circuito';
                isAssigned = true;
              } else if (assignedBrother) {
                brotherName = `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`;
              }

              dayOutings.push({
                id: `${dateKey}_morning`,
                time: timeVal,
                location: outing?.location || settings?.locations?.[0] || 'Salón del Reino',
                brotherName: getAbbreviatedName(brotherName),
                isAssigned,
                isCancelled: outing?.cancelled ?? false,
              });
            }

            // Comprobar Turno Tarde
            const afternoonType = `${dayInfo.englishLabel}_afternoon`;
            if (!disabledSlots.includes(afternoonType) && !disabledSlots.includes(dayInfo.englishLabel)) {
              const weekOfRecord = getWeekOfDate(cellDate);
              const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
              const overrideHours = weekRecord?.weekOverrideHours || {};
              const actualTimeVal = overrideHours[afternoonType] || defaultHours[afternoonType] || '17:00';
              const outing = weekRecord?.outings?.find(
                (o) => o.date === dateKey && o.time === actualTimeVal
              );
              const assignedBrother = persons.find((b) => b.person_uid === outing?.person);
              let brotherName = 'Sin asignar';
              let isAssigned = !!assignedBrother;

              if (outing?.person?.startsWith('SHARED_CONG:')) {
                brotherName = outing.person.replace('SHARED_CONG:', '');
                isAssigned = true;
              } else if (outing?.person === 'CIRCUIT_OVERSEER') {
                brotherName = 'Superintendente de circuito';
                isAssigned = true;
              } else if (assignedBrother) {
                brotherName = `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`;
              }

              dayOutings.push({
                id: `${dateKey}_afternoon`,
                time: actualTimeVal,
                location: outing?.location || settings?.locations?.[0] || 'Salón del Reino',
                brotherName: getAbbreviatedName(brotherName),
                isAssigned,
                isCancelled: outing?.cancelled ?? false,
              });
            }

            cells.push({
              type: 'day',
              dayNum: cellDate.getDate(),
              outings: dayOutings,
            });
          } else {
            cells.push({
              type: 'empty',
              id: `empty-${weekKey}-${dayInfo.dayOfWeek}`,
            });
          }
        }
      }

      // Calcular última fecha de modificación
      let lastUpdatedAt: string | undefined;
      let lastModifiedBy: string | undefined;

      for (const week of outingsWeeks) {
        if (week.updatedAt) {
          if (!lastUpdatedAt || new Date(week.updatedAt) > new Date(lastUpdatedAt)) {
            lastUpdatedAt = week.updatedAt;
            lastModifiedBy = week.lastModifiedBy;
          }
        }
      }

      const spanishMonths = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const monthLabel = `${spanishMonths[pdfExportMonth]} ${pdfExportYear}`;
      const fileName = `Salidas_${spanishMonths[pdfExportMonth]}_${pdfExportYear}.pdf`;

      const doc = (
        <OutingsSchedulePDF
          monthName={monthLabel}
          cong_name={congName}
          weekdays={weekdaysToShowFinal.map((d) => d.label)}
          cells={cells}
          updatedAt={lastUpdatedAt}
          lastModifiedBy={lastModifiedBy}
        />
      );

      const blob = await pdf(doc).toBlob();
      saveAs(blob, fileName);

      setPdfExportDialogOpen(false);
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'PDF generado y descargado con éxito.',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      displaySnackNotification({
        header: 'Error',
        message: 'No se pudo generar el archivo PDF.',
        severity: 'error',
      });
    }
  };

  // Dividir hermanos en recomendados y otros según la disponibilidad configurada
  const sortedBrothersForSlot = useMemo(() => {
    if (!editDialog.open || !settings) return { recommended: [], others: [] };

    const slotKey = editDialog.timeKey;
    const availabilityMap = settings.availability || {};

    const recommended = [];
    const others = [];

    for (const brother of enabledBrothers) {
      const allowedSlots = availabilityMap[brother.person_uid] || [];
      if (allowedSlots.includes(slotKey)) {
        recommended.push(brother);
      } else {
        others.push(brother);
      }
    }

    return { recommended, others };
  }, [editDialog.open, editDialog.timeKey, enabledBrothers, settings]);

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PageTitle
        title="Salidas de predicación"
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
                      onClick={() => {
                        setPdfExportMonth(selectedMonth);
                        setPdfExportYear(selectedYear);
                        setPdfExportDialogOpen(true);
                      }}
                      icon={<IconPrint />}
                      disabled={true}
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
                borderRadius: 'var(--r-lg)',
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
                  Seleccionar Año
                </Typography>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  size="small"
                  fullWidth
                  sx={{
                    borderRadius: 'var(--radius-m)',
                    borderColor: 'var(--line)',
                  }}
                >
                  {years.map((yr) => (
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
                        borderRadius: 'var(--radius-m)',
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
                  {monthsExpanded ? 'Cerrar selector ✕' : 'Cambiar Mes ▾'}
                </Typography>
              </ListItemButton>

              {monthsExpanded && (
                <Box sx={{ p: '16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-main)' }}>
                      Seleccionar Año
                    </Typography>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      size="small"
                      fullWidth
                      sx={{ borderRadius: 'var(--radius-m)' }}
                    >
                      {years.map((yr) => (
                        <MenuItem key={yr} value={yr}>
                          {yr}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-main)' }}>
                      Seleccionar Mes
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
                                setMonthsExpanded(false); // Collapse on month select
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

        {/* PANEL DERECHO: Planificador o Configuración */}
        <Box sx={{ flexGrow: 1, width: '100%' }}>
          {activeTab === 'planner' ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexDirection: { mobile: 'column', tablet: 'row' }, gap: '16px', width: '100%' }}>
                <Typography className="h2" style={{ color: 'var(--accent-main)', margin: 0 }}>
                  {`Programa de salidas — ${MONTH_NAMES[selectedMonth].toLowerCase()} ${selectedYear}`}
                </Typography>
                
                {/* Selector de modo de vista */}
                <Box sx={{ display: 'flex', gap: '4px', backgroundColor: 'var(--accent-150)', padding: '4px', borderRadius: 'var(--radius-m)', border: '1px solid var(--line)' }}>
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

              {plannerViewMode === 'lista' ? (
                /* Agrupar slots por semanas y días */
                (() => {
                  // 1. Agrupar slots por día primero
                  const dayMap = new Map<string, typeof outingsSlotsInMonth>();
                  for (const slot of outingsSlotsInMonth) {
                    const key = formatToDbDate(slot.date);
                    if (!dayMap.has(key)) dayMap.set(key, []);
                    dayMap.get(key)!.push(slot);
                  }

                  // 2. Agrupar los días resultantes por su semana de inicio (Lunes)
                  const weekMap = new Map<string, Array<{ dateKey: string; daySlots: typeof outingsSlotsInMonth }>>();
                  for (const [dateKey, daySlots] of dayMap.entries()) {
                    const dayDate = daySlots[0].date;
                    const weekOf = getWeekOfDate(dayDate); // "YYYY/MM/DD"
                    if (!weekMap.has(weekOf)) weekMap.set(weekOf, []);
                    weekMap.get(weekOf)!.push({ dateKey, daySlots });
                  }

                  // 3. Ordenar las semanas cronológicamente
                  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                  const slotLabel = (slotType: string): string => {
                    if (slotType.endsWith('_morning')) return 'Mañana';
                    if (slotType.endsWith('_afternoon')) return 'Tarde';
                    return '';
                  };

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

                  return sortedWeeks.map(([weekOf, days]) => {
                    const weekLabel = getWeekLabel(weekOf);
                    return (
                      <Box key={weekOf} sx={{ mb: '32px' }}>
                        {/* Título de la semana */}
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
                          {(() => {
                            const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);
                            return weekRecord?.isCircuitOverseerWeek && (
                              <Chip
                                label="Semana del superintendente"
                                size="small"
                                sx={{
                                  backgroundColor: 'var(--accent-main)',
                                  color: 'var(--always-white)',
                                  fontWeight: '700',
                                  fontSize: '11px',
                                  height: '20px',
                                }}
                              />
                            );
                          })()}
                          {isServiceCommittee && (
                            <IconButton
                              size="small"
                              onClick={() => handleOpenWeekSettings(weekOf)}
                              sx={{ color: 'var(--grey-500)', '&:hover': { color: 'var(--accent-main)' } }}
                            >
                              <IconSettings />
                            </IconButton>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {days.map(({ dateKey, daySlots }) => {
                            const dayDate = daySlots[0].date;
                            const dayLabel = formatLegibleDate(dayDate);

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
                                {/* Encabezado del día */}
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

                                {/* Filas de slots */}
                                {daySlots.map((slot, idx) => {
                                  const weekOfRecord = getWeekOfDate(slot.date);
                                  const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
                                  const outing = weekRecord?.outings?.find(
                                    (o) => o.date === dateKey && o.time === slot.time
                                  );
                                  const assignedBrother = persons.find(
                                    (b) => b.person_uid === outing?.person
                                  );
                                  let brotherName = '';
                                  if (outing?.person?.startsWith('SHARED_CONG:')) {
                                    brotherName = outing.person.replace('SHARED_CONG:', '');
                                  } else if (outing?.person === 'CIRCUIT_OVERSEER') {
                                    brotherName = 'Superintendente de circuito';
                                  } else if (assignedBrother) {
                                    brotherName = `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`;
                                  }
                                  const isAssignedToMe = outing?.person === currentPerson?.person_uid;
                                  const isCancelled = outing?.cancelled ?? false;
                                  const label = slotLabel(slot.slotType);

                                  return (
                                    <Box
                                      key={slot.slotId}
                                      onClick={() => handleOpenEdit(slot)}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        px: '16px',
                                        py: '14px',
                                        borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                                        backgroundColor: isCancelled
                                          ? '#fce8e6'
                                          : isAssignedToMe
                                          ? 'var(--accent-50, #f0f7ff)'
                                          : 'var(--card)',
                                        cursor: isServiceCommittee ? 'pointer' : 'default',
                                        transition: 'background-color 0.15s',
                                        '&:hover': isServiceCommittee
                                          ? { backgroundColor: isCancelled ? '#f8d7d4' : 'var(--accent-100)' }
                                          : {},
                                      }}
                                    >
                                      {/* Hora + etiqueta de turno */}
                                      <Box sx={{ minWidth: '80px' }}>
                                        <Typography
                                          style={{
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            color: isCancelled ? 'var(--grey-500)' : 'var(--accent-main)',
                                          }}
                                        >
                                          {slot.time}
                                        </Typography>
                                        {label && (
                                          <Typography
                                            style={{ fontSize: '12px', color: 'var(--grey-500)', fontWeight: '500' }}
                                          >
                                            {label}
                                          </Typography>
                                        )}
                                      </Box>

                                      <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--line)' }} />

                                      {/* Hermano asignado */}
                                      <Box sx={{ flex: 1 }}>
                                        {isCancelled ? (
                                          <Chip
                                            icon={<IconCancelFilled color="var(--error-main)" />}
                                            label="Suspendida"
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
                                              color: brotherName ? 'var(--black)' : 'var(--error-main)',
                                            }}
                                          >
                                            {brotherName || 'Sin asignar'}
                                          </Typography>
                                        )}
                                      </Box>

                                      {/* Lugar */}
                                      <Box sx={{ textAlign: 'right', minWidth: '120px' }}>
                                        <Typography
                                          style={{
                                            fontSize: '13px',
                                            color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
                                          }}
                                        >
                                          {isCancelled
                                            ? '—'
                                            : outing?.location || settings?.locations?.[0] || 'Salón del Reino'}
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
                    for (const slot of outingsSlotsInMonth) {
                      activeDays.add(slot.date.getDay());
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
                    const daySlotsMap = new Map<number, typeof outingsSlotsInMonth>();
                    for (const slot of outingsSlotsInMonth) {
                      const day = slot.date.getDate();
                      if (!daySlotsMap.has(day)) {
                        daySlotsMap.set(day, []);
                      }
                      daySlotsMap.get(day)!.push(slot);
                    }

                    const getAbbreviatedName = (fullName: string) => {
                      if (!fullName || fullName === 'Sin asignar') return 'Sin asignar';
                      if (fullName === 'Superintendente de circuito' || settings?.sharedSlots?.some((s) => s.congregation === fullName)) {
                        return fullName;
                      }
                      const parts = fullName.trim().split(/\s+/);
                      if (parts.length === 1) return parts[0];
                      const firstName = parts[0];
                      const lastName = parts[parts.length - 1];
                      return `${firstName.charAt(0)}. ${lastName}`;
                    };

                    return (
                      <Box sx={{
                        borderRadius: 'var(--r-lg)',
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
                                mb: '4px'
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
                                    border: '1px solid var(--line)',
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
                                          Sin salidas
                                        </Typography>
                                      ) : (
                                        daySlots.map((slot) => {
                                          const weekOfRecord = getWeekOfDate(slot.date);
                                          const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
                                          const outing = weekRecord?.outings?.find(
                                            (o) => o.date === formatToDbDate(slot.date) && o.time === slot.time
                                          );
                                          const assignedBrother = outing ? persons.find((b) => b.person_uid === outing.person) : null;
                                          let brotherName = '';
                                          if (outing?.person?.startsWith('SHARED_CONG:')) {
                                            brotherName = outing.person.replace('SHARED_CONG:', '');
                                          } else if (outing?.person === 'CIRCUIT_OVERSEER') {
                                            brotherName = 'Superintendente de circuito';
                                          } else if (assignedBrother) {
                                            brotherName = `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`;
                                          }
                                          const isAssignedToMe = outing?.person === currentPerson?.person_uid;
                                          const isCancelled = outing?.cancelled ?? false;
                                          
                                          const text = isCancelled ? 'Suspendida' : getAbbreviatedName(brotherName);
                                          
                                           let bgColor = '#e8f0fe';
                                           let textColor = 'var(--accent-dark)';
                                           let hoverBgColor = '#d2e3fc';
                                           
                                           if (isCancelled) {
                                             bgColor = '#fce8e6';
                                             textColor = 'var(--error-dark)';
                                             hoverBgColor = '#fad2cf';
                                           } else if (!brotherName) {
                                             bgColor = '#fef7e0';
                                             textColor = '#855000';
                                             hoverBgColor = '#feebb3';
                                           } else if (isAssignedToMe) {
                                             bgColor = 'var(--accent-main)';
                                             textColor = 'var(--always-white)';
                                             hoverBgColor = 'var(--accent-dark)';
                                           }

                                           return (
                                             <Box
                                               key={slot.slotId}
                                               onClick={() => handleOpenEdit(slot)}
                                               sx={{
                                                 backgroundColor: bgColor,
                                                 color: textColor,
                                                 border: 'none',
                                                 borderRadius: 'var(--radius-m)',
                                                 p: '6px 8px',
                                                 cursor: isServiceCommittee ? 'pointer' : 'default',
                                                 display: 'flex',
                                                 justifyContent: 'space-between',
                                                 alignItems: 'center',
                                                 gap: '6px',
                                                 transition: 'all 0.2s ease-in-out',
                                                 boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                                                 '&:hover': isServiceCommittee ? {
                                                   transform: 'translateY(-1px)',
                                                   boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                                   backgroundColor: hoverBgColor,
                                                 } : {}
                                               }}
                                             >
                                               <span style={{ fontWeight: '800', fontSize: '11.5px', whiteSpace: 'nowrap', opacity: 0.9 }}>
                                                 {slot.time}
                                               </span>
                                               <span style={{
                                                 overflow: 'hidden',
                                                 textOverflow: 'ellipsis',
                                                 whiteSpace: 'nowrap',
                                                 maxWidth: 'calc(100% - 42px)',
                                                 fontSize: '12px',
                                                 fontWeight: '700',
                                                 textAlign: 'right'
                                               }} title={brotherName || 'Sin asignar'}>
                                                 {text}
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
                                const weekOfRecord = getWeekOfDate(slot.date);
                                const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
                                const outing = weekRecord?.outings?.find(
                                  (o) => o.date === formatToDbDate(slot.date) && o.time === slot.time
                                );
                                const isCancelled = outing?.cancelled ?? false;
                                const brotherName = outing?.person ? 'assigned' : '';
                                if (isCancelled) return 'red';
                                if (brotherName) return 'green';
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
                                const selectedDaySlots = outingsSlotsInMonth.filter(
                                  (slot) => slot.date.getDate() === selectedDayNum
                                );

                                if (selectedDaySlots.length === 0) {
                                  return (
                                    <Box sx={{ p: '24px', textAlign: 'center' }}>
                                      <Typography style={{ color: 'var(--grey-500)', fontSize: '14px', fontStyle: 'italic' }}>
                                        No hay salidas programadas para este día.
                                      </Typography>
                                    </Box>
                                  );
                                }

                                const slotLabel = (slotType: string): string => {
                                  if (slotType.endsWith('_morning')) return 'Mañana';
                                  if (slotType.endsWith('_afternoon')) return 'Tarde';
                                  return '';
                                };

                                return selectedDaySlots.map((slot, idx) => {
                                  const weekOfRecord = getWeekOfDate(slot.date);
                                  const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
                                  const outing = weekRecord?.outings?.find(
                                    (o) => o.date === formatToDbDate(slot.date) && o.time === slot.time
                                  );
                                  const assignedBrother = outing ? persons.find((b) => b.person_uid === outing.person) : null;
                                  let brotherName = '';
                                  if (outing?.person?.startsWith('SHARED_CONG:')) {
                                    brotherName = outing.person.replace('SHARED_CONG:', '');
                                  } else if (outing?.person === 'CIRCUIT_OVERSEER') {
                                    brotherName = 'Superintendente de circuito';
                                  } else if (assignedBrother) {
                                    brotherName = `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`;
                                  }
                                  const isAssignedToMe = outing?.person === currentPerson?.person_uid;
                                  const isCancelled = outing?.cancelled ?? false;
                                  const label = slotLabel(slot.slotType);

                                  return (
                                    <Box
                                      key={slot.slotId}
                                      onClick={() => handleOpenEdit(slot)}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        px: '16px',
                                        py: '14px',
                                        borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                                        backgroundColor: isCancelled
                                          ? '#fce8e6'
                                          : isAssignedToMe
                                          ? 'var(--accent-50, #f0f7ff)'
                                          : 'var(--card)',
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
                                          {slot.time}
                                        </Typography>
                                        {label && (
                                          <Typography
                                            style={{ fontSize: '12px', color: 'var(--grey-500)', fontWeight: '500' }}
                                          >
                                            {label}
                                          </Typography>
                                        )}
                                      </Box>

                                      <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--line)' }} />

                                      <Box sx={{ flex: 1 }}>
                                        {isCancelled ? (
                                          <Chip
                                            icon={<IconCancelFilled color="var(--error-main)" />}
                                            label="Suspendida"
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
                                              color: brotherName ? 'var(--black)' : 'var(--error-main)',
                                            }}
                                          >
                                            {brotherName || 'Sin asignar'}
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
                                          {isCancelled
                                            ? '—'
                                            : outing?.location || settings?.locations?.[0] || 'Salón del Reino'}
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
          ) : (
            /* VISTA DE CONFIGURACIÓN GLOBAL */
            <Box
              sx={{
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
                maxWidth: '100%',
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
                  Configuración de salidas de predicación
                </Typography>
              </Box>
              <Box sx={{ padding: { mobile: '20px', tablet: '28px' } }}>

              <Tabs
                value={settingsSubTab}
                onChange={(_, val) => setSettingsSubTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  borderBottom: '1px solid var(--line)',
                  marginBottom: '28px',
                  width: '100%',
                  maxWidth: '100%',
                  '& .MuiTabs-scroller': {
                    overflowX: 'auto !important',
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'var(--accent-main)',
                    height: '3px',
                    borderRadius: '3px 3px 0 0',
                  },
                  '& .MuiTab-root': {
                    fontWeight: '700',
                    fontSize: '13.5px',
                    minHeight: '48px',
                    color: 'var(--grey-600)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    px: '20px',
                    '&.Mui-selected': {
                      color: 'var(--accent-main)',
                    },
                    '&:hover': {
                      color: 'var(--accent-dark)',
                      backgroundColor: 'rgba(48, 108, 180, 0.04)',
                      borderRadius: 'var(--radius-m) var(--radius-m) 0 0',
                    },
                  },
                }}
              >
                <Tab label="UBICACIONES" />
                <Tab label="HORARIOS" />
                <Tab label="DISPONIBILIDAD DE HERMANOS" />
                <Tab label="SALIDAS COMPARTIDAS" />
              </Tabs>

              {/* Sub-tab 0: Ubicaciones */}
              {settingsSubTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Lugares de salidas
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Configura los lugares habituales de reunión para las salidas de predicación de la congregación.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: '12px', maxWidth: '500px', width: '100%', flexDirection: { mobile: 'column', tablet: 'row' } }}>
                    <TextField
                      label="Nueva ubicación"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
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
                      onClick={handleAddLocation}
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

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
                      gap: '12px',
                      width: '100%',
                    }}
                  >
                    {settings?.locations?.map((loc) => (
                      <Card
                        key={loc}
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
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <IconLocation width={18} height={18} color="var(--accent-main)" />
                          <Typography style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--accent-dark)' }}>
                            {loc}
                          </Typography>
                        </Box>
                        {settings.locations && settings.locations.length > 1 && (
                          <IconButton
                            onClick={() => handleDeleteLocation(loc)}
                            sx={{
                              color: 'var(--error-main)',
                              padding: '6px',
                              borderRadius: 'var(--radius-m)',
                              '&:hover': {
                                backgroundColor: 'var(--error-light)',
                              },
                            }}
                            size="small"
                          >
                            <IconDelete color="var(--error-main)" />
                          </IconButton>
                        )}
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Sub-tab 1: Horarios Recurrentes */}
              {settingsSubTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Horarios semanales
                    </Typography>
                    <Typography style={{ fontSize: '13.5px', color: 'var(--grey-600)', marginTop: '4px' }}>
                      Define las horas de reunión y el estado activo/inactivo para cada día y horario de la semana.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr' },
                      gap: '16px',
                      width: '100%',
                    }}
                  >
                    {[
                      { dayLabel: 'Lunes', morningKey: 'monday_morning', afternoonKey: 'monday_afternoon' },
                      { dayLabel: 'Martes', morningKey: 'tuesday_morning', afternoonKey: 'tuesday_afternoon' },
                      { dayLabel: 'Miércoles', morningKey: 'wednesday_morning', afternoonKey: 'wednesday_afternoon' },
                      { dayLabel: 'Jueves', morningKey: 'thursday_morning', afternoonKey: 'thursday_afternoon' },
                      { dayLabel: 'Viernes', morningKey: 'friday_morning', afternoonKey: 'friday_afternoon' },
                      { dayLabel: 'Sábado', morningKey: 'saturday_morning', afternoonKey: 'saturday_afternoon' },
                      { dayLabel: 'Domingo', morningKey: 'sunday_morning', afternoonKey: 'sunday_afternoon' },
                    ].map((dayGroup) => {
                      return (
                        <Card
                          key={dayGroup.dayLabel}
                          sx={{
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-l)',
                            boxShadow: 'none',
                            overflow: 'hidden',
                            backgroundColor: 'var(--card)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              borderColor: 'var(--accent-main)',
                              boxShadow: '0 6px 16px rgba(48, 108, 180, 0.06)',
                            },
                          }}
                        >
                          {/* Day Header */}
                          <Box
                            sx={{
                              px: '16px',
                              py: '12px',
                              backgroundColor: 'var(--accent-100)',
                              borderBottom: '1px solid var(--line)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <IconCalendar width={18} height={18} color="var(--accent-dark)" />
                            <Typography style={{ fontWeight: '800', color: 'var(--accent-dark)', fontSize: '14.5px' }}>
                              {dayGroup.dayLabel}
                            </Typography>
                          </Box>

                          {/* Slots Rows */}
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            {[
                              { key: dayGroup.morningKey, label: 'Mañana' },
                              { key: dayGroup.afternoonKey, label: 'Tarde' }
                            ].map((slotItem, slotIdx) => {
                              const isDisabled = settings?.disabledSlots?.includes(slotItem.key) ?? false;
                              return (
                                <Box
                                  key={slotItem.key}
                                  sx={{
                                    p: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    borderTop: slotIdx > 0 ? '1px solid var(--line)' : 'none',
                                    backgroundColor: isDisabled ? 'var(--grey-50)' : 'var(--card)',
                                    transition: 'background-color 0.2s',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <Typography style={{ fontWeight: '700', color: isDisabled ? 'var(--grey-500)' : 'var(--accent-dark)', fontSize: '13.5px' }}>
                                        {slotItem.label}
                                      </Typography>
                                      <Typography style={{ fontSize: '11.5px', color: isDisabled ? 'var(--grey-400)' : 'var(--grey-600)' }}>
                                        {isDisabled ? 'Desactivado permanente' : 'Salida activa semanal'}
                                      </Typography>
                                    </Box>

                                    <FormControlLabel
                                      control={
                                        <Switch
                                          checked={!isDisabled}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            let currentDisabled = [...(settings?.disabledSlots ?? [])];
                                            if (checked) {
                                              currentDisabled = currentDisabled.filter((k) => k !== slotItem.key);
                                            } else {
                                              if (!currentDisabled.includes(slotItem.key)) {
                                                currentDisabled.push(slotItem.key);
                                              }
                                            }
                                            if (settings) {
                                              const updatedSettings = {
                                                ...settings,
                                                disabledSlots: currentDisabled,
                                              };
                                              setSettings(updatedSettings);
                                            }
                                          }}
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
                                      label={!isDisabled ? 'Habilitado' : 'Inactivo'}
                                      labelPlacement="start"
                                      sx={{
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          color: !isDisabled ? 'var(--accent-main)' : 'var(--grey-500)',
                                          mr: '6px',
                                        },
                                      }}
                                    />
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <TimePicker
                                      label="Hora de salida"
                                      ampm={!hour24}
                                      value={hoursConfig[slotItem.key] ? generateDateFromTime(hoursConfig[slotItem.key]) : null}
                                      onChange={(newDate) => {
                                        const hrs = String(newDate.getHours()).padStart(2, '0');
                                        const mins = String(newDate.getMinutes()).padStart(2, '0');
                                        setHoursConfig({ ...hoursConfig, [slotItem.key]: `${hrs}:${mins}` });
                                      }}
                                      readOnly={isDisabled}
                                      sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 'var(--radius-m)',
                                        }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </Card>
                      );
                    })}
                  </Box>

                  <Box sx={{ mt: '8px' }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveHoursConfig}
                      sx={{
                        backgroundColor: 'var(--accent-main)',
                        borderRadius: 'var(--radius-m)',
                        fontWeight: '700',
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      Guardar configuración de horas
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Sub-tab 2: Disponibilidad de Hermanos */}
              {settingsSubTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Box>
                    <Typography style={{ fontWeight: '800', fontSize: '16.5px', color: 'var(--accent-dark)' }}>
                      Disponibilidad preferente por hermano
                    </Typography>
                    <Typography style={{ color: 'var(--grey-600)', fontSize: '13.5px', marginTop: '4px' }}>
                      Marca los slots semanales en los que cada hermano suele estar disponible. Estos hermanos aparecerán destacados como recomendados al planificar.
                    </Typography>
                  </Box>

                  {enabledBrothers.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--line)',
                        borderRadius: 'var(--r-lg)',
                        justifyContent: 'center',
                        py: '40px',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13.5px', color: 'var(--accent-dark)', fontWeight: '600' }}>
                        No hay hermanos habilitados con el tick &quot;Salidas de predicación&quot; en sus perfiles personales.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      {enabledBrothers.map((bro) => {
                        const allowedSlots = settings?.availability?.[bro.person_uid] || [];
                        const firstname = bro.person_data.person_firstname.value || '';
                        const lastname = bro.person_data.person_lastname.value || '';
                        const displayName = `${firstname} ${lastname}`.trim();
                        const initial = displayName.charAt(0).toUpperCase() || 'H';

                        const ALL_SLOTS = [
                          { key: 'monday_morning', label: 'Lun Mañ' },
                          { key: 'monday_afternoon', label: 'Lun Tar' },
                          { key: 'tuesday_morning', label: 'Mar Mañ' },
                          { key: 'tuesday_afternoon', label: 'Mar Tar' },
                          { key: 'wednesday_morning', label: 'Mié Mañ' },
                          { key: 'wednesday_afternoon', label: 'Mié Tar' },
                          { key: 'thursday_morning', label: 'Jue Mañ' },
                          { key: 'thursday_afternoon', label: 'Jue Tar' },
                          { key: 'friday_morning', label: 'Vie Mañ' },
                          { key: 'friday_afternoon', label: 'Vie Tar' },
                          { key: 'saturday_morning', label: 'Sáb Mañ' },
                          { key: 'saturday_afternoon', label: 'Sáb Tar' },
                          { key: 'sunday_morning', label: 'Dom Mañ' },
                          { key: 'sunday_afternoon', label: 'Dom Tar' },
                        ];

                        const activeSlots = ALL_SLOTS.filter(s => !settings?.disabledSlots?.includes(s.key));

                        return (
                          <Card
                            key={bro.person_uid}
                            sx={{
                              padding: '16px 20px',
                              display: 'flex',
                              flexDirection: { mobile: 'column', tablet: 'row' },
                              alignItems: { mobile: 'flex-start', tablet: 'center' },
                              justifyContent: 'space-between',
                              gap: '16px',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              backgroundColor: 'var(--card)',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                boxShadow: '0 6px 16px rgba(48, 108, 180, 0.06)',
                              },
                            }}
                          >
                            {/* Profile Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                              <Box
                                sx={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--accent-150)',
                                  border: '1px solid var(--line)',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography style={{ fontWeight: '800', fontSize: '12.5px', color: 'var(--accent-dark)' }}>
                                  {initial}
                                </Typography>
                              </Box>
                              <Typography style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--black)' }}>
                                {displayName}
                              </Typography>
                            </Box>

                            {/* Active Slots Wrap */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, width: '100%' }}>
                              {activeSlots.length === 0 ? (
                                <Typography style={{ fontSize: '12px', color: 'var(--grey-400)', fontStyle: 'italic' }}>
                                  No hay horarios semanales activos habilitados en la pestaña &quot;Horarios&quot;.
                                </Typography>
                              ) : (
                                activeSlots.map((slot) => {
                                  const isChecked = allowedSlots.includes(slot.key);
                                  return (
                                    <Chip
                                      key={slot.key}
                                      label={slot.label}
                                      onClick={() => handleToggleAvailability(bro.person_uid, slot.key)}
                                      sx={{
                                        fontWeight: '700',
                                        fontSize: '11.5px',
                                        borderRadius: 'var(--radius-m)',
                                        cursor: 'pointer',
                                        height: '28px',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        backgroundColor: isChecked ? 'var(--accent-main)' : 'var(--grey-100)',
                                        color: isChecked ? 'var(--always-white)' : 'var(--grey-600)',
                                        border: `1px solid ${isChecked ? 'var(--accent-main)' : 'var(--grey-300)'}`,
                                        '&:hover': {
                                          backgroundColor: isChecked ? 'var(--accent-dark)' : 'var(--accent-100)',
                                          borderColor: isChecked ? 'var(--accent-dark)' : 'var(--line)',
                                          transform: 'scale(1.04)',
                                        },
                                      }}
                                    />
                                  );
                                })
                              )}
                            </Box>
                          </Card>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}

              {/* Sub-tab 3: Salidas compartidas */}
              {settingsSubTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Typography className="h3">Salidas compartidas con otras congregaciones</Typography>
                  <Typography style={{ color: 'var(--grey-600)', fontSize: '14px' }}>
                    Registra los turnos de salidas semanales que se llevan a cabo de forma conjunta con congregaciones vecinas. Al planificar, podrás asignar la congregación directamente en lugar de un hermano.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: '16px', maxWidth: '600px', width: '100%', flexDirection: { mobile: 'column', tablet: 'row' }, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <Typography style={{ fontWeight: '600', fontSize: '13px', color: 'var(--accent-main)' }}>
                        Turno de la semana
                      </Typography>
                      <Select
                        value={sharedSlotKey}
                        onChange={(e) => setSharedSlotKey(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ borderRadius: 'var(--radius-m)' }}
                      >
                        {[
                          { key: 'monday_morning', label: 'Lunes Mañana' },
                          { key: 'monday_afternoon', label: 'Lunes Tarde' },
                          { key: 'tuesday_morning', label: 'Martes Mañana' },
                          { key: 'tuesday_afternoon', label: 'Martes Tarde' },
                          { key: 'wednesday_morning', label: 'Miércoles Mañana' },
                          { key: 'wednesday_afternoon', label: 'Miércoles Tarde' },
                          { key: 'thursday_morning', label: 'Jueves Mañana' },
                          { key: 'thursday_afternoon', label: 'Jueves Tarde' },
                          { key: 'friday_morning', label: 'Viernes Mañana' },
                          { key: 'friday_afternoon', label: 'Viernes Tarde' },
                          { key: 'saturday_morning', label: 'Sábado Mañana' },
                          { key: 'saturday_afternoon', label: 'Sábado Tarde' },
                          { key: 'sunday_morning', label: 'Domingo Mañana' },
                          { key: 'sunday_afternoon', label: 'Domingo Tarde' },
                        ].map((s) => (
                          <MenuItem key={s.key} value={s.key}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <Typography style={{ fontWeight: '600', fontSize: '13px', color: 'var(--accent-main)' }}>
                        Congregación vecina
                      </Typography>
                      <TextField
                        label="Nombre de la congregación"
                        value={sharedCongregation}
                        onChange={(e) => setSharedCongregation(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 'var(--radius-m)',
                          }
                        }}
                      />
                    </Box>

                    <Button
                      variant="contained"
                      onClick={handleAddSharedSlot}
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
                        height: '40px',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      Añadir
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', tablet: '1fr 1fr', laptop: '1fr 1fr 1fr' },
                      gap: '12px',
                      width: '100%',
                    }}
                  >
                    {settings?.sharedSlots?.map((slot) => {
                      const slotLabels: Record<string, string> = {
                        monday_morning: 'Lunes Mañana',
                        monday_afternoon: 'Lunes Tarde',
                        tuesday_morning: 'Martes Mañana',
                        tuesday_afternoon: 'Martes Tarde',
                        wednesday_morning: 'Miércoles Mañana',
                        wednesday_afternoon: 'Miércoles Tarde',
                        thursday_morning: 'Jueves Mañana',
                        thursday_afternoon: 'Jueves Tarde',
                        friday_morning: 'Viernes Mañana',
                        friday_afternoon: 'Viernes Tarde',
                        saturday_morning: 'Sábado Mañana',
                        saturday_afternoon: 'Sábado Tarde',
                        sunday_morning: 'Domingo Mañana',
                        sunday_afternoon: 'Domingo Tarde',
                      };
                      return (
                        <Card
                          key={slot.slotKey}
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
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Box
                              sx={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--accent-150)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <IconGroups width={18} height={18} color="var(--accent-dark)" />
                            </Box>
                            <Box>
                              <Typography style={{ fontWeight: '700', color: 'var(--accent-dark)', fontSize: '13.5px' }}>
                                {slotLabels[slot.slotKey]}
                              </Typography>
                              <Typography style={{ fontSize: '12px', color: 'var(--grey-600)', marginTop: '2px' }}>
                                Compartido con: <strong>{slot.congregation}</strong>
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton
                            onClick={() => handleDeleteSharedSlot(slot.slotKey)}
                            sx={{
                              color: 'var(--error-main)',
                              padding: '6px',
                              borderRadius: 'var(--radius-m)',
                              '&:hover': {
                                backgroundColor: 'var(--error-light)',
                              },
                            }}
                            size="small"
                          >
                            <IconDelete color="var(--error-main)" />
                          </IconButton>
                        </Card>
                      );
                    })}
                  </Box>
                  {(!settings?.sharedSlots || settings.sharedSlots.length === 0) && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--accent-50)',
                        border: '1px dashed var(--line)',
                        borderRadius: 'var(--r-lg)',
                        justifyContent: 'center',
                        py: '30px',
                        width: '100%',
                      }}
                    >
                      <IconInfo color="var(--accent-main)" />
                      <Typography style={{ fontSize: '13.5px', color: 'var(--accent-dark)', fontWeight: '600' }}>
                        No hay ninguna salida compartida configurada.
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
             </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* DIÁLOGO DE EDICIÓN DE SALIDA */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        fullWidth
        maxWidth={false}
        sx={{ '& .MuiDialog-paper': { maxWidth: '480px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--r-lg)',
            padding: '8px',
          },
        }}
      >
        <DialogTitle style={{ fontWeight: '600', color: 'var(--accent-dark)' }}>
          {editDialog.date && `${formatLegibleDate(editDialog.date)} — ${editDialog.time}`}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '20px', mt: '8px' }}>
          {/* Botón de cancelación de bajo perfil */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: '4px' }}>
            <Button
              variant="outlined"
              onClick={() => setEditCancelled(!editCancelled)}
              sx={{
                borderRadius: 'var(--radius-m)',
                fontWeight: '600',
                textTransform: 'none',
                fontSize: '13px',
                py: '6px',
                px: '16px',
                boxShadow: 'none',
                borderColor: editCancelled ? 'var(--accent-main)' : 'var(--error-main)',
                color: editCancelled ? 'var(--accent-main)' : 'var(--error-main)',
                '&:hover': {
                  backgroundColor: editCancelled ? 'var(--accent-150)' : 'var(--error-150)',
                  borderColor: editCancelled ? 'var(--accent-main)' : 'var(--error-main)',
                }
              }}
            >
              {editCancelled ? 'Reactivar salida' : 'Suspender salida'}
            </Button>
          </Box>

          {!editCancelled && (
            <>
              {/* Asignar Hermano */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Typography style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-dark)' }}>
                  Asignar conductor
                </Typography>
                <Select
                  value={editPerson}
                  onChange={(e) => setEditPerson(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ borderRadius: 'var(--radius-m)' }}
                >
                  <MenuItem value="">
                    <em>Ninguno / Sin asignar</em>
                  </MenuItem>

                  {(() => {
                    const weekOf = editDialog.date ? getWeekOfDate(editDialog.date) : '';
                    const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOf);
                    const isCOWeek = weekRecord?.isCircuitOverseerWeek ?? false;
                    const sharedSlot = settings?.sharedSlots?.find((s) => s.slotKey === editDialog.timeKey);
                    
                    const list = [];
                    if (sharedSlot) {
                      list.push(
                        <MenuItem key="shared-cong" value={`SHARED_CONG:${sharedSlot.congregation}`}>
                          <strong>Compartido: {sharedSlot.congregation}</strong>
                        </MenuItem>
                      );
                    }
                    if (isCOWeek) {
                      list.push(
                        <MenuItem key="circuit-overseer" value="CIRCUIT_OVERSEER">
                          <strong>Superintendente de circuito</strong>
                        </MenuItem>
                      );
                    }
                    return list;
                  })()}

                  {/* Grupo Recomendados */}
                  {sortedBrothersForSlot.recommended.length > 0 && (
                    <ListSubheader key="header-recommended" sx={{ color: 'var(--accent-main)', fontWeight: '700', lineHeight: '36px', backgroundColor: 'var(--card)' }}>
                      RECOMENDADOS (DISPONIBLES HOY)
                    </ListSubheader>
                  )}
                  {sortedBrothersForSlot.recommended.map((bro) => (
                    <MenuItem key={bro.person_uid} value={bro.person_uid} sx={{ pl: '24px' }}>
                      {`${bro.person_data.person_firstname.value} ${bro.person_data.person_lastname.value}`}
                    </MenuItem>
                  ))}

                  {/* Grupo Otros */}
                  {sortedBrothersForSlot.others.length > 0 && (
                    <ListSubheader key="header-others" sx={{ color: 'var(--grey-600)', fontWeight: '700', lineHeight: '36px', backgroundColor: 'var(--card)' }}>
                      OTROS HERMANOS
                    </ListSubheader>
                  )}
                  {sortedBrothersForSlot.others.map((bro) => (
                    <MenuItem key={bro.person_uid} value={bro.person_uid} sx={{ pl: '24px' }}>
                      {`${bro.person_data.person_firstname.value} ${bro.person_data.person_lastname.value}`}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Asignar Ubicación */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Typography style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-dark)' }}>
                  Lugar de reunión
                </Typography>
                <Select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ borderRadius: 'var(--radius-m)' }}
                >
                  {settings?.locations?.map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ padding: '16px' }}>
          <Button
            onClick={() => setEditDialog({ ...editDialog, open: false })}
            sx={{ color: 'var(--grey-600)', fontWeight: '600' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveOuting}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '600',
              '&:hover': {
                backgroundColor: 'var(--accent-dark)',
              },
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO DE EXPORTACIÓN DE PDF */}
      <Dialog
        open={pdfExportDialogOpen}
        onClose={() => setPdfExportDialogOpen(false)}
        fullWidth
        maxWidth={false}
        sx={{ '& .MuiDialog-paper': { maxWidth: '400px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--r-lg)',
            padding: '12px',
          },
        }}
      >
        <DialogTitle style={{ fontWeight: '700', color: 'var(--accent-dark)', fontSize: '18px' }}>
          Exportar programa a PDF
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '20px', mt: '8px' }}>
          <Typography style={{ color: 'var(--grey-600)', fontSize: '14px' }}>
            Selecciona el mes y año que deseas exportar en formato A4 horizontal.
          </Typography>

          <Box sx={{ display: 'flex', gap: '16px', width: '100%' }}>
            {/* Selector de Mes */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Typography style={{ fontWeight: '600', fontSize: '12px', color: 'var(--grey-600)' }}>
                Mes
              </Typography>
              <Select
                value={pdfExportMonth}
                onChange={(e) => setPdfExportMonth(Number(e.target.value))}
                fullWidth
                size="small"
                sx={{ borderRadius: 'var(--radius-m)' }}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <MenuItem key={name} value={idx}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Selector de Año */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Typography style={{ fontWeight: '600', fontSize: '12px', color: 'var(--grey-600)' }}>
                Año
              </Typography>
              <Select
                value={pdfExportYear}
                onChange={(e) => setPdfExportYear(Number(e.target.value))}
                fullWidth
                size="small"
                sx={{ borderRadius: 'var(--radius-m)' }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          <Button
            onClick={() => setPdfExportDialogOpen(false)}
            sx={{ color: 'var(--grey-600)', fontWeight: '600', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '600',
              textTransform: 'none',
              borderRadius: 'var(--radius-m)',
              '&:hover': {
                backgroundColor: 'var(--accent-dark)',
              },
            }}
          >
            Exportar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO DE AJUSTES SEMANALES (SEMANA DEL SUPERINTENDENTE / HORARIOS LOCALES) */}
      <Dialog
        open={weekSettingsDialog.open}
        onClose={() => setWeekSettingsDialog({ ...weekSettingsDialog, open: false })}
        fullWidth
        maxWidth={false}
        sx={{ '& .MuiDialog-paper': { maxWidth: '440px', width: '100%' } }}
        PaperProps={{
          style: {
            borderRadius: 'var(--r-lg)',
            padding: '12px',
          },
        }}
      >
        <DialogTitle style={{ fontWeight: '700', color: 'var(--accent-dark)', fontSize: '18px' }}>
          Ajustes de la semana
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px', mt: '8px' }}>
          <Typography style={{ color: 'var(--grey-600)', fontSize: '14px', marginBottom: '8px' }}>
            Personaliza el comportamiento y los horarios de la semana del <strong>{weekSettingsDialog.weekOf}</strong>.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={tempCOWeek}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTempCOWeek(checked);
                  if (!checked) {
                    setShowAdjustHours(false);
                  }
                }}
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
            label="Semana del superintendente de circuito"
            labelPlacement="start"
            sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', margin: 0 }}
          />

          {tempCOWeek && !showAdjustHours && (
            <Box sx={{ mt: '12px', p: '16px', borderRadius: 'var(--radius-l)', backgroundColor: 'var(--accent-100)', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--line)' }}>
              <Typography style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--accent-dark)', margin: 0 }}>
                ¿Deseas ajustar el horario de las salidas de esta semana?
              </Typography>
              <Box sx={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setShowAdjustHours(true);
                    const defaultHours = settings?.defaultHours || {
                      monday_morning: '10:00',
                      monday_afternoon: '17:00',
                      tuesday_morning: '10:00',
                      tuesday_afternoon: '17:00',
                      wednesday_morning: '10:00',
                      wednesday_afternoon: '17:00',
                      thursday_morning: '10:00',
                      thursday_afternoon: '17:00',
                      friday_morning: '10:00',
                      friday_afternoon: '17:30',
                      saturday_morning: '09:45',
                      saturday_afternoon: '17:00',
                      sunday_morning: '10:30',
                      sunday_afternoon: '17:00',
                    };
                    setWeekHoursConfig(defaultHours);
                  }}
                  sx={{ backgroundColor: 'var(--accent-main)', textTransform: 'none', fontWeight: '700', borderRadius: 'var(--radius-m)', boxShadow: 'none' }}
                >
                  Sí
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setShowAdjustHours(false);
                  }}
                  sx={{ borderColor: 'var(--accent-main)', color: 'var(--accent-main)', textTransform: 'none', fontWeight: '700', borderRadius: 'var(--radius-m)' }}
                >
                  No
                </Button>
              </Box>
            </Box>
          )}

          {showAdjustHours && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', mt: '16px', maxHeight: '250px', overflowY: 'auto', pr: '8px', borderTop: '1px solid var(--line)', pt: '16px' }}>
              <Typography style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-main)', margin: 0 }}>
                Horarios específicos de esta semana
              </Typography>
              {[
                { key: 'monday_morning', label: 'Lunes Mañana' },
                { key: 'monday_afternoon', label: 'Lunes Tarde' },
                { key: 'tuesday_morning', label: 'Martes Mañana' },
                { key: 'tuesday_afternoon', label: 'Martes Tarde' },
                { key: 'wednesday_morning', label: 'Miércoles Mañana' },
                { key: 'wednesday_afternoon', label: 'Miércoles Tarde' },
                { key: 'thursday_morning', label: 'Jueves Mañana' },
                { key: 'thursday_afternoon', label: 'Jueves Tarde' },
                { key: 'friday_morning', label: 'Viernes Mañana' },
                { key: 'friday_afternoon', label: 'Viernes Tarde' },
                { key: 'saturday_morning', label: 'Sábado Mañana' },
                { key: 'saturday_afternoon', label: 'Sábado Tarde' },
                { key: 'sunday_morning', label: 'Domingo Mañana' },
                { key: 'sunday_afternoon', label: 'Domingo Tarde' },
              ].map((slot) => {
                const isSlotDisabled = settings?.disabledSlots?.includes(slot.key);
                if (isSlotDisabled) return null;

                const currentVal = weekHoursConfig[slot.key] || settings?.defaultHours?.[slot.key] || (slot.key.endsWith('morning') ? '10:00' : '17:00');
                return (
                  <Box key={slot.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <Typography style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--black)' }}>
                      {slot.label}
                    </Typography>
                    <TimePicker
                      ampm={!hour24}
                      value={generateDateFromTime(currentVal)}
                      onChange={(newDate) => {
                        const hrs = String(newDate.getHours()).padStart(2, '0');
                        const mins = String(newDate.getMinutes()).padStart(2, '0');
                        setWeekHoursConfig({ ...weekHoursConfig, [slot.key]: `${hrs}:${mins}` });
                      }}
                      sx={{ width: '130px' }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ padding: '16px', gap: '8px' }}>
          <Button
            onClick={handleAutofillWeek}
            variant="outlined"
            startIcon={<IconSparkles />}
            sx={{
              borderColor: 'var(--accent-main)',
              color: 'var(--accent-main)',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: 'var(--radius-m)',
              '&:hover': {
                backgroundColor: 'var(--accent-150)',
                borderColor: 'var(--accent-main)',
              },
            }}
          >
            Autocompletar
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            onClick={() => setWeekSettingsDialog({ ...weekSettingsDialog, open: false })}
            sx={{ color: 'var(--grey-600)', fontWeight: '600', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveWeekSettings}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-main)',
              fontWeight: '600',
              textTransform: 'none',
              borderRadius: 'var(--radius-m)',
              '&:hover': {
                backgroundColor: 'var(--accent-dark)',
              },
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PredicacionSalidas;
