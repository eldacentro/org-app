import { Box, Typography } from '@mui/material';
import { IconCheckCircle } from '@components/icons';
import { COLORES } from './data';

type Props = {
  normas: string[];
};

const NormasGenerales = ({ normas }: Props) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {normas.map((norma, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: COLORES.fondo2D,
            border: '1px solid var(--line)',
          }}
        >
          <Box aria-hidden sx={{ flexShrink: 0, display: 'flex' }}>
            <IconCheckCircle width={16} height={16} color="var(--green-main)" />
          </Box>
          <Typography className="body-small-regular" color="var(--ink-2)">
            {norma}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default NormasGenerales;
