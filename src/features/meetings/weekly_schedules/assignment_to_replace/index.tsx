import { Box } from '@mui/material';
import { AssignmentFieldType } from '@definition/assignment';
import Typography from '@components/typography';
import useAssignmentToReplace from './useAssignmentToReplace';

/**
 * La etiqueta de «Por cambiar», debajo del campo.
 *
 * NO es un botón: marcar y desmarcar se hace desde el menú de la fila. Esto
 * solo lo DICE, y por eso está aquí fuera y no dentro del menú: si el único
 * rastro de que un hermano no puede estuviera detrás de tres puntos, habría que
 * abrir diez menús cada semana para saber si hay algo pendiente. Meter cosas en
 * un menú no puede significar esconderlas.
 *
 * Con palabras y no con un icono, que era el problema de antes: un dibujo
 * apagado y el mismo dibujo encendido se confunden, y encima hay que
 * aprendérselo. «Por cambiar» no hay que aprendérselo.
 *
 * En naranja, el color de lo que pide atención en toda la aplicación, y en el
 * mismo sitio y tamaño que la línea de ayuda que ya sale bajo estos campos.
 */
const AssignmentToReplace = (props: {
  week: string;
  assignment?: AssignmentFieldType;
  dataView?: string;
}) => {
  const { visible, toReplace } = useAssignmentToReplace(props);

  if (!visible || !toReplace) return null;

  return (
    <Box sx={{ padding: '4px 16px 0 16px' }}>
      <Typography
        className="label-small-semibold"
        color="var(--orange-dark)"
        sx={{
          display: 'inline-block',
          backgroundColor: 'var(--orange-secondary)',
          borderRadius: 'var(--shape-full)',
          padding: '2px 10px',
        }}
      >
        Por cambiar
      </Typography>
    </Box>
  );
};

export default AssignmentToReplace;
