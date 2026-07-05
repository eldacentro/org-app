import { Page, View, Text } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { useAppTranslation } from '@hooks/index';
import { WeekendMeetingTemplateType } from './index.types';
import registerFonts from '@views/registerFonts';
import Header from './Header';
import WeekData from './WeekData';
import styles from './index.styles';

registerFonts();

const WeekendMeetingTemplate = ({
  data,
  cong_name,
  lang,
}: WeekendMeetingTemplateType) => {
  const { t } = useAppTranslation();

  const lastUpdate = data.reduce((acc, curr) => {
    if (
      !acc ||
      (curr.updatedAt && new Date(curr.updatedAt) > new Date(acc.updatedAt))
    ) {
      return {
        updatedAt: curr.updatedAt,
        lastModifiedBy: curr.lastModifiedBy,
      };
    }
    return acc;
  }, null);

  const footerDate = lastUpdate?.updatedAt
    ? (() => {
        const d = new Date(lastUpdate.updatedAt);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      })()
    : '';

  return (
    <Document title={t('tr_weekendMeetingPrint', { lng: lang })} lang={lang}>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          <Header cong_name={cong_name} lang={lang} />
          {data.map((meetingData) => (
            <WeekData
              key={meetingData.weekOf}
              meetingData={meetingData}
              lang={lang}
            />
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>Elda - Centro</Text>
          {footerDate ? (
            <Text style={styles.footerRight}>
              Última actualización · {footerDate}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
};

export default WeekendMeetingTemplate;
