import { ReactElement } from 'react';
import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import { IconFemale, IconMale, IconGroups, IconRecordVoiceOver, IconPlay, IconPodium } from '@components/icons';
import Typography from '@components/typography';
import { personsStateFind } from '@services/states/persons';
import { departmentsConfigState, displayNameMeetingsEnableState, fullnameOptionState, userLocalUIDState } from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { DeptWeekType } from '@definition/departments_schedule';
import { DepartmentType, PersonType } from '@definition/person';
import { buildDeptSlots } from '@services/app/departments_slots';
import MeetingSection from '@features/meetings/meeting_section';
import { isDeptWeekPublished } from '@services/app/departments_publish';
import { useCurrentUser } from '@hooks/index';

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
            className="body-small-regular"
            color="var(--grey-350)"
            sx={{
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

// Los puestos de cada departamento salen de la configuración
// (services/app/departments_slots); aquí solo vive lo que es de esta
// pantalla: el rótulo traducible y el icono.
const DEPARTMENTS: {
  dept: DepartmentType;
  label: { key: string; fallback: string };
  icon: ReactElement;
}[] = [
  {
    dept: 'acomodadores',
    label: { key: 'tr_attendants', fallback: 'Acomodadores' },
    icon: <IconGroups color="var(--always-white)" />,
  },
  {
    dept: 'microfonos',
    label: { key: 'tr_microphones', fallback: 'Micrófonos' },
    icon: <IconRecordVoiceOver color="var(--always-white)" />,
  },
  {
    dept: 'multimedia',
    label: { key: 'tr_multimedia', fallback: 'Multimedia' },
    icon: <IconPlay color="var(--always-white)" />,
  },
  {
    dept: 'plataforma',
    label: { key: 'tr_platform', fallback: 'Plataforma' },
    icon: <IconPodium color="var(--always-white)" />,
  },
];

const DepartmentsMeeting = ({ schedule }: { schedule?: DeptWeekType }) => {
  const { t } = useAppTranslation();

  const departmentsConfig = useAtomValue(departmentsConfigState);

  const { isServiceCommittee } = useCurrentUser();

  const isDraft = !isDeptWeekPublished(schedule);

  // Semana en BORRADOR: para el resto de la congregación no existe todavía.
  // Lo que autocompletar propone no es una decisión hasta que se publica.
  if (isDraft && !isServiceCommittee) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          marginTop: '16px',
          justifyContent: 'center',
        }}
      >
        <Typography className="body-regular" color="var(--grey-400)">
          Todavía no hay programa de departamentos publicado para esta semana.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing="20px" sx={{ mt: 1 }}>
      {isDraft && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--orange-secondary)',
            border: '1px solid var(--orange-dark)',
            borderRadius: 'var(--r-lg)',
          }}
        >
          <Typography className="body-small-regular" color="var(--orange-dark)">
            Semana sin publicar. Esto es un borrador: solo lo ves tú, y no le
            aparece a nadie en sus asignaciones hasta que la publiques.
          </Typography>
        </Box>
      )}

      {DEPARTMENTS.map(({ dept, label, icon }) => (
        <MeetingSection
          key={dept}
          part={t(label.key, label.fallback)}
          color="var(--brand)"
          icon={icon}
          alwaysExpanded
        >
          {buildDeptSlots(departmentsConfig, dept).map((slot) => (
            <DeptPersonComponent
              key={slot.key}
              label={slot.label}
              person={personsStateFind(schedule?.[dept]?.[slot.key]?.value)}
              fallbackName={schedule?.[dept]?.[slot.key]?.name}
            />
          ))}
        </MeetingSection>
      ))}
    </Stack>
  );
};

export default DepartmentsMeeting;

