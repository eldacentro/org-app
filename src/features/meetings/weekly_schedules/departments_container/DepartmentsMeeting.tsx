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
        gap: '12px',
        width: '100%',
        minHeight: '40px',
        padding: '4px 0px',
      }}
    >
      <Typography
        className="body-small-semibold"
        color="var(--grey-400)"
        sx={{ flexShrink: 0, minWidth: '90px', fontSize: '13px' }}
      >
        {label}
      </Typography>
      
      {displayName ? (
        <Box
          sx={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            borderRadius: 'var(--r-sm)',
            border: active 
              ? '1.5px solid var(--brand)' 
              : '1px solid var(--line)',
            backgroundColor: active 
              ? 'var(--brand-tint)' 
              : 'var(--card)',
            padding: '6px 12px',
            flex: 1,
            maxWidth: '240px',
            overflow: 'hidden',
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: 'var(--brand)',
              boxShadow: 'var(--shadow-sm)',
            },
          }}
        >
          {person?.person_data?.female?.value ? (
            <IconFemale width={16} height={16} color="var(--brand)" />
          ) : (
            <IconMale width={16} height={16} color="var(--brand)" />
          )}
          <Typography 
            className="body-small-semibold"
            sx={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              fontWeight: 700,
              fontSize: '13px',
              color: active ? 'var(--brand-deep)' : 'var(--ink)',
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
            borderRadius: 'var(--r-sm)',
            border: '1px dashed var(--line)',
            backgroundColor: 'transparent',
            padding: '6px 12px',
            flex: 1,
            maxWidth: '240px',
          }}
        >
          <Typography className="body-small-regular" color="var(--grey-350)" sx={{ fontSize: '13px' }}>
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
    <Grid container spacing={2.5} sx={{ mt: 1 }}>
      {/* Acomodadores */}
      <Grid item xs={12} md={6}>
        <MeetingSection
          part={t('tr_attendants', 'Acomodadores')}
          color="var(--brand)"
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
          color="var(--brand)"
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
          color="var(--brand)"
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
          color="var(--brand)"
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
