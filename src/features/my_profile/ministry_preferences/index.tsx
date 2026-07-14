import SwitchWithLabel from '@components/switch_with_label';
import Typography from '@components/typography';
import { ProfileItemContainer } from '../index.styles';
import { useAppTranslation } from '@hooks/index';
import useMinistryPreferences from './useMinistryPreferences';

const MinistryPreferences = () => {
  const { t } = useAppTranslation();

  const { addCredits, handleAddCreditsChange } = useMinistryPreferences();

  return (
    <ProfileItemContainer>
      <Typography className="h2">{t('tr_ministryPreferences')}</Typography>

      <SwitchWithLabel
        label={t('tr_theocraticAssignmentsField')}
        helper={t('tr_theocraticAssignmentsFieldDesc')}
        checked={addCredits}
        onChange={handleAddCreditsChange}
      />
    </ProfileItemContainer>
  );
};

export default MinistryPreferences;
