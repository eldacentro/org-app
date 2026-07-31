import { View } from '@react-pdf/renderer';
import { PdfSection, space } from '@views/design';
import { UpcomingEventsListProps } from './index.types';
import UpcomingEvent from './UpcomingEvent';

/**
 * Los eventos, agrupados por año.
 *
 * El año era una pastilla azul centrada; ahora es un rótulo de sección, que es
 * lo que la app usa para "aquí empieza otro tramo".
 */
const UpcomingEventsList = ({ events }: UpcomingEventsListProps) => (
  <View>
    {events.map((delAño) => (
      <PdfSection key={delAño[0].year} title={String(delAño[0].year)}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space.md,
          }}
        >
          {delAño.map((eventData) => (
            <UpcomingEvent key={eventData.uid} event={eventData} />
          ))}
        </View>
      </PdfSection>
    ))}
  </View>
);

export default UpcomingEventsList;
