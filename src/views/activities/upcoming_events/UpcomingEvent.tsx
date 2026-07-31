import { View, Text } from '@react-pdf/renderer';
import { cloneElement } from 'react';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';
import { decorationsForEvent } from './decoration_for_event';
import { useAppTranslation } from '@hooks/index';
import { color, radius, space, stroke, text } from '@views/design';
import { UpcomingEventProps } from './index.types';
import UpcomingEventDate from './UpcomingEventDate';

const UpcomingEvent = ({ event }: UpcomingEventProps) => {
  const { t } = useAppTranslation();

  return (
    <View
      wrap={false}
      style={{
        border: `${stroke.thin}px solid ${color.line}`,
        backgroundColor: color.white,
        borderRadius: radius.lg,
        padding: space.lg,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <View style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
            }}
          >
            {cloneElement(decorationsForEvent[event.category].icon, {
              size: 14,
              backgroundColor: 'none',
            })}

            <Text style={text.heading}>
              {event.category !== UpcomingEventCategory.Custom
                ? t(decorationsForEvent[event.category].translationKey)
                : event.custom}
            </Text>
          </View>

          <Text style={{ ...text.body, color: color.muted }}>
            {event.description}
          </Text>
        </View>

        {event.duration === UpcomingEventDuration.SingleDay && (
          <UpcomingEventDate
            date={event.date}
            day={event.day}
            title={event.time}
          />
        )}

        {event.duration === UpcomingEventDuration.MultipleDays &&
          event.category !== UpcomingEventCategory.SpecialCampaignWeek &&
          event.dates.map((eventDate, eventDateIndex) => (
            <UpcomingEventDate
              key={eventDate.date}
              date={eventDate.dateFormatted}
              day={eventDate.day}
              title={eventDate.time}
              description={`${t('tr_day')} ${eventDateIndex + 1}/${event.dates.length}`}
            />
          ))}

        {event.category === UpcomingEventCategory.SpecialCampaignWeek && (
          <UpcomingEventDate
            range={event.datesRange}
            title={t('tr_everyDay')}
            description={t('tr_days', { daysCount: event.dates.length })}
          />
        )}
      </View>
    </View>
  );
};

export default UpcomingEvent;
