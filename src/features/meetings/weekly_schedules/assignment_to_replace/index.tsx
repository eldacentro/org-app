import { AssignmentFieldType } from '@definition/assignment';
import { Tooltip } from '@mui/material';
import { IconRefreshSchedule } from '@components/icons';
import IconButton from '@components/icon_button';
import useAssignmentToReplace from './useAssignmentToReplace';

/**
 * El botón de «por cambiar», en el carril de acciones del selector.
 *
 * Apagado es un icono más del carril, en el gris de lo que no está puesto;
 * encendido se pone naranja, que es el color de «esto pide atención» en toda la
 * aplicación. Naranja y no rojo a propósito: no es un error, es trabajo
 * pendiente, y el rojo aquí sería una alarma que no se puede apagar hasta que
 * alguien encuentre sustituto.
 *
 * Lleva tooltip porque un icono solo no dice qué hace y además esto escribe.
 */
const AssignmentToReplace = (props: {
  week: string;
  assignment?: AssignmentFieldType;
  dataView?: string;
}) => {
  const { visible, toReplace, toggle, saving } = useAssignmentToReplace(props);

  if (!visible) return null;

  return (
    <Tooltip
      title={
        toReplace
          ? 'Quitar la marca de por cambiar'
          : 'Marcar: esta persona no puede'
      }
    >
      <IconButton
        edge={false}
        sx={{ padding: 0, opacity: saving ? 0.5 : 1 }}
        aria-label={
          toReplace
            ? 'Quitar la marca de por cambiar'
            : 'Marcar que esta persona no puede'
        }
        aria-pressed={toReplace}
        onClick={toggle}
      >
        <IconRefreshSchedule
          color={toReplace ? 'var(--orange-dark)' : 'var(--grey-350)'}
        />
      </IconButton>
    </Tooltip>
  );
};

export default AssignmentToReplace;
