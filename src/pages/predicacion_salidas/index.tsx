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
} from '@components/icons';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { personsState } from '@states/persons';
import TimePicker from '@components/time_picker';
import { generateDateFromTime } from '@utils/date';
import { hour24FormatState } from '@states/settings';
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
      tuesday_morning: '10:00',
      tuesday_afternoon: '17:00',
      wednesday_morning: '10:00',
      wednesday_afternoon: '17:00',
      thursday_morning: '10:00',
      thursday_afternoon: '17:00',
      friday: '17:30',
      saturday: '09:45',
      sunday: '10:30',
    };

    const slots = [];
    const disabledSlots = settings.disabledSlots || [];
    // Recorrer todos los días del mes
    const date = new Date(selectedYear, selectedMonth, 1);
    while (date.getMonth() === selectedMonth) {
      const dayOfWeek = date.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb

      // Martes (2), Miércoles (3), Jueves (4)
      if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
        const dayLabel = dayOfWeek === 2 ? 'tuesday' : dayOfWeek === 3 ? 'wednesday' : 'thursday';
        const morningType = `${dayLabel}_morning`;
        if (!disabledSlots.includes(morningType)) {
          slots.push({
            date: new Date(date),
            slotType: morningType,
            time: defaultHours[morningType as keyof typeof defaultHours] || '10:00',
            slotId: `${formatToDbDate(date)}_morning`,
          });
        }
        const afternoonType = `${dayLabel}_afternoon`;
        if (!disabledSlots.includes(afternoonType)) {
          slots.push({
            date: new Date(date),
            slotType: afternoonType,
            time: defaultHours[afternoonType as keyof typeof defaultHours] || '17:00',
            slotId: `${formatToDbDate(date)}_afternoon`,
          });
        }
      }
      // Viernes (5)
      else if (dayOfWeek === 5) {
        if (!disabledSlots.includes('friday')) {
          slots.push({
            date: new Date(date),
            slotType: 'friday',
            time: defaultHours.friday || '17:30',
            slotId: `${formatToDbDate(date)}_fri`,
          });
        }
      }
      // Sábado (6)
      else if (dayOfWeek === 6) {
        if (!disabledSlots.includes('saturday')) {
          slots.push({
            date: new Date(date),
            slotType: 'saturday',
            time: defaultHours.saturday || '09:45',
            slotId: `${formatToDbDate(date)}_sat`,
          });
        }
      }
      // Domingo (0)
      else if (dayOfWeek === 0) {
        if (!disabledSlots.includes('sunday')) {
          slots.push({
            date: new Date(date),
            slotType: 'sunday',
            time: defaultHours.sunday || '10:30',
            slotId: `${formatToDbDate(date)}_sun`,
          });
        }
      }

      date.setDate(date.getDate() + 1);
    }
    return slots;
  }, [selectedYear, selectedMonth, settings]);

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

    // Agregar nueva salida
    weekRecord.outings.push({
      id: editDialog.outingId,
      date: dbDate,
      time: editDialog.time,
      person: editPerson,
      location: editLocation,
      cancelled: editCancelled,
    });

    // Guardar localmente en Dexie y reactivar Jotai
    await dbServiceOutingsSaveWeek(weekRecord);
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
    setSettings(updatedSettings);
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
              <NavBarButton
                text={activeTab === 'planner' ? 'Configuración' : 'Programa'}
                onClick={() => setActiveTab(activeTab === 'planner' ? 'settings' : 'planner')}
                icon={activeTab === 'planner' ? <IconSettings /> : <IconCalendar />}
              />
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
                  Seleccionar Año
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
                  {years.map((yr) => (
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
                  {monthsExpanded ? 'Cerrar selector ✕' : 'Cambiar Mes ▾'}
                </Typography>
              </ListItemButton>

              {monthsExpanded && (
                <Box sx={{ p: '16px', borderTop: '1px solid var(--accent-300)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* PANEL DERECHO: Planificador o Configuración */}
        <Box sx={{ flexGrow: 1, width: '100%' }}>
          {activeTab === 'planner' ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexDirection: { mobile: 'column', tablet: 'row' }, gap: '16px', width: '100%' }}>
                <Typography className="h2" style={{ color: 'var(--accent-main)', margin: 0 }}>
                  {`Programa de salidas — ${MONTH_NAMES[selectedMonth].toLowerCase()} ${selectedYear}`}
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
                        <Typography
                          className="h3"
                          style={{
                            fontWeight: '700',
                            color: 'var(--accent-main)',
                            marginBottom: '12px',
                            textTransform: 'none',
                            borderLeft: '4px solid var(--accent-main)',
                            paddingLeft: '12px',
                          }}
                        >
                          {weekLabel}
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {days.map(({ dateKey, daySlots }) => {
                            const dayDate = daySlots[0].date;
                            const dayLabel = formatLegibleDate(dayDate);

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
                                {/* Encabezado del día */}
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
                                  const brotherName = assignedBrother
                                    ? `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`
                                    : '';
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
                                        borderTop: idx > 0 ? '1px solid var(--accent-200)' : 'none',
                                        backgroundColor: isCancelled
                                          ? '#fce8e6'
                                          : isAssignedToMe
                                          ? 'var(--accent-50, #f0f7ff)'
                                          : 'var(--white)',
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

                                      <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--accent-200)' }} />

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
                    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
                    const firstDayOfWeek = firstDayOfMonth.getDay();
                    // offset to align Monday as 0
                    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                    
                    const cells: Array<{ type: 'empty'; id: string } | { type: 'day'; dayNum: number; date: Date }> = [];
                    
                    // Empty start padding
                    for (let i = 0; i < offset; i++) {
                      cells.push({ type: 'empty', id: `empty-start-${i}` });
                    }
                    
                    // Day cells
                    for (let d = 1; d <= daysInMonth; d++) {
                      cells.push({
                        type: 'day',
                        dayNum: d,
                        date: new Date(selectedYear, selectedMonth, d)
                      });
                    }
                    
                    // Empty end padding
                    const totalSoFar = cells.length;
                    const remaining = totalSoFar % 7;
                    const paddingEnd = remaining === 0 ? 0 : 7 - remaining;
                    for (let i = 0; i < paddingEnd; i++) {
                      cells.push({ type: 'empty', id: `empty-end-${i}` });
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
                      if (!fullName) return 'Sin asignar';
                      const parts = fullName.trim().split(/\s+/);
                      if (parts.length === 1) return parts[0];
                      const firstName = parts[0];
                      const lastName = parts[parts.length - 1];
                      return `${firstName.charAt(0)}. ${lastName}`;
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
                        <Grid container spacing={1} columns={7} sx={{ width: '100%', margin: 0 }}>
                          {['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.'].map((day) => (
                            <Grid size={{ mobile: 1 }} key={day} sx={{ p: 0.5 }}>
                              <Box sx={{
                                textAlign: 'center',
                                py: '6px',
                                borderBottom: '2px solid var(--accent-300)',
                                mb: '4px'
                              }}>
                                <Typography style={{ fontWeight: '700', fontSize: '12px', color: 'var(--accent-main)', textTransform: 'none' }}>
                                  {day}
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
                                          Sin salidas
                                        </Typography>
                                      ) : (
                                        daySlots.map((slot) => {
                                          const weekOfRecord = getWeekOfDate(slot.date);
                                          const weekRecord = outingsWeeks.find((w) => w.weekOf === weekOfRecord);
                                          const outing = weekRecord?.outings?.find(
                                            (o) => o.date === formatToDbDate(slot.date) && o.time === slot.time
                                          );
                                          const assignedBrother = persons.find(
                                            (b) => b.person_uid === outing?.person
                                          );
                                          const brotherName = assignedBrother
                                            ? `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`
                                            : '';
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
                                  const assignedBrother = persons.find(
                                    (b) => b.person_uid === outing?.person
                                  );
                                  const brotherName = assignedBrother
                                    ? `${assignedBrother.person_data.person_firstname.value} ${assignedBrother.person_data.person_lastname.value}`
                                    : '';
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
                                        borderTop: idx > 0 ? '1px solid var(--accent-200)' : 'none',
                                        backgroundColor: isCancelled
                                          ? '#fce8e6'
                                          : isAssignedToMe
                                          ? 'var(--accent-50, #f0f7ff)'
                                          : 'var(--white)',
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

                                      <Box sx={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--accent-200)' }} />

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
                border: '1px solid var(--accent-300)',
                backgroundColor: 'var(--white)',
                padding: { mobile: '16px', tablet: '24px' },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <Typography className="h2" style={{ marginBottom: '16px', color: 'var(--accent-main)' }}>
                Configuración de salidas de predicación
              </Typography>

              <Tabs
                value={settingsSubTab}
                onChange={(_, val) => setSettingsSubTab(val)}
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
                    fontWeight: '600',
                    color: 'var(--grey-600)',
                    '&.Mui-selected': {
                      color: 'var(--accent-main)',
                    },
                  },
                }}
              >
                <Tab label="Ubicaciones" />
                <Tab label="Horarios" />
                <Tab label="Disponibilidad de hermanos" />
              </Tabs>

              {/* Sub-tab 0: Ubicaciones */}
              {settingsSubTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Typography className="h3">Lugares de salidas</Typography>
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

                  <List sx={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {settings?.locations?.map((loc) => (
                      <Card
                        key={loc}
                        sx={{
                          padding: '8px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid var(--accent-300)',
                          borderRadius: 'var(--radius-m)',
                          boxShadow: 'none',
                        }}
                      >
                        <Typography style={{ fontWeight: '500' }}>{loc}</Typography>
                        {settings.locations && settings.locations.length > 1 && (
                          <IconButton onClick={() => handleDeleteLocation(loc)} sx={{ color: 'var(--error-main)' }} size="small">
                            <IconDelete color="var(--error-main)" />
                          </IconButton>
                        )}
                      </Card>
                    ))}
                  </List>
                </Box>
              )}

              {/* Sub-tab 1: Horarios Recurrentes */}
              {settingsSubTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Typography className="h3">Horarios semanales</Typography>

                  <Grid container spacing={2} sx={{ maxWidth: '600px' }}>
                    {[
                      { key: 'tuesday_morning', label: 'Martes Mañana' },
                      { key: 'tuesday_afternoon', label: 'Martes Tarde' },
                      { key: 'wednesday_morning', label: 'Miércoles Mañana' },
                      { key: 'wednesday_afternoon', label: 'Miércoles Tarde' },
                      { key: 'thursday_morning', label: 'Jueves Mañana' },
                      { key: 'thursday_afternoon', label: 'Jueves Tarde' },
                      { key: 'friday', label: 'Viernes' },
                      { key: 'saturday', label: 'Sábado' },
                      { key: 'sunday', label: 'Domingo' },
                    ].map((item) => {
                      const isDisabled = settings?.disabledSlots?.includes(item.key) ?? false;
                      return (
                        <Grid size={{ mobile: 12 }} key={item.key}>
                          <Card
                            sx={{
                              padding: '16px',
                              display: 'flex',
                              flexDirection: desktopUp ? 'row' : 'column',
                              alignItems: desktopUp ? 'center' : 'flex-start',
                              justifyContent: 'space-between',
                              gap: '16px',
                              border: '1px solid var(--accent-300)',
                              borderRadius: 'var(--radius-m)',
                              boxShadow: 'none',
                              backgroundColor: isDisabled ? 'var(--grey-100)' : 'var(--white)',
                              width: '100%',
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography style={{ fontWeight: '600', color: isDisabled ? 'var(--grey-500)' : 'var(--accent-dark)' }}>
                                {item.label}
                              </Typography>
                              <Typography style={{ fontSize: '12px', color: 'var(--grey-600)' }}>
                                {isDisabled ? 'Desactivado permanente' : 'Salida activa semanal'}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', width: desktopUp ? 'auto' : '100%', justifyContent: 'space-between' }}>
                              <TimePicker
                                label="Hora de salida"
                                ampm={!hour24}
                                value={hoursConfig[item.key] ? generateDateFromTime(hoursConfig[item.key]) : null}
                                onChange={(newDate) => {
                                  const hrs = String(newDate.getHours()).padStart(2, '0');
                                  const mins = String(newDate.getMinutes()).padStart(2, '0');
                                  setHoursConfig({ ...hoursConfig, [item.key]: `${hrs}:${mins}` });
                                }}
                                readOnly={isDisabled}
                                sx={{ width: '150px' }}
                              />
                              
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={!isDisabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      let currentDisabled = [...(settings?.disabledSlots ?? [])];
                                      if (checked) {
                                        currentDisabled = currentDisabled.filter((k) => k !== item.key);
                                      } else {
                                        if (!currentDisabled.includes(item.key)) {
                                          currentDisabled.push(item.key);
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
                                label={!isDisabled ? 'Habilitado' : 'Deshabilitado'}
                                labelPlacement="start"
                              />
                            </Box>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box>
                    <Button
                      variant="contained"
                      onClick={handleSaveHoursConfig}
                      sx={{
                        backgroundColor: 'var(--accent-main)',
                        '&:hover': {
                          backgroundColor: 'var(--accent-dark)',
                        },
                      }}
                    >
                      Guardar Configuración de Horas
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Sub-tab 2: Disponibilidad de Hermanos */}
              {settingsSubTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Typography className="h3">Disponibilidad Preferente por Hermano</Typography>
                  <Typography style={{ color: 'var(--grey-600)', fontSize: '14px' }}>
                    Marca los slots semanales en los que cada hermano suele estar disponible. Estos hermanos aparecerán arriba como recomendados al planificar.
                  </Typography>

                  <Box sx={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '800px',
                        border: '1px solid var(--accent-300)',
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: 'var(--accent-100)', borderBottom: '2px solid var(--accent-300)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Hermano</th>
                          {[
                            { key: 'tuesday_morning', label: 'Mar Mañ' },
                            { key: 'tuesday_afternoon', label: 'Mar Tar' },
                            { key: 'wednesday_morning', label: 'Mié Mañ' },
                            { key: 'wednesday_afternoon', label: 'Mié Tar' },
                            { key: 'thursday_morning', label: 'Jue Mañ' },
                            { key: 'thursday_afternoon', label: 'Jue Tar' },
                            { key: 'friday', label: 'Vie' },
                            { key: 'saturday', label: 'Sáb' },
                            { key: 'sunday', label: 'Dom' },
                          ].map((hdr) => (
                            <th key={hdr.key} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>
                              {hdr.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {enabledBrothers.map((bro) => {
                          const allowedSlots = settings?.availability?.[bro.person_uid] || [];
                          return (
                            <tr key={bro.person_uid} style={{ borderBottom: '1px solid var(--accent-200)' }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>
                                {`${bro.person_data.person_firstname.value} ${bro.person_data.person_lastname.value}`}
                              </td>
                              {[
                                'tuesday_morning',
                                'tuesday_afternoon',
                                'wednesday_morning',
                                'wednesday_afternoon',
                                'thursday_morning',
                                'thursday_afternoon',
                                'friday',
                                'saturday',
                                'sunday',
                              ].map((slot) => {
                                const isChecked = allowedSlots.includes(slot);
                                return (
                                  <td key={slot} style={{ padding: '4px', textAlign: 'center' }}>
                                    <Switch
                                      size="small"
                                      checked={isChecked}
                                      onChange={() => handleToggleAvailability(bro.person_uid, slot)}
                                      sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                          color: 'var(--accent-main)',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                          backgroundColor: 'var(--accent-main)',
                                        },
                                      }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}
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
            borderRadius: 'var(--radius-xl)',
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

                  {/* Grupo Recomendados */}
                  {sortedBrothersForSlot.recommended.length > 0 && (
                    <ListSubheader key="header-recommended" sx={{ color: 'var(--accent-main)', fontWeight: '700', lineHeight: '36px', backgroundColor: 'var(--white)' }}>
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
                    <ListSubheader key="header-others" sx={{ color: 'var(--grey-600)', fontWeight: '700', lineHeight: '36px', backgroundColor: 'var(--white)' }}>
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
    </Box>
  );
};

export default PredicacionSalidas;
