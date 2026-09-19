import { Box } from '@mui/material';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';

type ApplicationDeleteConfirmProps = {
  open: boolean;
  busy: boolean;
  /** El nombre del hermano, para que se sepa qué se está borrando. */
  name: string;
  /** Ya aprobada: borrarla no le quita el nombramiento, y hay que decirlo. */
  approved: boolean;
  onClose: VoidFunction;
  onConfirm: VoidFunction;
};

const ApplicationDeleteConfirm = ({
  open,
  busy,
  name,
  approved,
  onClose,
  onConfirm,
}: ApplicationDeleteConfirmProps) => {
  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Typography className="h2">¿Borrar esta solicitud?</Typography>
        <Typography className="body-regular" color="var(--ink-2)">
          Se quita la solicitud de {name} para todo el comité, y también deja de
          verla quien la envió. No se puede deshacer.
        </Typography>
        <Typography className="body-regular" color="var(--ink-2)">
          {approved
            ? 'Ya estaba aprobada: borrarla no cambia su ficha, así que sigue constando como precursor auxiliar. Si lo que quieres es retirar el nombramiento, se hace en su ficha.'
            : 'Sirve para quitar una solicitud repetida o enviada por error. Si lo que quieres es decirle que no, recházala.'}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        <Button variant="main" color="red" disabled={busy} onClick={onConfirm}>
          Borrar solicitud
        </Button>
        <Button variant="tertiary" disabled={busy} onClick={onClose}>
          Cancelar
        </Button>
      </Box>
    </Dialog>
  );
};

export default ApplicationDeleteConfirm;
