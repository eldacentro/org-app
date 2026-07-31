import { Document } from '@views/components';
import { PdfEmpty, Sheet } from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { TemplateUpcomingEventsProps } from './index.types';
import UpcomingEventsList from './UpcomingEventsList';

/**
 * Próximos eventos.
 *
 * Va sobre el sistema de diseño de los PDF (`PDF_DESIGN_SYSTEM.md`).
 */
const TemplateUpcomingEvents = ({
  events,
  congregation,
  lang,
}: TemplateUpcomingEventsProps) => {
  const { t } = useAppTranslation();
  const title = t('tr_upcomingEvents');

  return (
    <Document title={title} lang={lang}>
      <Sheet congregation={congregation} title={title} paginated>
        {events.length === 0 ? (
          <PdfEmpty>No hay ningún evento próximo.</PdfEmpty>
        ) : (
          <UpcomingEventsList events={events} />
        )}
      </Sheet>
    </Document>
  );
};

export default TemplateUpcomingEvents;
