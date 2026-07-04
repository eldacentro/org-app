import { Box, Stack } from '@mui/material';
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

const DeptPersonComponent = ({
  label,
  person,
  fallbackName,
}: {
  label: string;
  person?: PersonType;
  fallbackName?: string;
}) => {
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  // Si la persona ya no existe (se borró), se usa el nombre que ya se
  // guardó junto con el uid al momento de asignar, en vez de dejar la
  // fila en blanco sin ningún rastro de quién estaba asignado.
  const displayName = person
    ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
    : fallbackName || '';

  const active = person?.person_uid === userUID;
  const accentColor = 'var(--brand)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        width: '100%',
        minHeight: '44px',
        padding: '6px 0px',
      }}
    >
      <Typography
        className="body-small-semibold"
        color="var(--grey-500)"
        sx={{ 
          flexShrink: 0, 
          minWidth: '95px', 
          fontSize: '13.5px',
          fontWeight: 600,
          letterSpacing: '0.2px'
        }}
      >
        {label}
      </Typography>
      
      {displayName ? (
        <Box
          sx={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            borderRadius: 'var(--radius-xl)',
            border: active 
              ? '1.5px solid var(--brand)' 
              : '1px solid var(--line)',
            borderLeft: `4px solid ${accentColor}`,
            backgroundColor: active 
              ? 'var(--brand-tint)' 
              : 'var(--card)',
            padding: '8px 16px',
            flex: 1,
            overflow: 'hidden',
            boxShadow: active ? 'var(--hover-shadow)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default',
            '&:hover': {
              transform: 'translateY(-1.5px)',
              borderColor: active ? 'var(--brand)' : accentColor,
              boxShadow: 'var(--small-card-shadow)',
            },
          }}
        >
          {person?.person_data?.female?.value ? (
            <IconFemale width={16} height={16} color={accentColor} />
          ) : (
            <IconMale width={16} height={16} color={accentColor} />
          )}
          <Typography
            className="body-small-semibold"
            sx={{
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 700,
              fontSize: '13.5px',
              color: active ? 'var(--brand-deep)' : 'var(--ink)',
              letterSpacing: '0.1px'
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
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--line)',
            borderLeft: `4px dashed var(--grey-300)`,
            backgroundColor: 'rgba(var(--grey-100-base), 0.03)',
            padding: '8px 16px',
            flex: 1,
            minHeight: '38px',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'var(--grey-350)',
              backgroundColor: 'rgba(var(--grey-100-base), 0.06)',
            }
          }}
        >
          <Typography 
            className="body-small-medium" 
            color="var(--grey-350)" 
            sx={{ 
              fontSize: '13px', 
              fontWeight: 500,
              letterSpacing: '0.5px' 
            }}
          >
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
    <Stack spacing="20px" sx={{ mt: 1 }}>
      {/* Acomodadores */}
      <MeetingSection
        part={t('tr_attendants', 'Acomodadores')}
        color="var(--brand)"
        icon={<IconGroups color="var(--always-white)" />}
        alwaysExpanded
      >
        <DeptPersonComponent
          label="Exterior"
          person={personsStateFind(schedule?.acomodadores?.exterior?.value)}
          fallbackName={schedule?.acomodadores?.exterior?.name}
        />
        <DeptPersonComponent
          label="Interior"
          person={personsStateFind(schedule?.acomodadores?.interior?.value)}
          fallbackName={schedule?.acomodadores?.interior?.name}
        />
      </MeetingSection>

      {/* Micrófonos */}
      <MeetingSection
        part={t('tr_microphones', 'Micrófonos')}
        color="var(--brand)"
        icon={<IconRecordVoiceOver color="var(--always-white)" />}
        alwaysExpanded
      >
        <DeptPersonComponent
          label="Micro 1"
          person={personsStateFind(schedule?.microfonos?.micro1?.value)}
          fallbackName={schedule?.microfonos?.micro1?.name}
        />
        <DeptPersonComponent
          label="Micro 2"
          person={personsStateFind(schedule?.microfonos?.micro2?.value)}
          fallbackName={schedule?.microfonos?.micro2?.name}
        />
      </MeetingSection>

      {/* Multimedia */}
      <MeetingSection
        part={t('tr_multimedia', 'Multimedia')}
        color="var(--brand)"
        icon={<IconPlay color="var(--always-white)" />}
        alwaysExpanded
      >
        <DeptPersonComponent
          label="Vídeo"
          person={personsStateFind(schedule?.multimedia?.video?.value)}
          fallbackName={schedule?.multimedia?.video?.name}
        />
        <DeptPersonComponent
          label="Audio"
          person={personsStateFind(schedule?.multimedia?.audio?.value)}
          fallbackName={schedule?.multimedia?.audio?.name}
        />
      </MeetingSection>

      {/* Plataforma */}
      <MeetingSection
        part={t('tr_platform', 'Plataforma')}
        color="var(--brand)"
        icon={<IconPodium color="var(--always-white)" />}
        alwaysExpanded
      >
        <DeptPersonComponent
          label="Encargado"
          person={personsStateFind(schedule?.plataforma?.encargado?.value)}
          fallbackName={schedule?.plataforma?.encargado?.name}
        />
      </MeetingSection>
    </Stack>
  );
};

export default DepartmentsMeeting;

