import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { schedulesState } from '@states/schedules';
import { userDataViewState } from '@states/settings';
import { isMeetingWeekPublished } from '@services/app/meetings_publish';
import { DraftBanner, DraftEmptyState } from '../draft_notice';
import { IconInfo, IconVisitingSpeaker } from '@components/icons';
import useOutgoingTalks from './useOutgoingTalks';
import WeekChipStrip from '../week_chip_strip';
import WeekScheduleHeader from '../week_schedule_header';
import WeekContainer from './week_container';
import NoSchedule from '../no_schedule';
import Typography from '@components/typography';
import EmptyState from '@components/empty_state';

const OutgoingTalks = () => {
  const { t } = useAppTranslation();
  const { isPublicTalkCoordinator } = useCurrentUser();
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const {
    value,
    handleValueChange,
    handleGoCurrent,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    talkSchedules,
  } = useOutgoingTalks();

  const isDraft =
    !!week &&
    !isMeetingWeekPublished(
      schedules.find((record) => record.weekOf === week),
      'outgoing',
      dataView
    );

  return noSchedule ? (
    <NoSchedule />
  ) : (
    <Box
      sx={{
        marginTop: '8px',
        // El mismo ritmo que las otras pestañas: 16px entre la tira de
        // semanas, la cabecera y el contenido. Aquí no había ninguno —el
        // `spacing` del `Stack` de abajo solo separa a SUS hijos entre sí— y
        // el contenido salía pegado al "Semana del 27 de julio al 2 de
        // agosto", sin nada de aire.
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <WeekChipStrip value={value} onChange={handleValueChange} />

      <WeekScheduleHeader
        currentVisible={currentWeekVisible}
        week={week}
        onCurrent={handleGoCurrent}
        lastUpdated={scheduleLastUpdated}
      />

      {/* Mes en BORRADOR: las salidas que el coordinador todavía no ha
          confirmado no se le enseñan a la congregación. */}
      {week && isDraft && !isPublicTalkCoordinator && (
        <DraftEmptyState text="Todavía no hay discursos salientes publicados para esta semana." />
      )}

      {week && (!isDraft || isPublicTalkCoordinator) && (
        <Stack spacing="16px">
          {isDraft && (
            <DraftBanner text="Mes sin publicar. Esto es un borrador: solo lo ves tú, y no le aparece a nadie hasta que lo publiques." />
          )}

          {talkSchedules.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--grey-350)',
                marginTop: '-8px',
                marginBottom: '-8px',
              }}
            >
              <IconInfo color="var(--grey-350)" />
              <Typography color="var(--grey-350)">
                {t('tr_infoOutgoingTalk')}
              </Typography>
            </Box>
          )}

          {talkSchedules.length === 0 ? (
            // El estado vacío compartido. Este era una caja de borde PUNTEADO
            // hecha a mano, que se quedó fuera de la unificación de estados
            // vacíos: el punteado significa "aquí se suelta algo", y aquí no
            // se suelta nada.
            <EmptyState
              icon={<IconVisitingSpeaker color="var(--accent-dark)" />}
              title={t(
                'tr_noOutgoingTalksThisWeek',
                'No hay discursos salientes programados para esta semana'
              )}
            />
          ) : (
            talkSchedules.map((item) => (
              <WeekContainer key={item.date} talkSchedules={item} />
            ))
          )}
        </Stack>
      )}
    </Box>
  );
};

export default OutgoingTalks;
