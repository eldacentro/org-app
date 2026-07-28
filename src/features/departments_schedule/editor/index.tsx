import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { Button, Dialog, Typography } from '@components/index';
import { IconClose } from '@components/icons';
import Badge from '@components/badge';
import PersonSelector from '@features/meetings/person_selector';
import { personsStateFind } from '@services/states/persons';
import useDepartmentEditor from './useDepartmentEditor';
import { buildDeptSlots } from '@services/app/departments_slots';
import { DepartmentType } from '@definition/person';

const DEPARTMENTS: {
  dept: DepartmentType;
  label: { key: string; fallback: string };
}[] = [
  { dept: 'acomodadores', label: { key: 'tr_attendants', fallback: 'Acomodadores' } },
  { dept: 'microfonos', label: { key: 'tr_microphones', fallback: 'Micrófonos' } },
  { dept: 'multimedia', label: { key: 'tr_multimedia', fallback: 'Multimedia' } },
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
          <Badge text={t('tr_noMeetingWeek')} color="grey" size="medium" filled={false} />
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
    <Box
      sx={{
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2-caps">{weekName}</Typography>
        {meetingDaysName && (
          <Typography className="body-small-regular" color="var(--grey-400)">
            {meetingDaysName}
          </Typography>
        )}
      </Box>

      <Dialog onClose={handleCloseClearAll} open={clearAll} sx={{ padding: '24px' }}>
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
            <Box
              sx={{
                p: 2,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
              }}
            >
              <Typography className="h3" sx={{ mb: 2 }}>
                {t(label.key, label.fallback)}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {buildDeptSlots(departmentsConfig, dept).map((slot) => (
                  <PersonSelector
                    key={slot.key}
                    label={slot.label}
                    week={selectedWeek}
                    dept={dept}
                    assignment="MM_Other"
                    personValue={personsStateFind(
                      schedule?.[dept]?.[slot.key]?.value
                    )}
                    onSelect={(p) => handleSaveAssignment(dept, slot.key, p)}
                  />
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
