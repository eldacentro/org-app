import { ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import {
  Box,
  Stack,
  Autocomplete,
  TextField as MuiTextField,
  Checkbox,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
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
  IconDownload,
  IconPerson,
  IconAssignment,
  IconMapOverview,
  IconWallet,
  IconChevronRight,
  IconHistory,
} from '@components/icons';
import { addDays, formatDate } from '@utils/date';
import { fmtDayEs, fmtDateShortEs, fmtRangeEs } from './shared/fmtDayEs';
import useExportS21 from '@features/reports/publisher_records/export_S21/useExportS21';
import useExportS88 from '@features/reports/meeting_attendance/export_S88/useExportS88';
import { useTerritoryExport } from '@features/territories/responsables/useTerritoryExport';
import {
  CircuitVisitSpecialMeeting,
  CircuitVisitType,
  CircuitVisitCompanionActivity,
} from '@definition/circuit_visit';
import { personsState } from '@states/persons';
import { fullnameOptionState, COSpouseNameState } from '@states/settings';
import { serviceOutingsListState } from '@states/service_outings';
import { buildPersonFullname } from '@utils/common';
import { personIsElder } from '@services/app/persons';
import ServiceOutingsMeeting from '@features/meetings/weekly_schedules/service_outings/ServiceOutingsMeeting';
import { useConfirm } from '@components/confirm_dialog';
import useCircuitVisitDashboard from './useCircuitVisitDashboard';
import Card from './shared/Card';

const ACTIVITY_LABELS: Record<CircuitVisitCompanionActivity, string> = {
  predicacion: 'Predicación',
  revisitas: 'Revisitas',
  curso: 'Curso bíblico',
};

const DocRow = ({
  icon,
  title,
  subtitle,
  onClick,
  exportButton,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  exportButton?: ReactNode;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 8px',
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
    {exportButton}
    {onClick && (
      <Box
        onClick={onClick}
        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', p: '4px' }}
      >
        <IconChevronRight color="var(--grey-350)" />
      </Box>
    )}
  </Box>
);

const formatRange = (visit: CircuitVisitType) => fmtRangeEs(visit.date_start, visit.date_end);

const SpecialMeetingEditor = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  label: string;
  value: CircuitVisitSpecialMeeting;
  onChange: (v: CircuitVisitSpecialMeeting) => void;
  minDate?: Date;
  maxDate?: Date;
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
            minDate={minDate}
            maxDate={maxDate}
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

const PreachingSection = ({
  visit,
  companions,
  onUpsertCompanion,
  onRemoveCompanion,
}: {
  visit: CircuitVisitType;
  companions: CircuitVisitType['co_companions'];
  onUpsertCompanion: (
    outingKey: string,
    changes: Partial<Omit<CircuitVisitType['co_companions'][number], 'outingKey'>>
  ) => void;
  onRemoveCompanion: (outingKey: string) => void;
}) => {
  const navigate = useNavigate();
  const outingsList = useAtomValue(serviceOutingsListState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const coSpouseName = useAtomValue(COSpouseNameState);

  const weekRecord = useMemo(
    () => outingsList.find((r) => r.weekOf === visit.weekOf),
    [outingsList, visit.weekOf]
  );

  const personOptions = useMemo(
    () =>
      persons
        .map((p) => ({
          uid: p.person_uid,
          label: buildPersonFullname(
            p.person_data.person_lastname.value,
            p.person_data.person_firstname.value,
            fullnameOption
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [persons, fullnameOption]
  );

  // Solo tiene sentido elegir compañía para una salida ya asignada a alguien,
  // y solo dentro de la semana de la visita — weekRecord trae la semana
  // completa (de lunes a domingo), pero el lunes es anterior a que el CO
  // llegue (la visita empieza el martes), así que no debe salir aquí.
  const assignedOutings = useMemo(() => {
    const outings = weekRecord?.outings ?? [];
    return outings
      .filter((o) => !o.cancelled && o.person && o.date >= visit.date_start)
      .map((o) => ({ ...o, outingKey: `${o.date}_${o.time}` }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [weekRecord, visit.date_start]);

  return (
    <Card
      title="Programa de predicación"
      subtitle="Mismas salidas de “Salidas de predicación” de esta semana."
    >
      <Stack spacing="16px">
        <ServiceOutingsMeeting week={visit.weekOf} weekRecord={weekRecord} />

        <Button variant="secondary" onClick={() => navigate('/predicacion-salidas')}>
          Editar en Salidas de predicación
        </Button>

        {assignedOutings.length > 0 && (
          <Stack spacing="12px">
            <Typography className="body-regular-semibold">
              Compañía del superintendente
            </Typography>
            {assignedOutings.map((outing) => {
              const companion = companions.find(
                (c) => c.outingKey === outing.outingKey
              );
              const selectedPerson =
                personOptions.find((o) => o.uid === companion?.brother) ?? null;

              return (
                <Stack
                  key={outing.outingKey}
                  direction={{ mobile: 'column', tablet: 'row' }}
                  spacing="10px"
                  alignItems={{ tablet: 'center' }}
                >
                  <Typography
                    className="body-small-semibold"
                    sx={{ minWidth: '140px' }}
                  >
                    {fmtDayEs(outing.date)} · {outing.time}
                  </Typography>
                  <Autocomplete
                    sx={{ flex: 1, minWidth: '200px' }}
                    options={personOptions}
                    value={selectedPerson}
                    onChange={(_, v) =>
                      v
                        ? onUpsertCompanion(outing.outingKey, { brother: v.uid })
                        : onRemoveCompanion(outing.outingKey)
                    }
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o, v) => o.uid === v.uid}
                    renderInput={(params) => (
                      <MuiTextField {...params} label="Hermano que acompaña" size="small" />
                    )}
                  />
                  {companion && (
                    <>
                      <Select
                        value={companion.activity}
                        onChange={(e) =>
                          onUpsertCompanion(outing.outingKey, {
                            activity: e.target.value as CircuitVisitCompanionActivity,
                          })
                        }
                      >
                        {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                      {/* Solo muestra "con esposa" si el CO no es soltero
                          (hay nombre de esposa configurado en Ajustes). */}
                      {coSpouseName && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={companion.withWife}
                              onChange={(e) =>
                                onUpsertCompanion(outing.outingKey, {
                                  withWife: e.target.checked,
                                  spouse_companions: e.target.checked
                                    ? companion.spouse_companions ?? []
                                    : [],
                                })
                              }
                            />
                          }
                          label={`Con ${coSpouseName}`}
                        />
                      )}
                    </>
                  )}
                  {/* Hermanas que acompañan a la esposa del CO en paralelo */}
                  {companion?.withWife && coSpouseName && (
                    <Autocomplete
                      sx={{ flex: 1, minWidth: '200px' }}
                      multiple
                      options={personOptions}
                      value={personOptions.filter((o) =>
                        (companion.spouse_companions ?? []).includes(o.uid)
                      )}
                      onChange={(_, selected) =>
                        onUpsertCompanion(outing.outingKey, {
                          spouse_companions: selected.map((s) => s.uid),
                        })
                      }
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(o, v) => o.uid === v.uid}
                      renderInput={(params) => (
                        <MuiTextField
                          {...params}
                          label={`Hermanas con ${coSpouseName}`}
                          size="small"
                        />
                      )}
                    />
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

// ── Subcomponentes de exportación directa ──────────────────────────────────
// Cada uno monta el hook de exportación correspondiente. Se usan en la sección
// "Documentación para la Visita" para exportar sin navegar a la página.

const S21DirectExportButton = ({ disabled }: { disabled: boolean }) => {
  const { handleExportCards } = useExportS21({ open: false, onClose: () => {} });
  return (
    <Button
      variant="secondary"
      startIcon={<IconDownload />}
      disabled={disabled}
      onClick={() => handleExportCards([], 'all')}
    >
      Exportar
    </Button>
  );
};

const S88DirectExportButton = ({ disabled }: { disabled: boolean }) => {
  const { handleExportS88 } = useExportS88();
  return (
    <Button
      variant="secondary"
      startIcon={<IconDownload />}
      disabled={disabled}
      onClick={handleExportS88}
    >
      Exportar
    </Button>
  );
};

const S13DirectExportButton = ({ disabled }: { disabled: boolean }) => {
  const { exportS13 } = useTerritoryExport();
  return (
    <Button
      variant="secondary"
      startIcon={<IconDownload />}
      disabled={disabled}
      onClick={() => exportS13(new Date(), false)}
    >
      Exportar
    </Button>
  );
};

// Selector compacto de una sola persona (para anfitriones de comida, hermano
// visitado en pastoreo, anciano acompañante, etc.).
const PersonPicker = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { uid: string; label: string }[];
  onChange: (uid: string) => void;
}) => {
  const selected = options.find((o) => o.uid === value) ?? null;
  return (
    <Autocomplete
      sx={{ flex: 1, minWidth: '180px' }}
      options={options}
      value={selected}
      onChange={(_, v) => onChange(v?.uid ?? '')}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.uid === v.uid}
      renderInput={(params) => (
        <MuiTextField {...params} label={label} size="small" />
      )}
    />
  );
};

const CircuitVisitDashboard = () => {
  const {
    visits,
    selectedId,
    setSelectedId,
    working,
    saveStatus,
    handleCreateVisit,
    handleDeleteVisit,
    patch,
    addMeal,
    updateMeal,
    removeMeal,
    upsertCompanion,
    removeCompanion,
    addShepherding,
    updateShepherding,
    removeShepherding,
    updateSpecialMeeting,
    handleExportPdf,
  } = useCircuitVisitDashboard();

  const navigate = useNavigate();
  const [newWeek, setNewWeek] = useState<Date | null>(null);
  const [showPast, setShowPast] = useState(false);
  const { confirm, ConfirmDialogNode } = useConfirm();

  const handleDeleteVisitClick = async () => {
    if (!working) return;

    const ok = await confirm({
      title: 'Eliminar visita',
      message:
        'Se eliminará todo el programa de esta visita (comidas, acompañantes, pastoreo y reuniones especiales). Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!ok) return;

    handleDeleteVisit(working.id);
  };

  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Guardando…'
      : saveStatus === 'saved'
      ? 'Guardado'
      : '';

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const personOptions = useMemo(
    () =>
      persons
        .map((p) => ({
          uid: p.person_uid,
          label: buildPersonFullname(
            p.person_data.person_lastname.value,
            p.person_data.person_firstname.value,
            fullnameOption
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [persons, fullnameOption]
  );

  const elderOptions = useMemo(
    () => personOptions.filter((o) => {
      const p = persons.find((pe) => pe.person_uid === o.uid);
      return p ? personIsElder(p) : false;
    }),
    [personOptions, persons]
  );

  const todayStr = formatDate(new Date(), 'yyyy/MM/dd');

  // Visitas activas: date_end >= hoy. Pasadas: date_end < hoy.
  const activeVisits = useMemo(
    () => visits.filter((v) => v.date_end >= todayStr),
    [visits, todayStr]
  );
  const pastVisits = useMemo(
    () => visits.filter((v) => v.date_end < todayStr),
    [visits, todayStr]
  );

  // Los informes se desbloquean 10 días antes del inicio de la visita.
  const exportUnlocked = useMemo(() => {
    if (!working?.date_start) return false;
    const unlockDate = addDays(new Date(working.date_start), -10);
    return new Date() >= unlockDate;
  }, [working?.date_start]);

  const exportLockedMsg = exportUnlocked
    ? ''
    : working?.date_start
    ? `Disponible 10 días antes (${fmtDateShortEs(formatDate(addDays(new Date(working.date_start), -10), 'yyyy/MM/dd'))})`
    : '';

  return (
    <Box sx={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <PageTitle title="Visita del Superintendente de Circuito" />

      {/* Activar nueva visita */}
      <Box sx={{ mt: '12px', mb: '20px' }}>
        <Card
          title="Activar nueva visita"
          subtitle="Elige el martes en que empieza la visita."
        >
          <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing="12px" alignItems="flex-end">
            <CustomDatePicker
              label="Semana de la visita"
              view="input"
              value={newWeek}
              onChange={(d) => setNewWeek(d)}
              shouldDisableDate={(date) => date.getDay() !== 2}
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

      {/* Documentación para la Visita */}
      <Box sx={{ mb: '20px' }}>
        <Card
          title="Documentación para la Visita"
          subtitle={
            exportLockedMsg
              ? `Exportación directa: ${exportLockedMsg}`
              : 'Exporta directamente o abre la página para revisar.'
          }
        >
          <Stack divider={<Box sx={{ height: '1px', background: 'var(--line)' }} />}>
            <DocRow
              icon={<IconPerson color="var(--accent-main)" width={20} height={20} />}
              title="Registro de publicadores (S-21)"
              subtitle="Tarjetas de informe de cada publicador."
              onClick={() => navigate('/publisher-records')}
              exportButton={<S21DirectExportButton disabled={!exportUnlocked} />}
            />
            <DocRow
              icon={<IconAssignment color="var(--accent-main)" width={20} height={20} />}
              title="Asistencia a las reuniones (S-88)"
              subtitle="Registros de asistencia entre semana y fin de semana."
              onClick={() => navigate('/reports/meeting-attendance')}
              exportButton={<S88DirectExportButton disabled={!exportUnlocked} />}
            />
            <DocRow
              icon={<IconMapOverview color="var(--accent-main)" width={20} height={20} />}
              title="Territorios (S-13)"
              subtitle="Registro y estado actual de los territorios."
              onClick={() => navigate('/congregation/territories')}
              exportButton={<S13DirectExportButton disabled={!exportUnlocked} />}
            />
            <DocRow
              icon={<IconWallet color="var(--accent-main)" width={20} height={20} />}
              title="Estado de la contabilidad"
              subtitle="Gestionado aparte — revisar con el siervo de cuentas."
            />
          </Stack>
        </Card>
      </Box>

      {/* Selector de visitas activas */}
      {activeVisits.length > 0 && (
        <Stack direction="row" spacing="8px" flexWrap="wrap" mb="16px">
          {activeVisits.map((visit) => (
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
          {activeVisits.length > 0
            ? 'Selecciona una visita para ver y editar su programa.'
            : 'Aún no hay visitas activas. Activa una nueva visita arriba para empezar.'}
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
            <Stack direction="row" alignItems="center" spacing="10px">
              <Typography className="h2">{formatRange(working)}</Typography>
              {saveStatusLabel && (
                <Typography className="body-small-regular" color="var(--grey-400)">
                  {saveStatusLabel}
                </Typography>
              )}
            </Stack>
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
                onClick={handleDeleteVisitClick}
              >
                Eliminar visita
              </Button>
            </Stack>
          </Stack>

          {/* Superintendente sustituto */}
          <Card
            title="Superintendente"
            subtitle="El CO titular se muestra en Ajustes. Activa el sustituto si viene uno distinto."
          >
            <Stack spacing="12px">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={working.is_substitute ?? false}
                    onChange={(e) =>
                      patch({ is_substitute: e.target.checked })
                    }
                  />
                }
                label="Superintendente sustituto"
              />
              {working.is_substitute && (
                <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing="10px">
                  <TextField
                    label="Nombre del sustituto"
                    value={working.substitute_name ?? ''}
                    onChange={(e) => patch({ substitute_name: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Nombre de su esposa (vacío si soltero)"
                    value={working.substitute_spouse_name ?? ''}
                    onChange={(e) => patch({ substitute_spouse_name: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              )}
            </Stack>
          </Card>

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
                  <PersonPicker
                    label="Anfitrión"
                    value={meal.host}
                    options={personOptions}
                    onChange={(uid) => updateMeal(meal.id, { host: uid })}
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

          {/* Visitas de pastoreo */}
          <Card
            title="Visitas de pastoreo"
            subtitle="Hermanos que el superintendente visitará durante la semana."
          >
            <Stack spacing="14px">
              {(working.shepherding_visits ?? []).map((sv) => (
                <Stack
                  key={sv.id}
                  direction={{ mobile: 'column', tablet: 'row' }}
                  spacing="10px"
                  alignItems={{ tablet: 'center' }}
                  sx={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-m, 8px)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <PersonPicker
                    label="Hermano visitado"
                    value={sv.brother}
                    options={personOptions}
                    onChange={(uid) => updateShepherding(sv.id, { brother: uid })}
                  />
                  <PersonPicker
                    label="Anciano acompañante"
                    value={sv.elder}
                    options={elderOptions}
                    onChange={(uid) => updateShepherding(sv.id, { elder: uid })}
                  />
                  <CustomDatePicker
                    label="Fecha"
                    view="input"
                    value={sv.date ? new Date(sv.date) : null}
                    onChange={(d) =>
                      updateShepherding(sv.id, {
                        date: d ? formatDate(d, 'yyyy/MM/dd') : '',
                      })
                    }
                  />
                  <TimeField
                    value={sv.time}
                    onChange={(t) => updateShepherding(sv.id, { time: t })}
                  />
                  <IconButton onClick={() => removeShepherding(sv.id)}>
                    <IconDelete color="var(--red-main)" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                variant="secondary"
                startIcon={<IconAdd color="var(--accent-main)" />}
                onClick={addShepherding}
              >
                Añadir visita de pastoreo
              </Button>
            </Stack>
          </Card>

          {/* Programa de predicación (mismas salidas que ya existen) */}
          <PreachingSection
            visit={working}
            companions={working.co_companions}
            onUpsertCompanion={upsertCompanion}
            onRemoveCompanion={removeCompanion}
          />

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
                minDate={new Date(working.date_start)}
                maxDate={new Date(working.date_end)}
              />
              <Box sx={{ height: '1px', background: 'var(--line)' }} />
              <SpecialMeetingEditor
                label="Reunión con ancianos y SM"
                value={working.meeting_elders}
                onChange={(v) => updateSpecialMeeting('meeting_elders', v)}
                minDate={new Date(working.date_start)}
                maxDate={new Date(working.date_end)}
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

      {/* Visitas pasadas — archivo de solo lectura */}
      {pastVisits.length > 0 && (
        <Box sx={{ mt: '32px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              mb: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setShowPast((p) => !p)}
          >
            <IconHistory color="var(--grey-400)" />
            <Typography className="body-small-semibold" color="var(--grey-400)">
              {showPast ? 'Ocultar' : 'Ver'} visitas pasadas ({pastVisits.length})
            </Typography>
          </Box>

          {showPast && (
            <Stack spacing="12px">
              {pastVisits.map((visit) => {
                const coDisplayName = visit.is_substitute
                  ? `${visit.substitute_name || 'Sustituto'}${visit.substitute_spouse_name ? ` y ${visit.substitute_spouse_name}` : ''}`
                  : null;
                return (
                  <Box
                    key={visit.id}
                    sx={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-l, 12px)',
                      padding: '14px 18px',
                      opacity: 0.85,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb="10px">
                      <Stack>
                        <Typography className="h3">{formatRange(visit)}</Typography>
                        {coDisplayName && (
                          <Typography className="body-small-regular" color="var(--grey-400)">
                            Sustituto: {coDisplayName}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    {/* Comidas */}
                    {visit.meals.length > 0 && (
                      <Stack spacing="2px" mb="8px">
                        <Typography className="label-small-semibold" color="var(--grey-400)">
                          Comidas
                        </Typography>
                        {visit.meals.map((meal) => {
                          const host = persons.find((p) => p.person_uid === meal.host);
                          const hostName = host
                            ? buildPersonFullname(
                                host.person_data.person_lastname.value,
                                host.person_data.person_firstname.value,
                                fullnameOption
                              )
                            : meal.host || '—';
                          return (
                            <Typography key={meal.id} className="body-small-regular">
                              {meal.date ? fmtDayEs(meal.date) : '—'} — {hostName}
                            </Typography>
                          );
                        })}
                      </Stack>
                    )}

                    {/* Pastoreo */}
                    {(visit.shepherding_visits ?? []).length > 0 && (
                      <Stack spacing="2px" mb="8px">
                        <Typography className="label-small-semibold" color="var(--grey-400)">
                          Pastoreo
                        </Typography>
                        {(visit.shepherding_visits ?? []).map((sv) => {
                          const bro = persons.find((p) => p.person_uid === sv.brother);
                          const broName = bro
                            ? buildPersonFullname(
                                bro.person_data.person_lastname.value,
                                bro.person_data.person_firstname.value,
                                fullnameOption
                              )
                            : '—';
                          return (
                            <Typography key={sv.id} className="body-small-regular">
                              {sv.date ? fmtDayEs(sv.date) : '—'} · {sv.time || '—'} — {broName}
                            </Typography>
                          );
                        })}
                      </Stack>
                    )}

                    {/* Reuniones especiales */}
                    {(visit.meeting_pioneers || visit.meeting_elders) && (
                      <Stack spacing="2px">
                        <Typography className="label-small-semibold" color="var(--grey-400)">
                          Reuniones especiales
                        </Typography>
                        {visit.meeting_pioneers && (
                          <Typography className="body-small-regular">
                            Precursores — {visit.meeting_pioneers.date ? fmtDayEs(visit.meeting_pioneers.date) : '—'} {visit.meeting_pioneers.time}
                          </Typography>
                        )}
                        {visit.meeting_elders && (
                          <Typography className="body-small-regular">
                            Ancianos y SM — {visit.meeting_elders.date ? fmtDayEs(visit.meeting_elders.date) : '—'} {visit.meeting_elders.time}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}
      {ConfirmDialogNode}
    </Box>
  );
};

export default CircuitVisitDashboard;
