import { Box } from '@mui/material';
import { IconAdd, IconSync } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { SpeakersOutgoingProps } from './index.types';
import useSpeakersOutgoing from './useSpeakersOutgoing';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import NoSpeakers from '../no_speakers';
import SpeakerEditView from '../speaker_edit';
import SpeakerRowView from '../../speaker_row_view';

const SpeakersOutgoing = ({ isEditMode }: SpeakersOutgoingProps) => {
  const { t } = useAppTranslation();

  const {
    handleSpeakerAdd,
    speakers,
    hasBrokenLinks,
    handleReconcileLinks,
    diagnostics,
    isDiagnosticsOpen,
    handleCloseDiagnostics,
  } = useSpeakersOutgoing();

  const getDiagnosticReasonText = (diagnostic: (typeof diagnostics)[number]) => {
    switch (diagnostic.reason) {
      case 'wrong-congregation':
        return t('tr_speakersDiagnosticReasonWrongCongregation');
      case 'already-linked':
        return t('tr_speakersDiagnosticReasonAlreadyLinked', {
          linkedName: diagnostic.linkedPersonName,
        });
      case 'no-candidates':
        return t('tr_speakersDiagnosticReasonNoCandidates');
      case 'ambiguous':
        return t('tr_speakersDiagnosticReasonAmbiguous', {
          candidates: (diagnostic.candidateNames ?? []).join(', '),
        });
      default:
        return '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '-24px',
      }}
    >
      {!isEditMode && speakers.length === 0 && <NoSpeakers />}

      {!isEditMode && (
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
          {speakers.map((speaker) => (
            <SpeakerRowView key={speaker.person_uid} speaker={speaker} />
          ))}
        </Box>
      )}

      {isEditMode && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            '& > .MuiBox-root': {
              borderBottom: '1px solid var(--line)',
              paddingBottom: '10px',
            },
            '& > .MuiBox-root:last-child': {
              borderBottom: 'none',
            },
          }}
        >
          {speakers.map((speaker) => (
            <SpeakerEditView
              key={speaker.person_uid}
              speaker={speaker}
              outgoing={true}
            />
          ))}
        </Box>
      )}

      {isEditMode && hasBrokenLinks && (
        <Button
          variant="tertiary"
          color="red"
          startIcon={<IconSync />}
          onClick={handleReconcileLinks}
        >
          {t('tr_speakersReconcileLinks')}
        </Button>
      )}

      {isEditMode && (
        <Button
          variant="tertiary"
          startIcon={<IconAdd />}
          onClick={handleSpeakerAdd}
        >
          {t('tr_speakersAdd')}
        </Button>
      )}

      <Dialog
        onClose={handleCloseDiagnostics}
        open={isDiagnosticsOpen}
        sx={{ padding: '24px' }}
      >
        <Typography className="h2">
          {t('tr_speakersDiagnosticTitle')}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
          }}
        >
          {diagnostics.map((diagnostic, index) => (
            <Box key={`${diagnostic.speakerName}-${index}`}>
              <Typography className="body-small-semibold">
                {diagnostic.speakerName}
              </Typography>
              <Typography className="body-small-regular" color="var(--grey-400)">
                {getDiagnosticReasonText(diagnostic)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Button
          variant="main"
          onClick={handleCloseDiagnostics}
          sx={{ width: '100%' }}
        >
          {t('tr_speakersDiagnosticClose')}
        </Button>
      </Dialog>
    </Box>
  );
};

export default SpeakersOutgoing;
