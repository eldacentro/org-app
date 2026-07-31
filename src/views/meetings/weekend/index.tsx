import { Page, View } from '@react-pdf/renderer';
import {
  Document,
  PdfFooter,
  PdfHeader,
  fechaCorta,
} from '@views/components';
import { useAppTranslation } from '@hooks/index';
import { WeekendMeetingTemplateType } from './index.types';
import registerFonts from '@views/registerFonts';
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

  const footerDate = fechaCorta(lastUpdate?.updatedAt);

  // El rango que cubre la hoja, para la barra de marca.
  const rango =
    data.length > 0
      ? `${data.at(0).date_formatted} – ${data.at(-1).date_formatted}`
      : '';

  return (
    <Document title={t('tr_weekendMeetingPrint', { lng: lang })} lang={lang}>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          <PdfHeader
            congregation={cong_name || 'Elda Centro'}
            meta={rango}
            title={t('tr_weekendMeetingPrint', { lng: lang })}
          />
          {data.map((meetingData) => (
            <WeekData
              key={meetingData.weekOf}
              meetingData={meetingData}
              lang={lang}
            />
          ))}
        </View>

        <PdfFooter
          congregation={cong_name || 'Elda Centro'}
          meta={footerDate ? `Última actualización · ${footerDate}` : ''}
        />
      </Page>
    </Document>
  );
};

export default WeekendMeetingTemplate;
