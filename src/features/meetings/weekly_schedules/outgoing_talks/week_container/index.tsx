import { Stack } from '@mui/material';
import { WeekContainerProps } from './index.types';
import useWeekContainer from './useWeekContainer';
import Divider from '@components/divider';
import MeetingSection from '@features/meetings/meeting_section';
import ScheduleItem from '../schedule_item';
import { IconVisitingSpeaker } from '@components/icons';

/**
 * Un día con discursos que salen de la congregación.
 *
 * ── Por qué es una `MeetingSection` ──────────────────────────────────────
 *
 * Era una franja de color con la fecha y, debajo, los discursos SUELTOS sobre
 * el fondo de la página. O sea, la única pestaña de Programas semanales sin la
 * tarjeta blanca: al lado de "Reunión de entre semana" o "Reunión de fin de
 * semana" —donde cada bloque es una tarjeta con su cabecera de color— esta
 * parecía a medio hacer.
 *
 * La franja que tenía ya era media `MeetingSection`: el mismo color del fin de
 * semana, en el mismo sitio. Le faltaba la tarjeta de debajo, que es lo que
 * recoge el contenido y lo separa de la página.
 */
const WeekContainer = ({ talkSchedules }: WeekContainerProps) => {
  const { dateFormatted } = useWeekContainer(talkSchedules.date);

  return (
    <MeetingSection
      part={dateFormatted}
      color="var(--weekend-meeting)"
      icon={<IconVisitingSpeaker color="var(--always-white)" />}
      alwaysExpanded
    >
      <Stack spacing="8px" divider={<Divider color="var(--line)" />}>
        {talkSchedules.schedules.map((item) => (
          <ScheduleItem key={item.id} schedule={item} />
        ))}
      </Stack>
    </MeetingSection>
  );
};

export default WeekContainer;
