import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Stack, MenuItem } from '@mui/material';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import Button from '@components/button';
import TextField from '@components/textfield';
import CustomDatePicker from '@components/date_picker';
import TimeField from '@components/timefield';
import Select from '@components/select';
import IconButton from '@components/icon_button';
import {
  IconAdd,
  IconDelete,
  IconExport,
  IconPerson,
  IconAssignment,
  IconMapOverview,
  IconWallet,
  IconChevronRight,
} from '@components/icons';
import { formatDate } from '@utils/date';
import {
  CircuitVisitSpecialMeeting,
  CircuitVisitType,
} from '@definition/circuit_visit';
import useCircuitVisitDashboard from './useCircuitVisitDashboard';

const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-l, 12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      padding: '18px 20px',
    }}
  >
    <Stack spacing="2px" mb="14px">
      <Typography className="h3" color="var(--ink, var(--black))">
        {title}
      </Typography>
      {subtitle && (
        <Typography className="body-small-regular" color="var(--grey-400)">
          {subtitle}
        </Typography>
      )}
    </Stack>
    {children}
  </Box>
);

const DocRow = ({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 8px',
      borderRadius: 'var(--radius-m, 8px)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background 0.15s ease',
      '&:hover': onClick ? { background: 'var(--accent-150, rgba(0,0,0,0.03))' } : {},
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-m, 8px)',
        backgroundColor: 'var(--accent-150, rgba(59,114,196,0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Stack spacing="1px" flex={1}>
      <Typography className="body-regular-semibold" color="var(--ink, var(--black))">
        {title}
      </Typography>
      <Typography className="body-small-regular" color="var(--grey-400)">
        {subtitle}
      </Typography>
    </Stack>
    {onClick && <IconChevronRight color="var(--grey-350)" />}
  </Box>
);

const formatRange = (visit: CircuitVisitType) => {
  try {
    const start = formatDate(new Date(visit.date_start), 'd MMM');
    const end = formatDate(new Date(visit.date_end), 'd MMM yyyy');
    return `${start} – ${end}`;
  } catch {
    return visit.weekOf;
  }
};

const SpecialMeetingEditor = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CircuitVisitSpecialMeeting;
  onChange: (v: CircuitVisitSpecialMeeting) => void;
}) => {
  const enabled = value !== null;

  return (
    <Stack spacing="10px">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography className="body-regular-semibold">{label}</Typography>
        <Button
          variant={enabled ? 'secondary' : 'tertiary'}
          onClick={() =>
            onChange(enabled ? null : { date: '', time: '', place: '' })
          }
        >
          {enabled ? 'Quitar' : 'Programar'}
        </Button>
      </Stack>

      {enabled && (
        <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing="10px">
          <CustomDatePicker
            label="Fecha"
            view="input"
            value={value.date ? new Date(value.date) : null}
            onChange={(d) =>
              onChange({
                ...value,
                date: d ? formatDate(d, 'yyyy/MM/dd') : '',
              })
            }
          />
          <TimeField
            value={value.time}
            onChange={(t) => onChange({ ...value, time: t })}
          />
          <TextField
            label="Lugar"
            value={value.place}
            onChange={(e) => onChange({ ...value, place: e.target.value })}
          />
        </Stack>
      )}
    </Stack>
  );
};

