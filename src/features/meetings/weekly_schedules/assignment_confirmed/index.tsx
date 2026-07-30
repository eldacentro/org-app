import { Box, Tooltip } from '@mui/material';
import { AssignmentFieldType } from '@definition/assignment';
import { IconCheck } from '@components/icons';
import Typography from '@components/typography';
import useAssignmentConfirmed from './useAssignmentConfirmed';

/**
 * Casilla de "hojita entregada y aceptada", al lado del nombre.
 *
 * Las hojitas se reparten con dos meses de antelación, así que es fácil que
 * una se quede sin entregar y nadie se entere hasta el día de la reunión.
 * Esto es el registro de que esa se dio y el hermano dijo que sí.
 *
 * Es un botón pequeño y sin relleno mientras está vacío: son diez por semana,
 * y diez casillas llamativas encima de los nombres taparían el programa. Lo
 * que tiene que saltar a la vista es lo que FALTA, y para eso basta con que lo
 * confirmado se ponga en verde y lo demás se quede en un contorno gris.
 *
 * Aquí SÍ lleva tooltip, al revés que los nombres: un icono solo no dice qué
 * hace, y esto además es una acción que escribe.
 */
const AssignmentConfirmed = (props: {
  week: string;
  assignment?: AssignmentFieldType;
  dataView?: string;
  /** Con texto al lado, para cuando va suelta debajo de un campo. */
  withLabel?: boolean;
}) => {
  const { visible, confirmed, toggle, saving } = useAssignmentConfirmed(props);

  if (!visible) return null;

  const casilla = (
    <Box
      role="checkbox"
      aria-checked={confirmed}
      aria-label="Hojita entregada y aceptada"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
      sx={{
        flexShrink: 0,
        width: '24px',
        height: '24px',
        borderRadius: 'var(--shape-xs)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: saving ? 'default' : 'pointer',
        opacity: saving ? 0.5 : 1,
        border: confirmed
          ? '1px solid var(--green-main)'
          : '1px solid var(--line-2)',
        backgroundColor: confirmed ? 'var(--green-secondary)' : 'transparent',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          borderColor: confirmed ? 'var(--green-main)' : 'var(--grey-350)',
        },
      }}
    >
      {confirmed && (
        <IconCheck width={16} height={16} color="var(--green-main)" />
      )}
    </Box>
  );

  if (!props.withLabel) {
    return (
      <Tooltip
        title={
          confirmed
            ? 'Hojita entregada y aceptada. Pulsa para desmarcar.'
            : 'Marcar cuando le hayas dado la hojita y la haya aceptado'
        }
      >
        {casilla}
      </Tooltip>
    );
  }

  // Con texto no hace falta tooltip: ya dice lo que es. Toda la fila responde
  // al toque, que en un móvil acertarle a 24 px es pedir mucho.
  return (
    <Box
      onClick={toggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '6px',
        cursor: saving ? 'default' : 'pointer',
        width: 'fit-content',
      }}
    >
      {casilla}

      <Typography
        className="label-small-regular"
        color={confirmed ? 'var(--green-main)' : 'var(--grey-400)'}
      >
        {confirmed ? 'Hojita entregada' : 'Marcar hojita entregada'}
      </Typography>
    </Box>
  );
};

export default AssignmentConfirmed;
