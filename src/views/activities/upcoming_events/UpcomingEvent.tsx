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
  size,
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

/** «Ago», «Sep» — el mes en el bloque de fecha. */
const mesCorto = (d: Date) =>
  Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

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

  const inicio = new Date(event.start);
  const ultima = event.dates?.at(-1)?.date;
  const fin = ultima ? new Date(ultima) : inicio;

  // Un rango dentro del mismo mes se dice con los dos días; si cruza de mes,
  // solo el primero, y el rango completo ya va en la línea de abajo.
  const numeral =
    varios &&
    !Number.isNaN(fin.getTime()) &&
    fin.getMonth() === inicio.getMonth()
      ? `${inicio.getDate()}–${fin.getDate()}`
      : `${inicio.getDate()}`;

  return (
    <View wrap={false}>
      {!first ? <PdfHairline style={{ marginVertical: space.md }} /> : null}

      <View style={{ display: 'flex', flexDirection: 'row', gap: space.lg }}>
        {/* Bloque de fecha: los días arriba y el mes debajo. Un evento de
            varios días lleva el rango —«7–9»—, no su duración: lo que se
            busca en un calendario es cuándo cae, no cuánto dura. */}
        <View style={{ width: 44 }}>
          <Text style={text.calendarNumeral}>{numeral}</Text>
          <Text style={text.label}>{mesCorto(inicio)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <PdfCategory color={colorDe(event.category)}>{etiqueta}</PdfCategory>
          {/*
           * El titular es el TEMA cuando lo hay: «Adoración pura» dice más que
           * «Asamblea regional», que ya está dicho arriba en la categoría. Sin
           * tema, la descripción; y sin ninguna de las dos, el tipo de evento.
           */}
          <Text style={{ ...text.heading, marginTop: 2 }}>
            {event.topic || event.description || etiqueta}
          </Text>
          <Text
            style={{
              fontSize: size.meta,
              color: color.secondary,
              marginTop: 1,
            }}
          >
            {[
              event.datesRange || event.date,
              // Un evento de varios días no tiene UNA hora: cada jornada lleva
              // la suya, y poner la del primer día induce a error.
              varios ? '' : event.time,
              event.address,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default UpcomingEvent;