const CircuitVisitDashboard = () => {
  const {
    visits,
    selectedId,
    setSelectedId,
    working,
    hasVisits,
    handleCreateVisit,
    handleDeleteVisit,
    patch,
    addMeal,
    updateMeal,
    removeMeal,
    addPreaching,
    updatePreaching,
    removePreaching,
    updateSpecialMeeting,
    handleExportPdf,
  } = useCircuitVisitDashboard();

  const navigate = useNavigate();
  const [newWeek, setNewWeek] = useState<Date | null>(null);

  return (
    <Box sx={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <PageTitle title="Visita del Superintendente de Circuito" />

      {/* Activar nueva visita */}
      <Box sx={{ mt: '12px', mb: '20px' }}>
        <Card
          title="Activar nueva visita"
          subtitle="Elige una fecha de la semana de la visita (martes a domingo)."
        >
          <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing="12px" alignItems="flex-end">
            <CustomDatePicker
              label="Semana de la visita"
              view="input"
              value={newWeek}
              onChange={(d) => setNewWeek(d)}
            />
            <Button
              variant="main"
              startIcon={<IconAdd color="var(--always-white)" />}
              disabled={!newWeek}
              onClick={async () => {
                if (!newWeek) return;
                await handleCreateVisit(newWeek);
                setNewWeek(null);
              }}
            >
              Activar visita
            </Button>
          </Stack>
        </Card>
      </Box>

      {/* Documentación para la Visita — reúne los informes que ya existen en la
          app; cada uno abre su propia pantalla de revisión y exportación. */}
      <Box sx={{ mb: '20px' }}>
        <Card
          title="Documentación para la Visita"
          subtitle="Informes listos para revisar y exportar para el superintendente."
        >
          <Stack divider={<Box sx={{ height: '1px', background: 'var(--line)' }} />}>
            <DocRow
              icon={<IconPerson color="var(--accent-main)" width={20} height={20} />}
              title="Registro de publicadores (S-21)"
              subtitle="Tarjetas de informe de cada publicador."
              onClick={() => navigate('/publisher-records')}
            />
            <DocRow
              icon={<IconAssignment color="var(--accent-main)" width={20} height={20} />}
              title="Asistencia a las reuniones"
              subtitle="Registros de asistencia entre semana y fin de semana."
              onClick={() => navigate('/reports/meeting-attendance')}
            />
            <DocRow
              icon={<IconMapOverview color="var(--accent-main)" width={20} height={20} />}
              title="Territorios (S-13)"
              subtitle="Registro y estado actual de los territorios."
              onClick={() => navigate('/congregation/territories')}
            />
            <DocRow
              icon={<IconWallet color="var(--accent-main)" width={20} height={20} />}
              title="Estado de la contabilidad"
              subtitle="Gestionado aparte — revisar con el siervo de cuentas."
            />
          </Stack>
        </Card>
      </Box>

      {/* Selector de visitas existentes */}
      {hasVisits && (
        <Stack direction="row" spacing="8px" flexWrap="wrap" mb="16px">
          {visits.map((visit) => (
            <Button
              key={visit.id}
              variant={visit.id === selectedId ? 'main' : 'secondary'}
              onClick={() => setSelectedId(visit.id)}
            >
              {formatRange(visit)}
            </Button>
          ))}
        </Stack>
      )}

      {!working && (
        <Typography className="body-regular" color="var(--grey-400)">
          {hasVisits
            ? 'Selecciona una visita para ver y editar su programa.'
            : 'Aún no hay visitas. Activa una nueva visita arriba para empezar.'}
        </Typography>
      )}

      {working && (
        <Stack spacing="20px">
          {/* Cabecera de la visita */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography className="h2">{formatRange(working)}</Typography>
            <Stack direction="row" spacing="8px">
              <Button
                variant="main"
                startIcon={<IconExport color="var(--always-white)" />}
                onClick={handleExportPdf}
              >
                Generar PDF
              </Button>
              <Button
                variant="tertiary"
                startIcon={<IconDelete color="var(--red-main)" />}
                onClick={() => handleDeleteVisit(working.id)}
              >
                Eliminar visita
              </Button>
            </Stack>
          </Stack>

          {/* Programa de comidas */}
          <Card title="Programa de comidas" subtitle="Anfitriones por día.">
            <Stack spacing="12px">
              {working.meals.map((meal) => (
                <Stack
                  key={meal.id}
                  direction={{ mobile: 'column', tablet: 'row' }}
                  spacing="10px"
                  alignItems={{ tablet: 'center' }}
                >
                  <CustomDatePicker
                    label="Día"
                    view="input"
                    value={meal.date ? new Date(meal.date) : null}
                    onChange={(d) =>
                      updateMeal(meal.id, {
                        date: d ? formatDate(d, 'yyyy/MM/dd') : '',
                      })
                    }
                  />
                  <Select
                    value={meal.type}
                    onChange={(e) =>
                      updateMeal(meal.id, {
                        type: e.target.value as 'lunch' | 'dinner',
                      })
                    }
                  >
                    <MenuItem value="lunch">Almuerzo</MenuItem>
                    <MenuItem value="dinner">Cena</MenuItem>
                  </Select>
                  <TextField
                    label="Anfitrión"
                    value={meal.host}
                    onChange={(e) => updateMeal(meal.id, { host: e.target.value })}
                  />
                  <IconButton onClick={() => removeMeal(meal.id)}>
                    <IconDelete color="var(--red-main)" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                variant="secondary"
                startIcon={<IconAdd color="var(--accent-main)" />}
                onClick={addMeal}
              >
                Añadir comida
              </Button>
            </Stack>
          </Card>

          {/* Programa de predicación */}
          <Card
            title="Programa de predicación"
            subtitle="Horario, punto de salida y grupo por día."
          >
            <Stack spacing="12px">
              {working.preaching.map((row) => (
                <Stack
                  key={row.id}
                  direction={{ mobile: 'column', tablet: 'row' }}
                  spacing="10px"
                  alignItems={{ tablet: 'center' }}
                >
                  <CustomDatePicker
                    label="Día"
                    view="input"
                    value={row.date ? new Date(row.date) : null}
                    onChange={(d) =>
                      updatePreaching(row.id, {
                        date: d ? formatDate(d, 'yyyy/MM/dd') : '',
                      })
                    }
                  />
                  <TimeField
                    value={row.time}
                    onChange={(t) => updatePreaching(row.id, { time: t })}
                  />
                  <TextField
                    label="Punto de salida"
                    value={row.meetingPoint}
                    onChange={(e) =>
                      updatePreaching(row.id, { meetingPoint: e.target.value })
                    }
                  />
                  <TextField
                    label="Grupo"
                    value={row.group}
                    onChange={(e) =>
                      updatePreaching(row.id, { group: e.target.value })
                    }
                  />
                  <IconButton onClick={() => removePreaching(row.id)}>
                    <IconDelete color="var(--red-main)" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                variant="secondary"
                startIcon={<IconAdd color="var(--accent-main)" />}
                onClick={addPreaching}
              >
                Añadir salida
              </Button>
            </Stack>
          </Card>

          {/* Reuniones especiales */}
          <Card
            title="Reuniones especiales"
            subtitle="Reunión con precursores y reunión con ancianos y siervos ministeriales."
          >
            <Stack spacing="18px">
              <SpecialMeetingEditor
                label="Reunión con precursores"
                value={working.meeting_pioneers}
                onChange={(v) => updateSpecialMeeting('meeting_pioneers', v)}
              />
              <Box sx={{ height: '1px', background: 'var(--line)' }} />
              <SpecialMeetingEditor
                label="Reunión con ancianos y SM"
                value={working.meeting_elders}
                onChange={(v) => updateSpecialMeeting('meeting_elders', v)}
              />
            </Stack>
          </Card>

          {/* Contabilidad: gestionado aparte */}
          <Card
            title="Contabilidad"
            subtitle="Gestionado aparte — recordatorio para la visita."
          >
            <TextField
              label="Nota (opcional)"
              placeholder="p. ej. revisar cuentas con el siervo de cuentas antes de la visita"
              value={working.accounting_note}
              multiline
              minRows={2}
              onChange={(e) => patch({ accounting_note: e.target.value })}
            />
          </Card>
        </Stack>
      )}
    </Box>
  );
};

export default CircuitVisitDashboard;
