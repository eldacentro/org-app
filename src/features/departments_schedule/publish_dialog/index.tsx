import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import AppButton from '@components/button';

/**
 * Publicar o retirar una semana del programa de departamentos.
 *
 * La unidad es la semana y no el mes porque así funciona el módulo entero: se
 * edita por semana y el autocompletar pide semanas.
 */
const DeptPublishDialog = ({
  open,
  onClose,
  onConfirm,
  isPublished,
  weekOf,
  emptyRoles,
  hasSchedule,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublished: boolean;
  weekOf: string;
  emptyRoles: number;
  hasSchedule: boolean;
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="mobile"
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxWidth: '520px', width: '100%' } }}
      PaperProps={{
        style: {
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          boxShadow: 'var(--pop-up-shadow)',
        },
      }}
      slotProps={{
        backdrop: { style: { backgroundColor: 'var(--accent-dark-overlay)' } },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography className="h2" sx={{ color: 'var(--ink)' }}>
          {isPublished ? 'Retirar' : 'Publicar'} la semana del {weekOf}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: '16px', mt: '8px' }}
      >
        {!hasSchedule ? (
          <InfoTip
            isBig={false}
            color="warning"
            text="Esta semana no tiene todavía ningún programa que publicar."
          />
        ) : (
          <InfoTip
            isBig={false}
            color={isPublished ? 'warning' : 'info'}
            text={
              isPublished
                ? 'Al retirarla, esta semana vuelve a ser un borrador: dejará de aparecer en las asignaciones de los hermanos y en el programa semanal.'
                : 'Al publicarla, cada hermano verá su parte en "Mis asignaciones" y en el programa semanal, y recibirá el aviso correspondiente.'
            }
          />
        )}

        {hasSchedule && !isPublished && emptyRoles > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`Hay ${emptyRoles} ${emptyRoles === 1 ? 'puesto sin nadie asignado' : 'puestos sin nadie asignado'}. Puedes publicarla igualmente si el resto ya está decidido.`}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px', gap: '8px' }}>
        <AppButton variant="secondary" disableAutoStretch onClick={onClose}>
          Cancelar
        </AppButton>
        {hasSchedule && (
          <AppButton
            variant="main"
            color={isPublished ? 'red' : 'primary'}
            disableAutoStretch
            onClick={onConfirm}
          >
            {isPublished ? 'Retirar' : 'Publicar semana'}
          </AppButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeptPublishDialog;
