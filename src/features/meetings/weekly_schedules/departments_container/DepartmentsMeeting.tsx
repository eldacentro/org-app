import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import { IconFemale, IconMale, IconGroups, IconRecordVoiceOver, IconPlay, IconPodium } from '@components/icons';
import Typography from '@components/typography';
import { personsStateFind } from '@services/states/persons';
import { displayNameMeetingsEnableState, fullnameOptionState, userLocalUIDState } from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { DeptWeekType } from '@definition/departments_schedule';
import { PersonType } from '@definition/person';
import MeetingSection from '@features/meetings/meeting_section';

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
        justifyContent: 'space-between',
        gap: '8px',
        width: '100%',
        minHeight: '36px',
        padding: '2px 0px',
      }}
    >
      <Typography
        className="body-small-regular"
        color="var(--grey-350)"
        sx={{ flexShrink: 0, minWidth: '80px' }}
      >
        {label}
      </Typography>
      
      {displayName ? (
        <Box
          sx={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            borderRadius: 'var(--radius-s)',
            border: active 
              ? '1px solid var(--accent-main)' 
              : '1px solid transparent',
            backgroundColor: active 
              ? 'var(--accent-150)' 
              : 'var(--grey-50)',
            padding: '4px 8px',
            flex: 1,
            maxWidth: '220px',
            overflow: 'hidden',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {person?.person_data?.female?.value ? (
            <IconFemale width={16} height={16} color="var(--grey-400)" />
          ) : (
            <IconMale width={16} height={16} color="var(--grey-400)" />
          )}
          <Typography 
            className="body-small-regular"
            sx={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--accent-dark)' : 'var(--black)',
            }}
          >
            {displayName}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-s)',
            border: '1px dashed var(--grey-300)',
            backgroundColor: 'transparent',
            padding: '4px 8px',
            flex: 1,
            maxWidth: '220px',
          }}
        >
          <Typography className="body-small-regular" color="var(--grey-350)">
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
        <MeetingSection
          part={t('tr_attendants', 'Acomodadores')}
          color="var(--accent-main)"
          icon={<IconGroups color="var(--always-white)" />}
          alwaysExpanded
        >
          <DeptPersonComponent
            label="Exterior"
            person={personsStateFind(schedule?.acomodadores?.exterior?.value)}
          />
          <DeptPersonComponent
            label="Interior"
            person={personsStateFind(schedule?.acomodadores?.interior?.value)}
          />
        </MeetingSection>
      </Grid>

      {/* Micrófonos */}
      <Grid item xs={12} md={6}>
        <MeetingSection
          part={t('tr_microphones', 'Micrófonos')}
          color="var(--accent-main)"
          icon={<IconRecordVoiceOver color="var(--always-white)" />}
          alwaysExpanded
        >
          <DeptPersonComponent
            label="Micro 1"
            person={personsStateFind(schedule?.microfonos?.micro1?.value)}
          />
          <DeptPersonComponent
            label="Micro 2"
            person={personsStateFind(schedule?.microfonos?.micro2?.value)}
          />
        </MeetingSection>
      </Grid>

      {/* Multimedia */}
      <Grid item xs={12} md={6}>
        <MeetingSection
          part={t('tr_multimedia', 'Multimedia')}
          color="var(--accent-main)"
          icon={<IconPlay color="var(--always-white)" />}
          alwaysExpanded
        >
          <DeptPersonComponent
            label="Vídeo"
            person={personsStateFind(schedule?.multimedia?.video?.value)}
          />
          <DeptPersonComponent
            label="Audio"
            person={personsStateFind(schedule?.multimedia?.audio?.value)}
          />
        </MeetingSection>
      </Grid>

      {/* Plataforma */}
      <Grid item xs={12} md={6}>
        <MeetingSection
          part={t('tr_platform', 'Plataforma')}
          color="var(--accent-main)"
          icon={<IconPodium color="var(--always-white)" />}
          alwaysExpanded
        >
          <DeptPersonComponent
            label="Encargado"
            person={personsStateFind(schedule?.plataforma?.encargado?.value)}
          />
        </MeetingSection>
      </Grid>
    </Grid>
  );
};

export default DepartmentsMeeting;
