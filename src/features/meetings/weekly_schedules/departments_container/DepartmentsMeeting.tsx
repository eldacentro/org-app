import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import { IconFemale, IconMale } from '@components/icons';
import Typography from '@components/typography';
import { personsStateFind } from '@services/states/persons';
import { displayNameMeetingsEnableState, fullnameOptionState, userLocalUIDState } from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { DeptWeekType } from '@definition/departments_schedule';
import { PersonType } from '@definition/person';

const DeptPersonComponent = ({ label, person }: { label: string; person?: PersonType }) => {
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  const displayName = person
    ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
    : '';

  const active = person?.person_uid === userUID;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 0px',
      }}
    >
      <Typography
        className="body-small-regular"
        color="var(--grey-350)"
        sx={{ flex: 1 }}
      >
        {label}
      </Typography>
      {displayName ? (
        <Box
          sx={{
            width: '250px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            borderRadius: 'var(--radius-s)',
            border: active ? '1px solid var(--accent-click)' : '1px solid var(--accent-200)',
            backgroundColor: active ? 'var(--accent-150)' : 'var(--accent-50)',
            padding: '6px 8px',
          }}
        >
          {person?.person_data?.female?.value ? (
            <IconFemale width={20} height={20} />
          ) : (
            <IconMale width={20} height={20} />
          )}
          <Typography className="body-small-regular">
            {displayName}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            width: '250px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            borderRadius: 'var(--radius-s)',
            border: '1px dashed var(--grey-300)',
            backgroundColor: 'var(--grey-50)',
            padding: '6px 8px',
          }}
        >
          <Typography className="body-small-regular" color="var(--grey-400)">
            —
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const DepartmentsMeeting = ({ schedule }: { schedule?: DeptWeekType }) => {
  const { t } = useAppTranslation();

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Acomodadores */}
      <Grid item xs={12} md={6}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'var(--white)',
            border: '1px solid var(--accent-300)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Typography className="h3" sx={{ mb: 2 }}>
            {t('tr_attendants', 'Acomodadores')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DeptPersonComponent
              label="Exterior"
              person={personsStateFind(schedule?.acomodadores?.exterior?.value)}
            />
            <DeptPersonComponent
              label="Interior"
              person={personsStateFind(schedule?.acomodadores?.interior?.value)}
            />
          </Box>
        </Box>
      </Grid>

      {/* Micrófonos */}
      <Grid item xs={12} md={6}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'var(--white)',
            border: '1px solid var(--accent-300)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Typography className="h3" sx={{ mb: 2 }}>
            {t('tr_microphones', 'Micrófonos')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DeptPersonComponent
              label="Micro 1"
              person={personsStateFind(schedule?.microfonos?.micro1?.value)}
            />
            <DeptPersonComponent
              label="Micro 2"
              person={personsStateFind(schedule?.microfonos?.micro2?.value)}
            />
          </Box>
        </Box>
      </Grid>

      {/* Multimedia */}
      <Grid item xs={12} md={6}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'var(--white)',
            border: '1px solid var(--accent-300)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Typography className="h3" sx={{ mb: 2 }}>
            {t('tr_multimedia', 'Multimedia')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DeptPersonComponent
              label="Vídeo"
              person={personsStateFind(schedule?.multimedia?.video?.value)}
            />
            <DeptPersonComponent
              label="Audio"
              person={personsStateFind(schedule?.multimedia?.audio?.value)}
            />
          </Box>
        </Box>
      </Grid>

      {/* Plataforma */}
      <Grid item xs={12} md={6}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'var(--white)',
            border: '1px solid var(--accent-300)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Typography className="h3" sx={{ mb: 2 }}>
            {t('tr_platform', 'Plataforma')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DeptPersonComponent
              label="Encargado"
              person={personsStateFind(schedule?.plataforma?.encargado?.value)}
            />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default DepartmentsMeeting;
