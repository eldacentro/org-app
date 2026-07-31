import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { Button, Dialog, Typography } from '@components/index';
import WeekNavigator from '@features/meetings/week_navigator';
import { IconClose } from '@components/icons';
import Badge from '@components/badge';
import PersonSelector from '@features/meetings/person_selector';
import { personsStateFind } from '@services/states/persons';
import useDepartmentEditor from './useDepartmentEditor';
import { buildDeptSlotGroups } from '@services/app/departments_slots';
import { DepartmentType } from '@definition/person';

const DEPARTMENTS: {
  dept: DepartmentType;
  label: { key: string; fallback: string };
}[] = [
  {
    dept: 'acomodadores',
    label: { key: 'tr_attendants', fallback: 'Acomodadores' },
  },
  {
    dept: 'microfonos',
    label: { key: 'tr_microphones', fallback: 'Micrófonos' },
  },
  {
    dept: 'multimedia',
    label: { key: 'tr_multimedia', fallback: 'Multimedia' },
  },
  { dept: 'plataforma', label: { key: 'tr_platform', fallback: 'Plataforma' } },
];

const DepartmentEditor = () => {
  const { t } = useAppTranslation();
  const {
    selectedWeek,
    schedule,
    handleSaveAssignment,
    clearAll,
    handleOpenClearAll,
    handleCloseClearAll,
    handleClearAll,
    weekName,
    meetingDaysName,
    isNoMeetingWeek,
    departmentsConfig,
    weekList,
    handleSelectWeek,
  } = useDepartmentEditor();

  if (selectedWeek.length === 0) return null;

  if (isNoMeetingWeek) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        <Typography className="h2-caps">{weekName}</Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexGrow: 1,
            minHeight: '200px',
            textAlign: 'center',
          }}
        >
          <Badge
            text={t('tr_noMeetingWeek')}
            color="grey"
            size="medium"
            filled={false}
          />
          <Typography color="var(--grey-400)" sx={{ maxWidth: '320px' }}>
            {t(
              'tr_noMeetingWeekDeptDesc',
              'No hay reunión esta semana (asamblea, conmemoración u otro evento especial), así que no hace falta asignar turno.'
            )}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    // UNA tarjeta que contiene la semana y todos los departamentos, igual que
    // el editor de entre semana y el de fin de semana. Aquí el navegador de
    // semana flotaba suelto sobre el fondo de la página y cada departamento
    // era su propia tarjeta aparte, así que no se leía como "el programa de
    // esta semana" sino como cuatro cosas sin relación.
    <Box
      sx={{
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        borderRadius: 'var(--shape-xl)',
        padding: '16px',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* La misma cabecera con flechas que los editores de reunión. Aquí no
            había ninguna: para pasar a la semana siguiente había que volver a
            la lista. */}
        <WeekNavigator
          label={weekName}
          weeks={weekList}
          value={selectedWeek}
          onChange={handleSelectWeek}
        />
        {meetingDaysName && (
          <Typography className="body-small-regular" color="var(--grey-400)">
            {meetingDaysName}
          </Typography>
        )}
      </Box>

      <Dialog
        onClose={handleCloseClearAll}
        open={clearAll}
        sx={{ padding: '24px' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography className="h2">{t('tr_clearAllAssignments')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_clearAllAssignmentsDesc')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
          }}
        >
          <Button variant="main" color="red" onClick={handleClearAll}>
            {t('tr_clear')}
          </Button>
          <Button variant="tertiary" onClick={handleCloseClearAll}>
            {t('tr_cancel')}
          </Button>
        </Box>
      </Dialog>

      {/* Las tarjetas y sus puestos salen de la configuración, no de una lista
          escrita a mano: un departamento puede asignarse por semana o por
          reunión, y con uno o dos turnos. Ver services/app/departments_slots. */}
      <Grid container spacing={2}>
        {DEPARTMENTS.map(({ dept, label }) => (
          <Grid key={dept} size={{ mobile: 12, laptop: 6 }}>
            {/* Ya NO es una tarjeta: ahora la tarjeta es la de fuera, y una
                dentro de otra es el anti-patrón del doble anidado
                (DESIGN_SYSTEM.md §8). Se separa con el rótulo y el aire. */}
            <Box>
              <Typography className="h3" sx={{ mb: 2 }}>
                {t(label.key, label.fallback)}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {buildDeptSlotGroups(departmentsConfig, dept).map((grupo) => (
                  <Box
                    key={grupo.titulo ?? 'unico'}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {/* De qué reunión —o de qué turno— son los campos de
                        debajo. Antes esto iba pegado al final de la etiqueta de
                        CADA campo ("Micro 1 · Entre semana"), así que había que
                        leerse el final de los seis para saber cuál era cuál. */}
                    {grupo.titulo && (
                      <Typography
                        className="label-small-semibold"
                        color="var(--ink-3)"
                      >
                        {grupo.titulo}
                      </Typography>
                    )}

                    {grupo.slots.map((slot) => (
                      <PersonSelector
                        key={slot.key}
                        label={slot.label}
                        week={selectedWeek}
                        dept={dept}
                        assignment="MM_Other"
                        // En Departamentos el historial de asignaciones no
                        // aporta: aquí se reparten puestos fijos de la semana,
                        // no se elige a quien lleva más tiempo sin participar.
                        showAssignmentsHistory={false}
                        personValue={personsStateFind(
                          schedule?.[dept]?.[slot.key]?.value
                        )}
                        onSelect={(p) =>
                          handleSaveAssignment(dept, slot.key, p)
                        }
                      />
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          color="red"
          startIcon={<IconClose />}
          onClick={handleOpenClearAll}
        >
          {t('tr_clearAll')}
        </Button>
      </Box>
    </Box>
  );
};

export default DepartmentEditor;
