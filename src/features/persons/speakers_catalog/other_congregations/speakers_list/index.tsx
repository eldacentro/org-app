import { Box } from '@mui/material';
import { IconAdd } from '@components/icons';
import { SpeakersListType } from './index.types';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import useSpeakersList from './useSpeakersList';
import Button from '@components/button';
import InfoTip from '@components/info_tip';
import IncomingSpeakerEdit from './edit';
import SpeakerRowView from '../../speaker_row_view';
import Typography from '@components/typography';

const SpeakersList = ({
  isEditMode,
  cong_id,
  cong_synced,
}: SpeakersListType) => {
  const { t } = useAppTranslation();

  const { mobile400Down } = useBreakpoints();

  /**
   * Quién puede corregir los discursos de un orador de fuera. Se pregunta UNA
   * vez por lista y no una por fila: el hook de permisos son más de cien hooks,
   * y aquí hay congregaciones con cientos de oradores.
   */
  const { isPublicTalkCoordinator, isWeekendEditor } = useCurrentUser();

  const puedeCorregir = isPublicTalkCoordinator || isWeekendEditor;

  const {
    handleVisitingSpeakersAdd,
    incomingSpeakers,
    congregation,
    viewList,
    editList,
  } = useSpeakersList(cong_id, isEditMode, cong_synced);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {congregation.cong_data.cong_id.length === 0 &&
        !isEditMode &&
        incomingSpeakers.length === 0 && (
          <Typography color="var(--grey-350)">
            {t('tr_incomingCongregationNoSpeakers')}
          </Typography>
        )}

      {congregation.cong_data.request_status === 'pending' && (
        <Typography color="var(--grey-350)">
          {t('tr_incomingCongregationOnlinePending')}
        </Typography>
      )}

      {congregation.cong_data.request_status === 'disapproved' && (
        <Typography color="var(--grey-350)">
          {t('tr_incomingCongregationOnlineDisapproved')}
        </Typography>
      )}

      {congregation.cong_data.request_status === 'approved' &&
        congregation.cong_data.cong_id.length > 0 &&
        incomingSpeakers.length === 0 && (
          <Typography color="var(--grey-350)">
            {t('tr_incomingCongregationOnlineNoSpeakers')}
          </Typography>
        )}

      {/* Lo que solo se mira. Fuera del modo edición son TODOS; dentro, solo
          los que trae la fuente (el Sheet del circuito, o la propia
          congregación si usa la app), porque editarlos aquí duraría hasta la
          siguiente sincronización. Ver `viewList`. */}
      {viewList.length > 0 && (
        <Box>
          {!mobile400Down && (
            <Box
              sx={{
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <Typography
                className="body-small-regular"
                color="var(--grey-350)"
                sx={{ minWidth: '220px', width: '220px' }}
              >
                {t('tr_name')}
              </Typography>
              <Typography
                className="body-small-regular"
                color="var(--grey-350)"
              >
                {t('tr_publicTalks')}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              '& > .MuiBox-root': {
                borderBottom: '1px solid var(--line)',
                padding: '4px 0',
              },
              '& > .MuiBox-root:last-child': {
                borderBottom: 'none',
              },
            }}
          >
            {viewList.map((speaker) => (
              <SpeakerRowView
                key={speaker.person_uid}
                speaker={speaker}
                allowTalksFix={puedeCorregir}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Lo que se edita. Sin fuente que la mantenga, la lista entera; con
          fuente, solo lo añadido a mano: es tuyo hasta que la fuente lo
          reclame. Ver `editList`. */}
      {editList.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            '& > .MuiBox-root': {
              borderBottom: '1px solid var(--line)',
              paddingBottom: '16px',
            },
            '& > .MuiBox-root:last-child': {
              borderBottom: 'none',
            },
          }}
        >
          {editList.map((speaker) => (
            <IncomingSpeakerEdit key={speaker.person_uid} speaker={speaker} />
          ))}
        </Box>
      )}

      {/* Añadir a mano se permite también en una congregación sincronizada.
          Es el caso excepcional que faltaba: llega un hermano nuevo y aquí
          hace falta para cuadrar un discurso antes de que a alguien le dé
          tiempo a meterlo en la fuente. Cuando la fuente lo traiga, se
          reconoce por el nombre, se funde con este y deja de ser editable. */}
      {isEditMode && (
        <>
          {cong_synced && (
            <InfoTip
              isBig={false}
              color="info"
              text={t(
                'tr_speakersManualAddSynced',
                'Los oradores de esta congregación los mantiene su propia fuente, así que aquí solo se miran. Si falta alguno porque todavía no lo han metido, puedes añadirlo a mano: cuando la fuente lo traiga, se juntarán en uno solo sin perder lo que hayas puesto.'
              )}
            />
          )}

          <Button
            variant="tertiary"
            startIcon={<IconAdd />}
            sx={{ width: '100%' }}
            onClick={() => handleVisitingSpeakersAdd(cong_id)}
          >
            {t('tr_speakersAdd')}
          </Button>
        </>
      )}
    </Box>
  );
};

export default SpeakersList;
