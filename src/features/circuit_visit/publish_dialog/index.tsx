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
 * Publicar o retirar una visita del superintendente.
 *
 * Mismo trato que Departamentos, Exhibidores y Salidas, con una diferencia: allí
 * la unidad es el MES y aquí es la visita entera, que ya es una sola semana.
 *
 * Lo que se publica es lo que se reparte a personas —comidas, acompañantes y
 * pastoreo—. Que la semana sea semana de visita no depende de esto: eso sale en
 * cuanto se activa la visita, y tiene su propia ventana de dos meses en
 * Programas semanales.
 */
const CircuitVisitPublishDialog = ({
  open,
  onClose,
  onConfirm,
  isPublished,
  rangeLabel,
  assignedPeopleCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublished: boolean;
  rangeLabel: string;
  assignedPeopleCount: number;
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
          borderRadius: 'var(--shape-xl)',
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
          {isPublished ? 'Retirar' : 'Publicar'}
          {rangeLabel ? `: ${rangeLabel}` : ''}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          mt: '8px',
        }}
      >
        <InfoTip
          isBig={false}
          color={isPublished ? 'warning' : 'info'}
          text={
            isPublished
              ? 'Al retirarla, la visita vuelve a ser un borrador: las comidas, los acompañantes y el pastoreo dejarán de aparecer en "Mis asignaciones" de cada hermano.'
              : 'Al publicarla, cada hermano verá lo suyo en "Mis asignaciones": los anfitriones su comida, los acompañantes su salida y los ancianos su visita de pastoreo.'
          }
        />

        {!isPublished && assignedPeopleCount === 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text="Todavía no has puesto a nadie en las comidas, los acompañantes ni el pastoreo. Puedes publicarla igualmente, y lo que añadas después ya les llegará directamente."
          />
        )}

        {!isPublished && assignedPeopleCount > 0 && (
          <InfoTip
            isBig={false}
            color="info"
            text={
              assignedPeopleCount === 1
                ? 'Hay 1 hermano con algo asignado en esta visita.'
                : `Hay ${assignedPeopleCount} hermanos con algo asignado en esta visita.`
            }
          />
        )}

        {isPublished && (
          <InfoTip
            isBig={false}
            color="info"
            text="Mientras siga publicada, lo que cambies se les actualiza al momento. No hace falta volver a publicar."
          />
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px', gap: '8px' }}>
        <AppButton variant="secondary" disableAutoStretch onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton
          variant="main"
          color={isPublished ? 'red' : undefined}
          disableAutoStretch
          onClick={onConfirm}
        >
          {isPublished ? 'Retirar' : 'Publicar'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default CircuitVisitPublishDialog;
