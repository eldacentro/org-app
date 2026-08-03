import { Box } from '@mui/material';
import Dialog from '@components/dialog';
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
    // El Dialog del sistema, no el de MUI en crudo: es el que pone los
    // márgenes seguros de iOS. Su Paper ya trae el radio, el fondo y la
    // sombra, así que aquí no se repiten. Ver DESIGN_SYSTEM §6.1.
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" sx={{ color: 'var(--ink)' }}>
        {isPublished ? 'Retirar' : 'Publicar'}
        {rangeLabel ? `: ${rangeLabel}` : ''}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Decía «No hace falta volver a publicar», y era verdad a medias: lo
            que cambias sí les llega solo, pero desde que la visita avisa de los
            cambios hay un botón que se llama justo así, y las dos cosas juntas
            no se entienden. Se explica lo que hace ese botón, que no es
            reenviar nada. */}
        {isPublished && (
          <InfoTip
            isBig={false}
            color="info"
            text="Mientras siga publicada, lo que cambies les llega solo: no hay que reenviar nada. Si cambias algo aparecerá un aviso con el botón «Volver a publicar», que únicamente apaga ese aviso cuando ya lo has repasado."
          />
        )}
      </Box>

      {/* Cancelar a la izquierda y la acción principal la más a la derecha,
          como en todos los diálogos de la app. */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <AppButton variant="tertiary" onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton
          variant="main"
          color={isPublished ? 'red' : undefined}
          onClick={onConfirm}
        >
          {isPublished ? 'Retirar' : 'Publicar'}
        </AppButton>
      </Box>
    </Dialog>
  );
};

export default CircuitVisitPublishDialog;
