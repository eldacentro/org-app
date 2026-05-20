import { Document, Page, Text, View } from '@react-pdf/renderer';
import { TemplateOutgoingSpeakersProps } from './index.types';
import useAppTranslation from '@hooks/useAppTranslation';
import { IconLogo } from '@views/components/icons';
import OSScheduleContainer from './OSScheduleContainer';
import styles from './index.styles';

const TemplateOutgoingSpeakersSchedule = ({
  congregation,
  lang,
  data,
}: TemplateOutgoingSpeakersProps) => {
  const { t } = useAppTranslation();

  return (
    <Document title={t('tr_outgoingSpeakersSchedule')} lang={lang}>
      <Page size="A4" style={styles.body}>
        <View style={styles.headerContainer}>
          <View style={styles.logoTitleContainer}>
            <IconLogo />
            <View>
              <Text style={styles.title}>
                {t('tr_outgoingSpeakersSchedule')}
              </Text>
              <Text style={styles.subtitle}>{congregation}</Text>
            </View>
          </View>
        </View>

        <OSScheduleContainer data={data} />
      </Page>
    </Document>
  );
};

export default TemplateOutgoingSpeakersSchedule;
