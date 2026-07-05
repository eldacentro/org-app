import { useAppTranslation, useCurrentUser } from '@hooks/index';
import TextField from '@components/textfield';
import useSpeakersEmail from './useSpeakersEmail';

const SpeakersEmail = () => {
  const { t } = useAppTranslation();

  const { isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();

  const { email, handleEmailChange, handleEmailSave } = useSpeakersEmail();

  return (
    <TextField
      type="text"
      label={t('tr_publicTalkSpeakersEmail')}
      helperText={t('tr_publicTalkSpeakersEmailDesc')}
      value={email}
      onChange={(e) => handleEmailChange(e.target.value)}
      onKeyUp={handleEmailSave}
      slotProps={{ input: { readOnly: !isWeekendEditor && !isPublicTalkCoordinator } }}
    />
  );
};

export default SpeakersEmail;
