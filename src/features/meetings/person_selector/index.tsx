import { Box } from '@mui/material';
import { PersonSelectorType } from './index.types';
import usePersonSelector from './usePersonSelector';
import BrotherSelector from './brother_selector';
import CircuitOverseer from './circuit_overseer';
import OutgoingSpeaker from './outgoing_speaker';
import StreamSpeaker from './stream_speaker';
import StudentSelector from './student_selector';
import VisitingSpeaker from './visiting_speaker';
import AssignmentConfirmed from '@features/meetings/weekly_schedules/assignment_confirmed';

const PersonSelector = (props: PersonSelectorType) => {
  const flexPersonSelector = props.flex ?? true;

  const {
    isBrother,
    isStudent,
    isCircuitOverseer,
    isStreamSpeaker,
    isOutgoingSpeaker,
    isVisitingSpeaker,
  } = usePersonSelector(props);

  return (
    <Box
      sx={{
        flex: flexPersonSelector ? 1 : null,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ...props.selectorBoxSx,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isBrother && <BrotherSelector {...props} />}
        {isStudent && <StudentSelector {...props} />}
        {isCircuitOverseer && <CircuitOverseer {...props} />}
        {isStreamSpeaker && <StreamSpeaker {...props} />}
        {isOutgoingSpeaker && <OutgoingSpeaker {...props} />}
        {isVisitingSpeaker && <VisitingSpeaker {...props} />}
      </Box>

      {/* Al lado del campo. Estuvo un rato debajo porque aquí le robaba 32px
          al nombre y lo dejaba cortado, pero eso ya no pasa: con `multiline`
          el nombre que no cabe se parte en dos líneas en vez de recortarse.
          Se dibuja sola solo en las asignaciones que llevan hoja. */}
      <AssignmentConfirmed week={props.week} assignment={props.assignment} />
    </Box>
  );
};

export default PersonSelector;
