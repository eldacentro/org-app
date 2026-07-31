import { Document } from '@views/components';
import { PdfCard, PdfEmpty, Sheet, periodo, space } from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { TemplateUpcomingEventsProps } from './index.types';
import UpcomingEvent from './UpcomingEvent';

/**
 * Documento 11 · Próximos eventos. Una tarjeta por año, una fila por evento.
 */
const TemplateUpcomingEvents = ({
  events,
  congregation,
  lang,
}: TemplateUpcomingEventsProps) => {
  const { t } = useAppTranslation();
  const title = t('tr_upcomingEvents');

  const todos = events.flat();
  const primero = todos.at(0)?.start;
  const ultimo = todos.at(-1)?.start;

  return (
    <Document title={title} lang={lang}>
      <Sheet
        congregation={congregation}
        period={periodo(primero, ultimo)}
        title={title}
        subtitle="Asambleas, visitas y campañas"
        documentName={title}
      >
        {events.length === 0 ? (
          <PdfEmpty>No hay ningún evento próximo.</PdfEmpty>
        ) : (
          events.map((delAño) => (
            <PdfCard
              key={delAño[0].year}
              title={String(delAño[0].year)}
              meta={`${delAño.length} ${delAño.length === 1 ? 'evento' : 'eventos'}`}
              style={{ marginBottom: space.lg }}
            >
              {delAño.map((eventData, i) => (
                <UpcomingEvent
                  key={eventData.uid}
                  event={eventData}
                  first={i === 0}
                />
              ))}
            </PdfCard>
          ))
        )}
      </Sheet>
    </Document>
  );
};

export default TemplateUpcomingEvents;
