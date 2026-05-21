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

  return (
    <Document title={t('tr_weekendMeetingPrint', { lng: lang })} lang={lang}>
      <Page size="A4" style={styles.page}>
        <Header cong_name={cong_name} lang={lang} />
        {data.map((meetingData) => (
          <WeekData
            key={meetingData.weekOf}
            meetingData={meetingData}
            lang={lang}
          />
        ))}

        {lastUpdate?.updatedAt && (
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              left: 30,
              right: 30,
              textAlign: 'center',
            }}
          >
            <Text style={{ fontSize: '8px', color: '#666' }}>
              {lastUpdate.lastModifiedBy
                ? `Última actualización: ${new Date(lastUpdate.updatedAt).toLocaleString()} (${lastUpdate.lastModifiedBy})`
                : `Última actualización: ${new Date(lastUpdate.updatedAt).toLocaleString()}`}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default WeekendMeetingTemplate;
