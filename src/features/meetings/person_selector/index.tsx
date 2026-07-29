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
        ...props.selectorBoxSx,
      }}
    >
      {isBrother && <BrotherSelector {...props} />}
      {isStudent && <StudentSelector {...props} />}
      {isCircuitOverseer && <CircuitOverseer {...props} />}
      {isStreamSpeaker && <StreamSpeaker {...props} />}
      {isOutgoingSpeaker && <OutgoingSpeaker {...props} />}
      {isVisitingSpeaker && <VisitingSpeaker {...props} />}

      {/* La marca de hojita entregada va DEBAJO del campo, no a su lado.
          Al lado le robaba 32 px al nombre, y en un móvil de 375 px eso es la
          diferencia entre que quepa "Daniel Cook" y que salga cortado: el
          nombre vive en un <input>, que no puede partirse en dos líneas.
          Debajo, además, se entiende sola —lleva su texto— y es más fácil de
          acertar con el dedo. */}
      <AssignmentConfirmed
        week={props.week}
        assignment={props.assignment}
        withLabel
      />
    </Box>
  );
};

export default PersonSelector;
