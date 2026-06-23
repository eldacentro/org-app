import { useAppTranslation } from '@hooks/index';
import {
  CardSection,
  CardSectionContent,
  CardSectionHeader,
} from '../shared_styles';
import SpecialMonths from './special_months';
import TerritoriesEnabled from './territories_enabled';

const MinistrySettings = () => {
  const { t } = useAppTranslation();

  return (
    <CardSection>
      <CardSectionHeader title={t('tr_ministry')} />

      <CardSectionContent>
        <TerritoriesEnabled />
        <SpecialMonths />
      </CardSectionContent>
    </CardSection>
  );
};

export default MinistrySettings;
