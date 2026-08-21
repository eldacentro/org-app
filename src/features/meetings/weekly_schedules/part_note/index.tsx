import { Box } from '@mui/material';
import Typography from '@components/typography';
import { useMeetingRunPart } from '../meeting_run/useMeetingRunPart';

/**
 * Lo que quien preside apuntó de esta parte, debajo de ella.
 *
 * Estaba en la barra de abajo y no se sabía de qué parte era: había que
 * acordarse de cuál estaba sonando cuando se escribió. Aquí se lee pegada a la
 * suya y no hace falta preguntárselo.
 *
 * No se pinta nada si no hay nota, ni para quien no puede verla: al que solo
 * mira le llegan vacías salvo que la congregación las haya compartido, y a un
 * publicador no le llegan nunca, porque viajan cifradas con la llave maestra.
 */
const PartNote = ({ partKey }: { partKey: string }) => {
  const run = useMeetingRunPart(partKey);

  if (!run?.note) return null;

  return (
    <Box
      sx={{
        padding: '8px 12px',
        borderRadius: 'var(--shape-sm)',
        backgroundColor: 'var(--accent-100)',
        border: '1px solid var(--accent-200)',
      }}
    >
      <Typography className="label-small-regular" color="var(--ink-2)">
        {run.note}
      </Typography>
    </Box>
  );
};

export default PartNote;
