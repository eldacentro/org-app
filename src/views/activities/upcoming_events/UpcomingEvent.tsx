import { View, Text } from '@react-pdf/renderer';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';
import {
  PdfCategory,
  PdfHairline,
  category,
  color,
  space,
  text,
} from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { decorationsForEvent } from './decoration_for_event';
import { UpcomingEventProps } from './index.types';

/**
 * El color de categoría de cada tipo de evento. Los que no encajan en ninguna
 * de las cuatro familias del sistema se quedan con el de visita, que es el
 * neutro de la paleta categórica.
 */
const colorDe = (cat: UpcomingEventCategory) => {
  switch (cat) {
    case UpcomingEventCategory.AssemblyWeek:
    case UpcomingEventCategory.ConventionWeek:
    case UpcomingEventCategory.InternationalConventionWeek:
      return category.assembly;
    case UpcomingEventCategory.SpecialCampaignWeek:
    case UpcomingEventCategory.PioneerWeek:
      return category.campaign;
    case UpcomingEventCategory.MemorialWeek:
      return category.memorial;
    default:
      return category.visit;
  }
};

/**
 * Una fila de evento: bloque de fecha a la izquierda, categoría y título a la
 * derecha.
 */
const UpcomingEvent = ({
  event,
  first,
}: UpcomingEventProps & { first?: boolean }) => {
  const { t } = useAppTranslation();

  const etiqueta =
    event.category !== UpcomingEventCategory.Custom
      ? t(decorationsForEvent[event.category].translationKey)
      : event.custom;

  const varios =
    event.duration === UpcomingEventDuration.MultipleDays && event.datesRange;

  return (
    <View wrap={false}>
      {!first ? <PdfHairline style={{ marginVertical: space.md }} /> : null}

      <View style={{ display: 'flex', flexDirection: 'row', gap: space.lg }}>
        {/* Bloque de fecha */}
        <View style={{ width: 44 }}>
          <Text style={text.calendarNumeral}>
            {varios ? event.dates.length : new Date(event.start).getDate()}
          </Text>
          <Text style={text.label}>
            {varios
              ? 'días'
              : new Date(event.start)
                  .toLocaleDateString('es-ES', { month: 'short' })
                  .replace('.', '')}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <PdfCategory color={colorDe(event.category)}>{etiqueta}</PdfCategory>
          <Text style={{ ...text.heading, marginTop: 2 }}>
            {event.description || etiqueta}
          </Text>
          <Text style={{ fontSize: 8.5, color: color.secondary, marginTop: 1 }}>
            {[event.datesRange || event.date, event.time]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default UpcomingEvent;
