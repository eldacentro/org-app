import { Box, Stack } from '@mui/material';
import IconLoading from '@components/icon_loading';
import { useAppTranslation } from '@hooks/index';
import { SchedulePublishProps } from './index.types';
import useSchedulePublish from './useSchedulePublish';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Divider from '@components/divider';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import YearContainer from './year_container';

/**
 * Publicar o retirar meses del programa de reunión.
 *
 * Este diálogo ya existía —las casillas por año y mes—, pero solo subía el
 * programa a la web pública. Ahora hace además lo que hacen Departamentos,
 * Exhibidores y Salidas: decidir si la congregación ve ese mes dentro de la
 * aplicación. Por eso se le añadió lo que allí ya estaba y aquí faltaba: qué
 * pasa al publicar y al retirar, qué falta por decidir, y a quién se ha puesto
 * teniendo una ausencia apuntada.
 */
const SchedulePublish = (props: SchedulePublishProps) => {
  const { t } = useAppTranslation();

  const {
    schedulesList,
    handleCheckedChange,
    handlePublishSchedule,
    handleRetireSchedule,
    isProcessing,
    checkedMonths,
    allCheckedPublished,
    missingParts,
    awayAssignees,
  } = useSchedulePublish(props);

  const meetingLabel =
    props.type === 'midweek'
      ? 'la reunión de entre semana'
      : 'la reunión de fin de semana';

  return (
    <Dialog onClose={props.onClose} open={props.open} sx={{ padding: '24px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography className="h3">{t('tr_publishSchedules')}</Typography>
        <Typography color="var(--grey-400)">
          {t('tr_publishSchedulesDesc')}
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing="24px"
        divider={
          <Divider orientation="vertical" color="var(--line)" flexItem />
        }
        sx={{ width: '100%', overflow: 'auto' }}
      >
        {schedulesList.map((schedule) => (
          <YearContainer
            key={schedule.year}
            data={schedule}
            onChange={handleCheckedChange}
          />
        ))}
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        {checkedMonths.length > 0 && (
          <InfoTip
            isBig={false}
            color={allCheckedPublished ? 'warning' : 'info'}
            text={
              allCheckedPublished
                ? `Al retirarlo, vuelve a ser un borrador de ${meetingLabel}: dejará de aparecer en las asignaciones de los hermanos y en el programa semanal.`
                : `Al publicarlo, cada hermano verá su parte de ${meetingLabel} en "Mis asignaciones" y en el programa semanal, y recibirá el aviso correspondiente.`
            }
          />
        )}

        {checkedMonths.length > 0 && !allCheckedPublished && missingParts > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`Hay ${missingParts} ${missingParts === 1 ? 'parte principal sin nadie asignado' : 'partes principales sin nadie asignado'}. Puedes publicarlo igualmente si el resto ya está decidido.`}
          />
        )}

        {checkedMonths.length > 0 && awayAssignees.length > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`${awayAssignees.join(', ')} ${awayAssignees.length === 1 ? 'tiene una ausencia apuntada' : 'tienen una ausencia apuntada'} en las fechas que se van a publicar.`}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        {allCheckedPublished ? (
          <Button
            variant="main"
            color="red"
            disabled={isProcessing}
            onClick={handleRetireSchedule}
            endIcon={isProcessing && <IconLoading />}
          >
            Retirar
          </Button>
        ) : (
          <Button
            variant="main"
            disabled={isProcessing}
            onClick={handlePublishSchedule}
            endIcon={isProcessing && <IconLoading />}
          >
            {t('tr_publish')}
          </Button>
        )}
        <Button variant="tertiary" onClick={props.onClose}>
          {t('tr_cancel')}
        </Button>
      </Box>
    </Dialog>
  );
};

export default SchedulePublish;
