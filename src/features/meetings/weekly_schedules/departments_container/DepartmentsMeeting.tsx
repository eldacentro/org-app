import { ReactElement } from 'react';
import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import {
  IconGroups,
  IconRecordVoiceOver,
  IconPlay,
  IconPodium,
} from '@components/icons';
import Typography from '@components/typography';
import AssigneeName from '../assignee_name';
import { personsStateFind } from '@services/states/persons';
import {
  departmentsConfigState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userLocalUIDState,
} from '@states/settings';
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

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '16px',
        width: '100%',
        padding: '6px 0px',
      }}
    >
      <Typography
        className="label-small-regular"
        color="var(--grey-400)"
        sx={{ flexShrink: 0, minWidth: '95px' }}
      >
        {label}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AssigneeName name={displayName} isMe={active} singleLine />
      </Box>
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

  // Quien lleva los departamentos tiene que poder ver SU borrador. Antes esto
  // preguntaba por el comité de servicio, que no es lo mismo: el responsable
  // con el rol de departamentos —y nada más— no entraba, así que veía "no hay
  // programa publicado" en lugar de lo que él mismo acababa de escribir.
  const { isDepartmentsEditor } = useCurrentUser();

  // Una semana SIN REGISTRO no es un borrador: es que todavía no hay nada.
  // Distinguirlo importa, porque si no cualquier semana vacía se anunciaba
  // como "borrador sin publicar" incluso en meses que no hay que publicar.
  const hasSchedule = Boolean(schedule?.weekOf);

  const isDraft = hasSchedule && !isDeptWeekPublished(schedule);

  // Sin programa guardado, o con la semana en BORRADOR: para el resto de la
  // congregación no hay nada que enseñar. Lo que autocompletar propone no es
  // una decisión hasta que se publica.
  if ((!hasSchedule || isDraft) && !isDepartmentsEditor) {
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
          Todavía no hay programa de departamentos para esta semana.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing="16px" sx={{ mt: 1 }}>
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
