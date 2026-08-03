import { Box } from '@mui/material';
import Dialog from '@components/dialog';
import { MESES_ES } from '@utils/nombres_fecha';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import AppButton from '@components/button';
import { OutgoingMonthGaps } from '@services/app/meetings_publish';

/**
 * Publicar o retirar un mes de discursos salientes.
 *
 * El mismo diálogo que Departamentos, con el aviso que aquí tiene sentido.
 * "Puestos sin nadie" no vale: una salida existe porque alguien la ha creado,
 * no porque el calendario la reclame. Lo que sí se escapa, y es lo que se
 * cuenta aquí, es la salida a medias: sin orador, sin discurso, o sin saber a
 * qué congregación va — y como la fecha de la salida sale del día de reunión de
 * esa congregación, sin ella tampoco hay fecha.
 */
const OutgoingPublishDialog = ({
  open,
  onClose,
  onConfirm,
  isPublished,
  month,
  gaps,
  awayNames,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublished: boolean;
  month: string;
  gaps: OutgoingMonthGaps;
  awayNames: string[];
}) => {
  const monthLabel = (() => {
    const [year, monthNumber] = month.split('/');
    const names = [...MESES_ES];

    return `${names[Number(monthNumber) - 1] ?? ''} ${year ?? ''}`.trim();
  })();

  const hasTalks = gaps.total > 0;

  const gapPhrases: string[] = [];

  if (gaps.withoutSpeaker > 0) {
    gapPhrases.push(
      `${gaps.withoutSpeaker} sin orador`
    );
  }

  if (gaps.withoutTalk > 0) {
    gapPhrases.push(`${gaps.withoutTalk} sin discurso asignado`);
  }

  if (gaps.withoutCongregation > 0) {
    gapPhrases.push(
      `${gaps.withoutCongregation} sin congregación, así que tampoco tienen fecha`
    );
  }

  return (
    // El Dialog del sistema, no el de MUI en crudo. Ver DESIGN_SYSTEM §6.1.
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" sx={{ color: 'var(--ink)' }}>
        {isPublished ? 'Retirar' : 'Publicar'}: {monthLabel}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!hasTalks ? (
          <InfoTip
            isBig={false}
            color="warning"
            text="Este mes no tiene todavía ninguna salida que publicar."
          />
        ) : (
          <InfoTip
            isBig={false}
            color={isPublished ? 'warning' : 'info'}
            text={
              isPublished
                ? 'Al retirarlo, este mes vuelve a ser un borrador: las salidas dejarán de aparecer en las asignaciones de los oradores y en el programa semanal.'
                : 'Al publicarlo, cada orador verá su salida en "Mis asignaciones" y en el programa semanal, y recibirá el aviso correspondiente.'
            }
          />
        )}

        {hasTalks && !isPublished && gapPhrases.length > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`De las ${gaps.total} salidas del mes: ${gapPhrases.join('; ')}. Puedes publicarlo igualmente si el resto ya está decidido.`}
          />
        )}

        {hasTalks && awayNames.length > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`${awayNames.join(', ')} ${awayNames.length === 1 ? 'tiene una ausencia apuntada' : 'tienen una ausencia apuntada'} en las fechas que se van a publicar.`}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <AppButton variant="tertiary" onClick={onClose}>
          Cancelar
        </AppButton>
        {hasTalks && (
          <AppButton
            variant="main"
            color={isPublished ? 'red' : undefined}
            onClick={onConfirm}
          >
            {isPublished ? 'Retirar' : 'Publicar'}
          </AppButton>
        )}
      </Box>
    </Dialog>
  );
};

export default OutgoingPublishDialog;
