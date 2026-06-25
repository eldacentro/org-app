import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useBreakpoints, useCurrentUser } from '@hooks/index';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { personsState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import { dbLimpiezaGetConfig, dbLimpiezaSaveConfig } from '@services/dexie/limpieza';
import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { Week } from '@definition/week_type';
import { schedulesWeekNoMeeting } from '@services/app/schedules';
import { calcularGrupoReunion } from '@services/limpieza/calcularRotacion';
import {
  midweekMeetingWeekdayState,
  weekendMeetingWeekdayState,
  fullnameOptionState,
} from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { Typography } from '@components/index';
import { displaySnackNotification } from '@services/states/app';
import {
  IconSettings,
  IconGroups,
} from '@components/icons';
import LimpiezaConfigDialog from './LimpiezaConfigDialog';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const Limpieza = () => {
  const { t } = useAppTranslation();
  const { isElder, isAdmin } = useCurrentUser();
  const isManager = isElder || isAdmin;
  const { desktopUp } = useBreakpoints();

  // DB States
  const groups = useAtomValue(fieldServiceGroupsState);
  const persons = useAtomValue(personsState);
  const schedules = useAtomValue(schedulesState);
  
  // Settings store weekdays as an offset from Monday (0=Mon, 6=Sun)
  // We need them in 1-7 format (1=Mon, 7=Sun) to match dayOfWeekNum and JS date logic
  const rawMidweek = useAtomValue(midweekMeetingWeekdayState);
  const rawWeekend = useAtomValue(weekendMeetingWeekdayState);
  
  const midweekWeekdayNum = (rawMidweek !== undefined ? rawMidweek : 2) + 1;
  const weekendWeekdayNum = (rawWeekend !== undefined ? rawWeekend : 6) + 1;
  
  const fullnameOption = useAtomValue(fullnameOptionState);

  // Local State
  const [config, setConfig] = useState<LimpiezaConfig | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthsExpanded, setMonthsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Edit State
  const [editModal, setEditModal] = useState<{
    open: boolean;
    date: Date | null;
    weekOf: string;
    reunionDia: 'midweek' | 'weekend';
    group: FieldServiceGroupType | undefined;
  }>({
    open: false,
    date: null,
    weekOf: '',
    reunionDia: 'midweek',
    group: undefined,
  });

  const [selectedOverrideGroup, setSelectedOverrideGroup] = useState<string>('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Cargar en mount y después de cerrar el diálogo de configuración (no al abrirlo)
  useEffect(() => {
    if (!isConfigOpen) loadConfig();
  }, [isConfigOpen]);

  const loadConfig = async () => {
    try {
      const data = await dbLimpiezaGetConfig();
      if (data) setConfig(data);
    } catch (err) {
      console.error('Error loading limpieza config:', err);
    }
  };

  // Generate the monthly data
  const monthMeetings = useMemo(() => {
    if (!config) return [];
    
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    const meetings: Array<{
      date: Date;
      weekOf: string;
      reunionDia: 'midweek' | 'weekend';
      group: FieldServiceGroupType | undefined;
    }> = [];

    const date = new Date(start);
    while (date <= end) {
      const dayOfWeekNum = date.getDay() === 0 ? 7 : date.getDay();
      const isMidweek = dayOfWeekNum === midweekWeekdayNum;
      const isWeekend = dayOfWeekNum === weekendWeekdayNum;

      if (isMidweek || isWeekend) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const weekOfStr = `${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`;

        const schedule = schedules.find(s => s.weekOf === weekOfStr);
        let cancelled = false;
        if (schedule) {
          if (isMidweek) {
            const weekType = schedule.midweek_meeting?.week_type?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;
            cancelled = schedulesWeekNoMeeting(weekType);
          }
          if (isWeekend) {
            const weekType = schedule.weekend_meeting?.week_type?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;
            cancelled = schedulesWeekNoMeeting(weekType);
          }
        }

        if (!cancelled) {
          const reunionDia: 'midweek' | 'weekend' = isMidweek ? 'midweek' : 'weekend';
          const assignedGroupId = calcularGrupoReunion(config, weekOfStr, reunionDia, groups, schedules);
          const group = groups.find((g) => g.group_id === assignedGroupId);

          meetings.push({
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            weekOf: weekOfStr,
            reunionDia,
            group,
          });
        }
      }
      date.setDate(date.getDate() + 1);
    }
    return meetings;
  }, [config, selectedYear, selectedMonth, groups, midweekWeekdayNum, weekendWeekdayNum, schedules]);

  const handleOpenEdit = (m: { date: Date; weekOf: string; reunionDia: 'midweek' | 'weekend'; group: FieldServiceGroupType | undefined }) => {
    if (!isManager) return;
    setEditModal({
      open: true,
      date: m.date,
      weekOf: m.weekOf,
      reunionDia: m.reunionDia,
      group: m.group,
    });
    setSelectedOverrideGroup(m.group?.group_id || '');
  };

  const handleSaveOverride = async () => {
    if (!config || !editModal.weekOf || isSavingOverride) return;
    setIsSavingOverride(true);

    const newConfig = { ...config };
    if (!newConfig.overrides) newConfig.overrides = {};

    const key = `${editModal.weekOf}-${editModal.reunionDia}`;

    if (selectedOverrideGroup) {
      newConfig.overrides[key] = selectedOverrideGroup;
    } else {
      delete newConfig.overrides[key];
    }

    // Sin esto, dbRestoreLimpiezaConfig (que compara updatedAt para decidir
    // si aplica el cambio remoto) ve la misma fecha de antes y descarta el
    // cambio en cualquier otro dispositivo — el override se queda guardado
    // solo en este dispositivo, aunque sí se suba al servidor.
    newConfig.updatedAt = new Date().toISOString();

    try {
      await dbLimpiezaSaveConfig(newConfig);
      setConfig(newConfig);
      setEditModal({ ...editModal, open: false });
    } catch (err) {
      console.error('Error saving limpieza override:', err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo guardar el cambio de grupo.' });
    } finally {
      setIsSavingOverride(false);
    }
  };

  const getGroupName = (g: FieldServiceGroupType | undefined) => {
    if (!g) return 'Sin asignar';
    if (g.group_data.name && g.group_data.name.length > 0) return g.group_data.name;
    return t('tr_groupNumber', { groupNumber: g.group_data.sort_index + 1 });
  };

  const activeGroups = useMemo(() => {
    return groups
      .filter((g) => !g.group_data._deleted)
      .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);
  }, [groups]);

  // Cuadrícula Helper
  const weekdaysInfo = [
    { dayOfWeek: 1, label: 'Lunes' },
    { dayOfWeek: 2, label: 'Martes' },
    { dayOfWeek: 3, label: 'Miércoles' },
    { dayOfWeek: 4, label: 'Jueves' },
    { dayOfWeek: 5, label: 'Viernes' },
    { dayOfWeek: 6, label: 'Sábado' },
    { dayOfWeek: 7, label: 'Domingo' },
  ];

  // Identificar qué columnas mostrar en base a los días de reunión seleccionados
  const activeDays = new Set([midweekWeekdayNum, weekendWeekdayNum]);
  const weekdaysToShowFinal = weekdaysInfo.filter(info => activeDays.has(info.dayOfWeek));

  const weekKeys = new Set<string>();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(selectedYear, selectedMonth, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(date).setDate(diff));
    weekKeys.add(`${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`);
  }
  const sortedWeekKeys = Array.from(weekKeys).sort();

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PageTitle
        title="Limpieza del Salón"
        buttons={
          <>
            {isManager && (
              <NavBarButton
                text="Configuración"
                onClick={() => setIsConfigOpen(true)}
                icon={<IconSettings />}
              />
            )}
          </>
        }
      />

      {!config && (
        <Card sx={{ p: 4, textAlign: 'center', backgroundColor: 'var(--card)' }}>
          <Typography color="text.secondary">
            Configura la rotación de limpieza para empezar. Pulsa en &quot;Configuración&quot;.
          </Typography>
        </Card>
      )}

      {config && (
        <Box sx={{ display: 'flex', flexDirection: desktopUp ? 'row' : 'column', gap: '24px', alignItems: 'flex-start', width: '100%', maxWidth: '100%' }}>
          
          {/* PANEL IZQUIERDO */}
          {desktopUp ? (
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
                  Seleccionar año
                </Typography>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  size="small"
                  fullWidth
                  sx={{ borderRadius: 'var(--radius-m)', borderColor: 'var(--line)' }}
                >
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((yr) => (
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
                        '&.Mui-selected': { backgroundColor: 'var(--accent-150)', '&:hover': { backgroundColor: 'var(--line)' } },
                        '&:hover': { backgroundColor: 'var(--accent-100)' },
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
            <Card sx={{ width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-l)', boxShadow: 'none', overflow: 'hidden', mb: '8px' }}>
              <ListItemButton
                onClick={() => setMonthsExpanded(!monthsExpanded)}
                sx={{ backgroundColor: 'var(--accent-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '12px', px: '16px' }}
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
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
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
                              onClick={() => { setSelectedMonth(idx); setMonthsExpanded(false); }}
                              fullWidth
                              size="small"
                              sx={{
                                py: '6px', textTransform: 'none', borderRadius: 'var(--radius-m)', fontWeight: '600', fontSize: '13px', boxShadow: 'none',
                                ...(isSelected ? { backgroundColor: 'var(--accent-main)', color: 'var(--always-white)', '&:hover': { backgroundColor: 'var(--accent-dark)' } } : { borderColor: 'var(--line)', color: 'var(--black)' })
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
          )}

          {/* PANEL DERECHO */}
          <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
            
            {/* Título y Selector de Vista */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '16px' }}>
              <Typography style={{ fontWeight: '800', fontSize: '20px', color: 'var(--black)' }}>
                {MONTH_NAMES[selectedMonth]}
              </Typography>
              <Box sx={{ display: 'flex', gap: '4px', backgroundColor: 'var(--accent-150)', padding: '4px', borderRadius: 'var(--radius-m)', border: '1px solid var(--line)' }}>
                <Button
                  onClick={() => setViewMode('list')}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-s)',
                    py: '4px',
                    px: '16px',
                    fontSize: '13px',
                    boxShadow: 'none',
                    ...(viewMode === 'list' ? {
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
                  onClick={() => setViewMode('grid')}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-s)',
                    py: '4px',
                    px: '16px',
                    fontSize: '13px',
                    boxShadow: 'none',
                    ...(viewMode === 'grid' ? {
                      backgroundColor: 'var(--accent-main)',
                      color: 'var(--always-white)',
                      '&:hover': { backgroundColor: 'var(--accent-dark)' }
                    } : {
                      color: 'var(--grey-600)',
                      '&:hover': { backgroundColor: 'var(--line)' }
                    })
                  }}
                >
                  Mensual
                </Button>
              </Box>
            </Box>

            {/* VISTA CUADRÍCULA */}
            {viewMode === 'grid' && (
              <Box sx={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', backgroundColor: 'var(--card)', p: { mobile: '12px', tablet: '20px' } }}>
                <Grid container spacing={1} columns={weekdaysToShowFinal.length} sx={{ width: '100%', margin: 0 }}>
                  
                  {/* Headers */}
                  {weekdaysToShowFinal.map((dayInfo) => (
                    <Grid size={{ mobile: 1 }} key={dayInfo.label} sx={{ p: 0.5 }}>
                      <Box sx={{ textAlign: 'center', py: '6px', borderBottom: '2px solid var(--line)', mb: '8px' }}>
                        <Typography style={{ fontWeight: '700', fontSize: '12px', color: 'var(--accent-main)', textTransform: 'none' }}>
                          {dayInfo.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}

                  {/* Body Cells */}
                  {sortedWeekKeys.map((weekKey) => {
                    const [wYear, wMonth, wDay] = weekKey.split('/').map(Number);
                    const mondayDate = new Date(wYear, wMonth - 1, wDay);
                    
                    return weekdaysToShowFinal.map((dayInfo) => {
                      const diffDays = dayInfo.dayOfWeek === 7 ? 6 : dayInfo.dayOfWeek - 1;
                      const cellDate = new Date(mondayDate);
                      cellDate.setDate(mondayDate.getDate() + diffDays);
                      
                      const isThisMonth = cellDate.getMonth() === selectedMonth;
                      
                      if (!isThisMonth) {
                        return (
                          <Grid size={{ mobile: 1 }} key={`${weekKey}-${dayInfo.dayOfWeek}`} sx={{ p: 0.5 }}>
                            <Box sx={{
                              aspectRatio: desktopUp ? 'auto' : '1',
                              minHeight: desktopUp ? '110px' : 'auto',
                              backgroundColor: 'var(--accent-50)',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-m)',
                              opacity: 0.3
                            }} />
                          </Grid>
                        );
                      }

                      const m = monthMeetings.find(x => x.date.getDate() === cellDate.getDate());
                      if (!m) return null; // No debería pasar si es día de reunión, pero por seguridad
                      
                      return (
                        <Grid size={{ mobile: 1 }} key={m.date.getTime()} sx={{ p: 0.5 }}>
                          <Box
                            onClick={() => handleOpenEdit(m)}
                            sx={{
                              minHeight: desktopUp ? '110px' : '90px',
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-l)',
                              p: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                backgroundColor: 'var(--accent-150)',
                              }
                            }}
                          >
                            <Typography style={{ fontWeight: '800', fontSize: '14px', color: 'var(--black)' }}>
                              {cellDate.getDate()}
                            </Typography>
                            <Box sx={{
                              backgroundColor: 'var(--accent-main)',
                              color: 'var(--always-white)',
                              borderRadius: 'var(--radius-s)',
                              px: '8px',
                              py: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexGrow: 1,
                            }}>
                              <IconGroups color="var(--always-white)" />
                              <Typography style={{ fontWeight: '600', fontSize: '12px', color: 'var(--always-white)' }}>
                                {getGroupName(m.group)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    });
                  })}
                </Grid>
              </Box>
            )}

            {/* VISTA LISTA */}
            {viewMode === 'list' && (
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sortedWeekKeys.map((weekKey) => {
                  const [wYear, wMonth, wDay] = weekKey.split('/').map(Number);
                  const mondayDate = new Date(wYear, wMonth - 1, wDay);
                  const meetingsForWeek = monthMeetings.filter(m => m.weekOf === weekKey);
                  
                  if (meetingsForWeek.length === 0) return null;
                  
                  return (
                    <Box key={weekKey} sx={{ mb: '16px' }}>
                      <Typography sx={{ fontWeight: '800', lineHeight: '30px', color: 'var(--accent-dark)', px: '16px', pb: '8px' }}>
                        Semana del {mondayDate.getDate()} de {MONTH_NAMES[mondayDate.getMonth()]}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {meetingsForWeek.map((m) => (
                          <Card
                            key={`${m.weekOf}-${m.reunionDia}`}
                            onClick={() => handleOpenEdit(m)}
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-l)',
                              boxShadow: 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                backgroundColor: 'var(--accent-150)'
                              }
                            }}
                          >
                            <Box>
                              <Typography style={{ fontWeight: '700', color: 'var(--black)', fontSize: '16px' }}>
                                {m.date.getDate()} {MONTH_NAMES[m.date.getMonth()]}
                              </Typography>
                              <Typography style={{ color: 'var(--grey-400)', fontSize: '14px' }}>
                                {m.reunionDia === 'midweek' ? 'Reunión de entre semana' : 'Reunión de fin de semana'}
                              </Typography>
                            </Box>
                            <Box sx={{
                              backgroundColor: 'var(--accent-main)',
                              px: 2,
                              py: 1,
                              borderRadius: 'var(--radius-m)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <IconGroups color="var(--always-white)" />
                              <Typography style={{ color: 'var(--always-white)', fontWeight: '600' }}>
                                {getGroupName(m.group)}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      )}

      {isConfigOpen && (
        <LimpiezaConfigDialog
          open={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      )}

      {/* Modal para Ver/Modificar Excepciones */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ ...editModal, open: false })} PaperProps={{ sx: { maxWidth: '444px', width: '100%', mx: 2 } }}>
        <DialogTitle sx={{ display: 'flex', flexDirection: 'column', gap: '4px', p: '24px' }}>
          <Typography className="h2">Asignación del {editModal.date?.getDate()}</Typography>
          {isManager && (
            <Typography color="text.secondary" className="body-small-regular">
              Puedes cambiar manualmente a qué grupo le toca limpiar esta fecha en particular.
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: '24px', pt: 0 }}>
          <Typography className="h4" sx={{ mb: 1, color: 'var(--accent-dark)' }}>Grupo Asignado</Typography>
          {isManager ? (
            <Select
              value={selectedOverrideGroup}
              onChange={(e) => setSelectedOverrideGroup(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 3 }}
            >
              {activeGroups.map((g) => (
                <MenuItem key={g.group_id} value={g.group_id}>
                  {getGroupName(g)}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Typography sx={{ mb: 3, fontWeight: 600 }}>
              {activeGroups.find(g => g.group_id === selectedOverrideGroup)?.group_data.name || getGroupName(editModal.group)}
            </Typography>
          )}

          {editModal.group && (
            <>
              <Typography className="h4" sx={{ mb: 1, color: 'var(--accent-dark)' }}>Integrantes</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editModal.group.group_data.members
                  .map(m => persons.find(p => p.person_uid === m.person_uid))
                  .filter((p): p is NonNullable<typeof p> => Boolean(p))
                  .map((p) => (
                    <Box key={p.person_uid} sx={{ display: 'flex', alignItems: 'center', gap: '8px', p: '8px 12px', backgroundColor: 'var(--accent-150)', borderRadius: 'var(--radius-m)' }}>
                      <Typography fontWeight={600} color="var(--black)">
                        {buildPersonFullname(p.person_data.person_lastname.value, p.person_data.person_firstname.value, fullnameOption)}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: '24px' }}>
          {isManager ? (
            <>
              <Button onClick={() => setEditModal({ ...editModal, open: false })} color="inherit">
                Cancelar
              </Button>
              <Button onClick={handleSaveOverride} variant="contained" color="primary" disabled={isSavingOverride}>
                Guardar
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditModal({ ...editModal, open: false })} variant="contained" color="primary">
              Cerrar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Limpieza;
