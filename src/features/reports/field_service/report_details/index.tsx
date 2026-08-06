import { Box, Stack } from '@mui/material';
import {
  IconArrowBack,
  IconAuxiliaryPioneer,
  IconCheck,
  IconDelete,
  IconInfo,
} from '@components/icons';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import { CardContainer } from '../shared_styles';
import useReportDetails from './useReportDetails';
import Button from '@components/button';
import FormS4 from '@features/ministry/report/form_S4';
import LateReport from './late_report';
import PersonDetails from '@features/persons/person_details';
import Typography from '@components/typography';

/** El cargo con el que se metió el informe, en palabras. */
const ROL_AUTOR = {
  publisher: 'tr_publisher',
  group_overseer: 'tr_groupOverseer',
  group_assistant: 'tr_groupAssistant',
  secretary: 'tr_secretary',
} as const;

const ReportDetails = () => {
  const { t } = useAppTranslation();

  const { desktopUp } = useBreakpoints();

  const { isSecretary, isGroup, isGroupOverseer } = useCurrentUser();

  const {
    addedBy,
    person,
    handleBack,
    enable_quick_AP,
    unverified,
    handleAssignAP,
    handleVerifyReport,
    isInactive,
    handleMarkAsActive,
    currentMonth,
    deletable,
    handleDeleteReport,
  } = useReportDetails();

  return (
    <CardContainer sx={{ position: 'sticky', top: '72px' }}>
      {!person && (
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_reportDetails')}</Typography>
          <Typography color="var(--grey-400)">
            <Box
              component="span"
              sx={{
                verticalAlign: '-6px',
                display: 'inline-flex',
                marginRight: '4px',
              }}
            >
              <IconInfo color="var(--grey-400)" />
            </Box>
            {t('tr_reportPageInfo')}
          </Typography>
        </Stack>
      )}

      {person && (
        <Stack spacing="24px">
          <Stack spacing="8px">
            {!desktopUp && (
              <Button
                variant="small"
                onClick={handleBack}
                startIcon={<IconArrowBack width={18} height={18} />}
                disableAutoStretch
                sx={{
                  height: '32px',
                  minHeight: '32px',
                  alignSelf: 'flex-start',
                  padding: '0 8px',
                }}
              >
                {t('tr_back')}
              </Button>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <PersonDetails person={person} month={currentMonth} />

              <Stack spacing="2px" alignItems="flex-end">
                <LateReport person={person} />

                {/* Quién metió el informe. Va arriba a la derecha porque es
                    contexto, no un dato del informe: sirve para saber a quién
                    preguntar si algo no cuadra. */}
                {addedBy && (
                  <Typography
                    className="label-small-regular"
                    color="var(--grey-350)"
                  >
                    {t('tr_reportAddedBy')}:{' '}
                    {addedBy.name ? `${addedBy.name} · ` : ''}
                    {t(ROL_AUTOR[addedBy.role])}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>

          <FormS4 month={currentMonth} person_uid={person.person_uid} />

          {/* Nombrar precursor auxiliar lo puede hacer también quien lleva el
              grupo —superintendente o auxiliar—, que es quien está encima de los
              informes de su gente. El resto de acciones de aquí abajo siguen
              siendo del secretario: verificar un informe, borrarlo o reactivar a
              un publicador son decisiones suyas.

              Y no hace falta acotar aquí a quién se lo pone: esta pantalla solo
              se abre desde la lista, y a quien lleva un grupo esa lista ya le
              enseña únicamente a los suyos (ver `usePersonsList`). El acotado de
              verdad está en el servidor, que es lo que cuenta. */}
          {!isGroup && (isSecretary || isGroupOverseer) && (
            <Stack spacing="8px">
              {enable_quick_AP && (
                <Button
                  variant="tertiary"
                  startIcon={<IconAuxiliaryPioneer />}
                  onClick={handleAssignAP}
                >
                  {t('tr_assignAuxPioBtn')}
                </Button>
              )}

              {isSecretary && unverified && (
                <Button
                  variant="main"
                  startIcon={<IconCheck />}
                  onClick={handleVerifyReport}
                >
                  {t('tr_markAsVerified')}
                </Button>
              )}

              {isSecretary && deletable && (
                <Button
                  variant="main"
                  color="red"
                  startIcon={<IconDelete />}
                  onClick={handleDeleteReport}
                >
                  {t('tr_delete')}
                </Button>
              )}

              {isSecretary && isInactive && (
                <Button
                  variant="main"
                  onClick={handleMarkAsActive}
                  startIcon={<IconCheck />}
                >
                  {t('tr_reactivatePublisher')}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </CardContainer>
  );
};

export default ReportDetails;
