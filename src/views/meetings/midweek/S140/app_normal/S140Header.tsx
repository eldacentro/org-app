import { Text, View } from '@react-pdf/renderer';
import { useAppTranslation } from '@hooks/index';
import { S140HeaderType } from '../shared/index.types';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';
import { applyRTL, isRTL } from '@views/utils/pdf_utils';

const S140Header = ({ lang }: S140HeaderType) => {
  const { t } = useAppTranslation();
  const stylesSmart = applyRTL(styles, lang);
  const rtl = isRTL(lang);

  return (
    <View style={stylesSmart.header} fixed>
      <View style={stylesSmart.headerTitleContainer}>
        <IconLogo />
        <View>
          <Text style={stylesSmart.headerTittle}>
            {rtl && '\u200f'}
            {t('tr_midweekMeetingPrint', { lng: lang })}
          </Text>
          <Text style={stylesSmart.headerCongregation}>
            {rtl && '\u200f'}
            {`Elda Centro`}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default S140Header;
