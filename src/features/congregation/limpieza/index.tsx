import { useState, useMemo, useEffect } from 'react';
import { MESES_ES } from '@utils/nombres_fecha';
import {
  Box,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  MenuItem,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import AppSelect from '@components/select';
import MonthSelector from '@components/month_selector';
import SegmentedControl from '@components/segmented_control';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { personsState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import {
  dbLimpiezaGetConfig,
  dbLimpiezaSaveConfig,
} from '@services/dexie/limpieza';
import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { Week } from '@definition/week_type';
import {
  schedulesGetMeetingDate,
  schedulesWeekNoMeeting,
} from '@services/app/schedules';
import { calcularGrupoReunion } from '@services/limpieza/calcularRotacion';
import {
  midweekMeetingWeekdayState,
  weekendMeetingWeekdayState,
  fullnameOptionState,
} from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import PageTitle from '@components/page_title';
import { Typography } from '@components/index';
// Alias porque esta página todavía usa el Button de MUI en crudo para el
// selector de mes/vista (fuera del alcance de esta migración); el pie del
// diálogo de excepciones sí migra al botón del sistema de diseño.
import AppButton from '@components/button';
import { displaySnackNotification } from '@services/states/app';
import LimpiezaConfigDialog from './LimpiezaConfigDialog';

const MONTH_NAMES = [...MESES_ES];

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
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
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

  const [selectedOverrideGroup, setSelectedOverrideGroup] =
    useState<string>('');
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

    const meetings: Array<{
      date: Date;
      weekOf: string;
      reunionDia: 'midweek' | 'weekend';
      group: FieldServiceGroupType | undefined;
      esManual: boolean;
    }> = [];

    const monthStr = `${selectedYear}/${String(selectedMonth + 1).padStart(2, '0')}`;

    // Se itera por SEMANAS y se pregunta a schedulesGetMeetingDate la fecha
    // REAL de cada reunión (en vez de asumir el día fijo de Configuración):
    // así la semana de la visita del superintendente de circuito — donde la
    // reunión de entre semana se mueve al día de visita, típicamente martes —
    // pinta la limpieza en el día correcto, e incluso en el mes correcto si
    // el cambio de día la saca del mes (mismo criterio que el registro de
    // asistencia, ver attendanceWeeksForMonth).
    // Lunes candidatos: desde 6 días antes del día 1 (una reunión del mes
    // puede venir de una semana cuyo lunes quedó en el mes anterior) hasta
    // fin de mes.
    const first = new Date(selectedYear, selectedMonth, 1);
    const monday = new Date(first);
    monday.setDate(monday.getDate() - 6);
    while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1);

    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

    while (monday <= lastDay) {
      const weekOfStr = `${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`;
      const schedule = schedules.find((s) => s.weekOf === weekOfStr);

      for (const reunionDia of ['midweek', 'weekend'] as const) {
        const { date: meetingDate } = schedulesGetMeetingDate({
          week: weekOfStr,
          meeting: reunionDia,
        });

        if (!meetingDate || !meetingDate.startsWith(monthStr)) continue;

        let cancelled = false;
        if (schedule) {
          const weekType =
            (reunionDia === 'midweek'
              ? schedule.midweek_meeting?.week_type
              : schedule.weekend_meeting?.week_type
            )?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;
          cancelled = schedulesWeekNoMeeting(weekType);
        }
        if (cancelled) continue;

        const assignedGroupId = calcularGrupoReunion(
          config,
          weekOfStr,
          reunionDia,
          groups,
          schedules
        );
        const group = groups.find((g) => g.group_id === assignedGroupId);

        const [y, m, d] = meetingDate.split('/').map(Number);
        meetings.push({
          date: new Date(y, m - 1, d),
          weekOf: weekOfStr,
          reunionDia,
          group,
          esManual: Boolean(config.overrides?.[`${weekOfStr}-${reunionDia}`]),
        });
      }

      monday.setDate(monday.getDate() + 7);
    }

    meetings.sort((a, b) => a.date.getTime() - b.date.getTime());
    return meetings;
  }, [config, selectedYear, selectedMonth, groups, schedules]);

  const handleOpenEdit = (m: {
    date: Date;
    weekOf: string;
    reunionDia: 'midweek' | 'weekend';
    group: FieldServiceGroupType | undefined;
    esManual: boolean;
  }) => {
    if (!isManager) return;
    setEditModal({
      open: true,
      date: m.date,
      weekOf: m.weekOf,
      reunionDia: m.reunionDia,
      group: m.group,
    });
    // Vacío significa «rotación automática». Una casilla que nadie ha tocado
    // se abre en automático, no en el grupo que le tocó: si se abriera en el
    // grupo, guardar sin cambiar nada la convertiría en manual para siempre.
    setSelectedOverrideGroup(m.esManual ? m.group?.group_id || '' : '');
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
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo guardar el cambio de grupo.',
      });
    } finally {
      setIsSavingOverride(false);
    }
  };

  const getGroupName = (g: FieldServiceGroupType | undefined) => {
    if (!g) return 'Sin asignar';
    if (g.group_data.name && g.group_data.name.length > 0)
      return g.group_data.name;
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

  // Columnas del grid: los días en que HAY reunión este mes según las fechas
  // reales (así la semana de la visita del CO añade su columna — p. ej.
  // martes — solo en los meses que la necesitan). Si el mes aún no tiene
  // reuniones calculadas, se cae a los días configurados.
  const activeDays =
    monthMeetings.length > 0
      ? new Set(
          monthMeetings.map((m) =>
            m.date.getDay() === 0 ? 7 : m.date.getDay()
          )
        )
      : new Set([midweekWeekdayNum, weekendWeekdayNum]);
  const weekdaysToShowFinal = weekdaysInfo.filter((info) =>
    activeDays.has(info.dayOfWeek)
  );

  const weekKeys = new Set<string>();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(selectedYear, selectedMonth, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(date).setDate(diff));
    weekKeys.add(
      `${monday.getFullYear()}/${String(monday.getMonth() + 1).padStart(2, '0')}/${String(monday.getDate()).padStart(2, '0')}`
    );
  }
  const sortedWeekKeys = Array.from(weekKeys).sort();

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      {/* La configuración va en el ENGRANAJE de la cabecera, no en la barra
          de abajo. La barra de abajo es para HACER cosas con el contenido de
          la pantalla —añadir, autocompletar, exportar—; el engranaje, para
          cambiar cómo funciona la pantalla. Antes cada sitio lo ponía donde le
          pareció: dos pantallas usaban el engranaje y cinco un botón abajo,
          para exactamente lo mismo. */}
      <PageTitle
        title="Limpieza del Salón"
        quickSettings={isManager ? () => setIsConfigOpen(true) : undefined}
        quickSettingsLabel="Configuración de la limpieza"
      />

      {!config && (
        <Card
          sx={{ p: 4, textAlign: 'center', backgroundColor: 'var(--card)' }}
        >
          <Typography color="text.secondary">
            Configura la rotación de limpieza para empezar. Pulsa en
            &quot;Configuración&quot;.
          </Typography>
        </Card>
      )}

      {config && (
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
          {/* PANEL IZQUIERDO */}
          {/* El MISMO selector de mes que Exhibidores y Salidas. Estaba
              escrito aquí a mano por tercera vez —panel fijo en escritorio,
              barra plegable en móvil, rejilla de meses y desplegable de año—,
              con sus propios radios y sus tamaños de letra a pelo. */}
          <MonthSelector
            monthNames={MONTH_NAMES}
            year={selectedYear}
            month={selectedMonth}
            years={[
              new Date().getFullYear() - 1,
              new Date().getFullYear(),
              new Date().getFullYear() + 1,
            ]}
            expanded={monthsExpanded}
            onToggle={() => setMonthsExpanded(!monthsExpanded)}
            onChange={({ year, month }) => {
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
          />

          {/* PANEL DERECHO */}
          <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
            {/* Título y Selector de Vista */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: '16px',
              }}
            >
              <Typography className="h1" style={{ color: 'var(--black)' }}>
                {MONTH_NAMES[selectedMonth]}
              </Typography>
              {/* El SegmentedControl de la app. Estaba escrito a mano aquí,
                  con lo elegido en color PLENO — que está reservado a la acción
                  principal de la pantalla, no a decir en qué vista estás. */}
              <SegmentedControl
                ariaLabel="Vista del calendario"
                tabs={['Lista', 'Mensual']}
                active={viewMode === 'list' ? 0 : 1}
                // `'grid'`, no `'month'`. Los dos valores que existen son
                // `grid` y `list`, y escribir `month` no rompía nada de forma
                // visible: simplemente dejaba de coincidir con las DOS ramas
                // que pintan, así que la pantalla se quedaba en blanco.
                // Y solo pasaba al VOLVER: al entrar el estado vale `grid` de
                // fábrica y la cuadrícula sale bien; hacía falta ir a Lista y
                // volver para verlo.
                // El compilador lo avisaba desde el principio —"'month' no es
                // asignable a 'grid' | 'list'"— pero estaba escondido entre los
                // errores de tipos que este repo arrastra.
                onChange={(i) => setViewMode(i === 0 ? 'list' : 'grid')}
              />
            </Box>

            {/* VISTA CUADRÍCULA.
                Este Box exterior es solo un envoltorio de layout (padding),
                sin fondo/borde propios: las celdas de día de abajo ya son
                cada una su propia tarjeta (var(--card)/var(--line)), así que
                el contenedor no debe repetir el mismo marco alrededor de
                todas — ver DESIGN_SYSTEM.md §8 (anti-patrón de doble
                anidado). */}
            {viewMode === 'grid' && (
              <Box sx={{ p: { mobile: '12px', tablet: '20px' } }}>
                <Grid
                  container
                  spacing={1}
                  columns={weekdaysToShowFinal.length}
                  sx={{ width: '100%', margin: 0 }}
                >
                  {/* Headers */}
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
                          className="label-small-semibold"
                          style={{ color: 'var(--accent-main)' }}
                        >
                          {dayInfo.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}

                  {/* Body Cells */}
                  {sortedWeekKeys.map((weekKey) => {
                    const [wYear, wMonth, wDay] = weekKey
                      .split('/')
                      .map(Number);
                    const mondayDate = new Date(wYear, wMonth - 1, wDay);

                    return weekdaysToShowFinal.map((dayInfo) => {
                      const diffDays =
                        dayInfo.dayOfWeek === 7 ? 6 : dayInfo.dayOfWeek - 1;
                      const cellDate = new Date(mondayDate);
                      cellDate.setDate(mondayDate.getDate() + diffDays);

                      const isThisMonth = cellDate.getMonth() === selectedMonth;

                      // Día de otro mes: se reserva la columna para que las
                      // dos sigan cuadrando, y nada más. Antes se pintaba una
                      // caja atenuada del alto de una tarjeta —y en móvil
                      // cuadrada, aún más alta—, así que junto al primer
                      // domingo del mes quedaba un hueco enorme al lado que no
                      // significaba nada.
                      if (!isThisMonth) {
                        return (
                          <Grid
                            size={{ mobile: 1 }}
                            key={`${weekKey}-${dayInfo.dayOfWeek}`}
                            sx={{ p: 0.5 }}
                          />
                        );
                      }

                      const m = monthMeetings.find(
                        (x) => x.date.getDate() === cellDate.getDate()
                      );

                      // Sin reunión ese día esa semana: una semana de asamblea,
                      // o el miércoles de la visita del CO con la reunión movida
                      // al martes. La casilla se queda —si no, la columna de al
                      // lado se descuadra— pero DICE por qué está vacía: un
                      // hueco mudo se lee como un fallo de la aplicación.
                      if (!m) {
                        return (
                          <Grid
                            size={{ mobile: 1 }}
                            key={`${weekKey}-${dayInfo.dayOfWeek}-empty`}
                            sx={{ p: 0.5 }}
                          >
                            <Box
                              sx={{
                                minHeight: desktopUp ? '110px' : '90px',
                                height: '100%',
                                backgroundColor: 'var(--accent-100)',
                                border: '1px dashed var(--line)',
                                borderRadius: 'var(--shape-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: '10px',
                              }}
                            >
                              <Typography
                                className="label-small-regular"
                                color="var(--ink-3)"
                                sx={{ textAlign: 'center' }}
                              >
                                Sin reunión
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      }

                      return (
                        <Grid
                          size={{ mobile: 1 }}
                          key={m.date.getTime()}
                          sx={{ p: 0.5 }}
                        >
                          <Box
                            onClick={() => handleOpenEdit(m)}
                            sx={{
                              minHeight: desktopUp ? '110px' : '90px',
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--shape-sm)',
                              p: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              cursor: 'pointer',
                              transition:
                                'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                backgroundColor: 'var(--accent-150)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '4px',
                              }}
                            >
                              <Typography
                                className="body-small-semibold"
                                style={{ color: 'var(--black)' }}
                              >
                                {cellDate.getDate()}
                              </Typography>
                              {/* Puesto a mano. Sin esta marca, una asignación
                                  manual y una calculada se ven idénticas: se
                                  pinta a mano un mes para salir del paso, se
                                  olvida, y meses después la rotación «falla»
                                  sin que nada explique por qué. */}
                              {m.esManual && (
                                <Box
                                  title="Asignación puesta a mano"
                                  sx={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: 'var(--shape-full)',
                                    backgroundColor: 'var(--orange-main)',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>
                            <Box
                              sx={{
                                // Rótulo, no botón: tinte y texto oscuro. En
                                // color pleno, una rejilla de nueve fechas era
                                // un muro de azul que tapaba las propias
                                // fechas.
                                backgroundColor: 'var(--state-selected)',
                                color: 'var(--state-selected-ink)',
                                borderRadius: 'var(--shape-full)',
                                px: '12px',
                                py: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexGrow: 1,
                              }}
                            >
                              {/* Sin icono: era el MISMO en todas las filas,
                                  así que no distinguía un grupo de otro — solo
                                  gastaba sitio y ruido. El nombre del grupo ya
                                  dice lo que hay que saber. */}
                              <Typography
                                className="label-small-semibold"
                                style={{ color: 'var(--state-selected-ink)' }}
                              >
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
              <List
                disablePadding
                sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                {sortedWeekKeys.map((weekKey) => {
                  const [wYear, wMonth, wDay] = weekKey.split('/').map(Number);
                  const mondayDate = new Date(wYear, wMonth - 1, wDay);
                  const meetingsForWeek = monthMeetings.filter(
                    (m) => m.weekOf === weekKey
                  );

                  if (meetingsForWeek.length === 0) return null;

                  return (
                    <Box key={weekKey} sx={{ mb: '16px' }}>
                      <Typography
                        sx={{
                          fontWeight: '800',
                          lineHeight: '30px',
                          color: 'var(--accent-dark)',
                          px: '16px',
                          pb: '8px',
                        }}
                      >
                        Semana del {mondayDate.getDate()} de{' '}
                        {MONTH_NAMES[mondayDate.getMonth()]}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
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
                              borderRadius: 'var(--shape-sm)',
                              boxShadow: 'none',
                              transition:
                                'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
                              '&:hover': {
                                borderColor: 'var(--accent-main)',
                                backgroundColor: 'var(--accent-150)',
                              },
                            }}
                          >
                            <Box>
                              <Typography
                                className="body-regular-semibold"
                                style={{ color: 'var(--black)' }}
                              >
                                {m.date.getDate()}{' '}
                                {MONTH_NAMES[m.date.getMonth()]}
                              </Typography>
                              <Typography
                                className="body-small-regular"
                                style={{ color: 'var(--grey-400)' }}
                              >
                                {m.reunionDia === 'midweek'
                                  ? 'Reunión de entre semana'
                                  : 'Reunión de fin de semana'}
                                {/* Igual que el puntito del calendario: aquí
                                    hay sitio para decirlo con palabras. */}
                                {m.esManual && ' · Puesta a mano'}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                backgroundColor: 'var(--accent-main)',
                                px: 2,
                                py: 1,
                                borderRadius: 'var(--shape-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              {/* Sin icono: era el MISMO en todas las filas,
                                  así que no distinguía un grupo de otro — solo
                                  gastaba sitio y ruido. El nombre del grupo ya
                                  dice lo que hay que saber. */}
                              <Typography
                                style={{
                                  color: 'var(--always-white)',
                                  fontWeight: '600',
                                }}
                              >
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
      <Dialog
        open={editModal.open}
        onClose={() => setEditModal({ ...editModal, open: false })}
        PaperProps={{
          sx: {
            maxWidth: '444px',
            width: '100%',
            mx: 2,
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--pop-up-shadow)',
            borderRadius: 'var(--shape-xl)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            p: '24px',
          }}
        >
          <Typography className="h2">
            Asignación del {editModal.date?.getDate()}
          </Typography>
          {isManager && (
            <Typography color="text.secondary" className="body-small-regular">
              Puedes cambiar manualmente a qué grupo le toca limpiar esta fecha
              en particular.
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: '24px', pt: 0 }}>
          <Typography
            className="h4"
            sx={{ mb: 1, color: 'var(--accent-dark)' }}
          >
            Grupo asignado
          </Typography>
          {isManager ? (
            <AppSelect
              value={selectedOverrideGroup}
              onChange={(e) =>
                setSelectedOverrideGroup(e.target.value as string)
              }
              fullWidth
              size="small"
              sx={{ mb: 3 }}
            >
              {/* Sin esta opción, una asignación puesta a mano no se podía
                  deshacer: quedaba fija para siempre y la rotación no volvía
                  a tocar ese día por mucho que se cambiara la configuración. */}
              <MenuItem value="">Rotación automática</MenuItem>
              {activeGroups.map((g) => (
                <MenuItem key={g.group_id} value={g.group_id}>
                  {getGroupName(g)}
                </MenuItem>
              ))}
            </AppSelect>
          ) : (
            <Typography sx={{ mb: 3, fontWeight: 600 }}>
              {activeGroups.find((g) => g.group_id === selectedOverrideGroup)
                ?.group_data.name || getGroupName(editModal.group)}
            </Typography>
          )}

          {editModal.group && (
            <>
              <Typography
                className="h4"
                sx={{ mb: 1, color: 'var(--accent-dark)' }}
              >
                Integrantes
              </Typography>
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {editModal.group.group_data.members
                  .map((m) =>
                    persons.find((p) => p.person_uid === m.person_uid)
                  )
                  .filter((p): p is NonNullable<typeof p> => Boolean(p))
                  .map((p) => (
                    <Box
                      key={p.person_uid}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        p: '8px 12px',
                        backgroundColor: 'var(--accent-150)',
                        borderRadius: 'var(--shape-sm)',
                      }}
                    >
                      <Typography fontWeight={600} color="var(--black)">
                        {buildPersonFullname(
                          p.person_data.person_lastname.value,
                          p.person_data.person_firstname.value,
                          fullnameOption
                        )}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: '24px', gap: '8px' }}>
          {isManager ? (
            <>
              <AppButton
                variant="tertiary"
                disableAutoStretch
                onClick={() => setEditModal({ ...editModal, open: false })}
              >
                Cancelar
              </AppButton>
              <AppButton
                variant="main"
                disableAutoStretch
                disabled={isSavingOverride}
                onClick={handleSaveOverride}
              >
                Guardar
              </AppButton>
            </>
          ) : (
            <AppButton
              variant="main"
              disableAutoStretch
              onClick={() => setEditModal({ ...editModal, open: false })}
            >
              Cerrar
            </AppButton>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Limpieza;
