import { View } from '@react-pdf/renderer';
import { Document, Page, PdfFooter, PdfHeader } from '@views/components';
import { useAppTranslation } from '@hooks/index';
import { TemplateUpcomingEventsProps } from './index.types';
import UpcomingEventsList from './UpcomingEventsList';
import styles from './index.styles';

const TemplateUpcomingEvents = ({
  events,
  congregation,
  lang,
}: TemplateUpcomingEventsProps) => {
  const { t } = useAppTranslation();
  const title = t('tr_upcomingEvents');

  return (
    <Document title={title} lang={lang}>
      <Page>
        <View style={styles.contentWrapper}>
          <PdfHeader
            congregation={congregation || 'Elda Centro'}
            title={title}
          />

          <UpcomingEventsList events={events} />
        </View>

        <PdfFooter
          congregation={congregation || 'Elda Centro'}
          paginado
        />
      </Page>
    </Document>
  );
};

export default TemplateUpcomingEvents;
