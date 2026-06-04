import SwitchWithLabel from '@components/switch_with_label';
import useAppTranslation from '@hooks/useAppTranslation';
import useCurrentUser from '@hooks/useCurrentUser';
import useCodelessAccess from './useCodelessAccess';

const CodelessAccess = () => {
  const { t } = useAppTranslation();

  const { isAdmin } = useCurrentUser();

  const { enabled, handleToggle, isProcessing } = useCodelessAccess();

  return (
    <SwitchWithLabel
      label={t('tr_codelessAccess')}
      helper={t('tr_codelessAccessDesc')}
      checked={enabled}
      onChange={handleToggle}
      readOnly={!isAdmin || isProcessing}
    />
  );
};

export default CodelessAccess;
