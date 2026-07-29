import { Box } from '@mui/material';
import { PersonSelectorType } from './index.types';
import usePersonSelector from './usePersonSelector';
import BrotherSelector from './brother_selector';
import CircuitOverseer from './circuit_overseer';
import OutgoingSpeaker from './outgoing_speaker';
import StreamSpeaker from './stream_speaker';
import StudentSelector from './student_selector';
import VisitingSpeaker from './visiting_speaker';

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

  // La casilla de "hojita entregada" NO va aquí: vive dentro del carril de
  // acciones del selector de estudiante, junto al historial y la descarga.
  // Estuvo aquí fuera un tiempo y era imposible alinearla con los otros dos
  // botones — cada uno colgaba de un ancla distinta.
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
    </Box>
  );
};

export default PersonSelector;
