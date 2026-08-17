import { Box, SxProps, Theme, Tooltip } from '@mui/material';
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
  /**
   * Otro texto para el modo con etiqueta.
   *
   * Existe porque la misma casilla sirve en dos sitios donde la frase útil no
   * es la misma: debajo del nombre, en el programa, lo que hace falta decir es
   * qué significa marcarla («Marcar hojita entregada»); en la lista de
   * pendientes, donde ya se sabe que la hojita salió, lo que hace falta es el
   * estado en el que se ha quedado («Por confirmar»).
   */
  textos?: { pendiente: string; confirmado: string };
  /** Para encajarla en una fila; sin esto lleva el aire de ir debajo de un campo. */
  sx?: SxProps<Theme>;
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
        transition:
          'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
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
        ...props.sx,
      }}
    >
      {casilla}

      <Typography
        className="label-small-regular"
        color={confirmed ? 'var(--green-main)' : 'var(--ink-2)'}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {confirmed
          ? (props.textos?.confirmado ?? 'Hojita entregada')
          : (props.textos?.pendiente ?? 'Marcar hojita entregada')}
      </Typography>
    </Box>
  );
};

export default AssignmentConfirmed;
