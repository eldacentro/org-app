import { Box, Typography } from '@mui/material';
import { IconCheckCircle } from '@components/icons';

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
            borderRadius: 'var(--shape-sm)',
            // `COLORES.fondo2D` es #F8FAFC, la paleta del PLANO. En un dibujo
            // un blanco fijo es correcto; en una tarjeta de la interfaz con
            // el texto en `--ink-2` es gris claro sobre casi blanco en cuanto
            // se pone el tema oscuro.
            backgroundColor: 'var(--accent-100)',
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
