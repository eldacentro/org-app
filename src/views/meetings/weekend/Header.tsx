import { useAppTranslation } from '@hooks/index';
import { Text, View } from '@react-pdf/renderer';
import { HeaderType } from './index.types';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';

const Header = ({ lang }: HeaderType) => {
  const { t } = useAppTranslation();

  return (
    <View fixed style={styles.header}>
      <View style={styles.headerTitleContainer}>
        <IconLogo />
        <View>
          <Text style={styles.headerTittle}>
            {t('tr_weekendMeetingPrint', { lng: lang })}
          </Text>
          <Text style={styles.headerCongregation}>{`Elda - Centro`}</Text>
        </View>
      </View>
    </View>
  );
};

export default Header;
