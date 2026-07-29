import { ReactElement } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * La acción de una pestaña, en la cabecera de la semana.
 *
 * Misma forma para todas —Consejos en salidas, Documentos en exhibidores— y
 * la misma que el enlace de JW Library de las reuniones, para que las seis
 * pestañas se sientan la misma pantalla.
 */
const Accion = ({
  icono,
  texto,
  onClick,
}: {
  icono?: ReactElement;
  texto: string;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      appearance: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      px: '12px',
      py: '6px',
      borderRadius: 'var(--radius-max)',
      border: 'none',
      backgroundColor: 'var(--accent-main)',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      '&:hover': { backgroundColor: 'var(--accent-dark)' },
    }}
  >
    {icono}
    <Typography className="label-small-semibold" color="var(--always-white)">
      {texto}
    </Typography>
  </Box>
);

export default Accion;
