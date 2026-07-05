import { cloneElement, Fragment } from 'react';
import { Box, IconButton } from '@mui/material';
import { IconEdit, IconLocation } from '@components/icons';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';
import { UpcomingEventProps } from './index.types';
import useUpcomingEvent from './useUpcomingEvent';
import Divider from '@components/divider';
import EditUpcomingEvent from '../edit_upcoming_event';
import AddToCalendar from '../add_to_calendar';
import Typography from '@components/typography';
import UpcomingEventDate from '../upcoming_event_date';
import CircuitVisitWeekAgenda from '@features/circuit_visit/shared/CircuitVisitWeekAgenda';
import { ASSEMBLY_CATEGORIES } from '../decorations_for_event';

const UpcomingEvent = (props: UpcomingEventProps) => {
  const { t } = useAppTranslation();

  const { isAdmin, isElder } = useCurrentUser();
  const canManageEvents = isAdmin || isElder;
  const { desktopUp, tabletUp } = useBreakpoints();

  const {
    eventDecoration,
    isEdit,
    handleTurnEditMode,
    handleOnSaveEvent,
    dayIndicatorMaxWidth,
    dayIndicatorRefs,
    showEditIcon,
    handleMouseEnter,
    handleMouseLeave,
    eventFormatted,
    previousDay,
  } = useUpcomingEvent(props);

  if (isEdit) {
    return (
      <EditUpcomingEvent
        data={props.data}
        type={'edit'}
        onSave={handleOnSaveEvent}
        onCancel={handleTurnEditMode}
      />
    );
  }

  const isAssemblyCategory = ASSEMBLY_CATEGORIES.includes(
    props.data.event_data.category
  );

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: tabletUp ? '24px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',

        ...(desktopUp && {
          '.upc-edit-btn': {
            visibility: 'hidden',
          },
          '.upc-add-to-calendar-btn': {
            visibility: 'hidden',
          },
          '&:hover': {
            '.upc-edit-btn': {
              visibility: 'visible',
            },
            '.upc-add-to-calendar-btn': {
              visibility: 'visible',
            },
          },
        }),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isAssemblyCategory && props.data.event_data.coverPhotoUrl && (
        <Box
          component="img"
          src={props.data.event_data.coverPhotoUrl}
          alt=""
          sx={{
            width: '100%',
            // En móvil ocupa todo el ancho de la tarjeta (ya angosta) —
            // en desktop se ve mejor más pequeña y pegada a la izquierda,
            // en vez de un banner enorme centrado.
            maxWidth: desktopUp ? '420px' : '720px',
            margin: 0,
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            objectPosition: 'center',
            // Para que la curva de la portada se vea "combinada" con la de
            // la tarjeta (concéntrica) en vez de descuadrada, el radio no
            // puede ser el mismo que el de la tarjeta — tiene que ser el
            // radio de la tarjeta (26px, var(--r-lg)) menos el padding que
            // la separa del borde real (16px en móvil, 24px en desktop).
            borderRadius: tabletUp ? '2px' : '10px',
          }}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          gap: '4px',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: '8px',
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            {cloneElement(eventDecoration.icon, { color: 'var(--black)' })}

            <Typography className="h3" color="var(--black)">
              {props.data.event_data.category !== UpcomingEventCategory.Custom
                ? t(eventDecoration.translationKey)
                : props.data.event_data.custom}
              {props.data.event_data.category ===
                UpcomingEventCategory.AssemblyWeek &&
                props.data.event_data.assemblyRepresentative &&
                ` (${t(
                  props.data.event_data.assemblyRepresentative === 'branch'
                    ? 'tr_assemblyRepBranch'
                    : 'tr_assemblyRepCO'
                )})`}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: '8px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <AddToCalendar event={props.data} />

            {canManageEvents && (!desktopUp || showEditIcon) && (
              <IconButton sx={{ padding: 0 }} onClick={handleTurnEditMode}>
                <IconEdit color="var(--accent-main)" />
              </IconButton>
            )}
          </Box>
        </Box>

        {props.data.event_data.topic && (
          <Typography
            className="h4"
            color="var(--brand-deep)"
            sx={{ fontStyle: 'italic' }}
          >
            {props.data.event_data.topic}
          </Typography>
        )}

        <Typography className="body-regular" color="var(--grey-400)">
          {props.data.event_data.description}
        </Typography>
      </Box>

      <Divider color="var(--line)" />

      {props.data.event_data.duration === UpcomingEventDuration.SingleDay && (
        <UpcomingEventDate
          title={eventFormatted.time}
          date={eventFormatted.date}
          day={eventFormatted.day}
          disabled={false}
        />
      )}

      {props.data.event_data.category ===
        UpcomingEventCategory.SpecialCampaignWeek && (
        <UpcomingEventDate
          title={t('tr_everyDay')}
          range={eventFormatted.datesRange}
          disabled={eventFormatted.start <= previousDay}
          description={t('tr_days', { daysCount: eventFormatted.dates.length })}
        />
      )}

      {props.data.event_data.duration === UpcomingEventDuration.MultipleDays &&
        props.data.event_data.category ===
          UpcomingEventCategory.CircuitOverseerWeek && (
          <CircuitVisitWeekAgenda event={props.data} previousDay={previousDay} />
        )}

      {props.data.event_data.duration === UpcomingEventDuration.MultipleDays &&
        props.data.event_data.category !==
          UpcomingEventCategory.SpecialCampaignWeek &&
        props.data.event_data.category !==
          UpcomingEventCategory.CircuitOverseerWeek &&
        eventFormatted.dates.map((eventDate, eventDateIndex) => (
          <Fragment key={eventDate.date}>
            <UpcomingEventDate
              date={eventDate.dateFormatted}
              day={eventDate.day}
              title={eventDate.time}
              disabled={eventDate.date <= previousDay}
              description={`${t('tr_day')} ${eventDateIndex + 1}/${eventFormatted.dates.length}`}
              dayIndicatorRef={(element: HTMLDivElement) => {
                dayIndicatorRefs.current[eventDateIndex] = element;
              }}
              dayIndicatorSharedWidth={dayIndicatorMaxWidth}
            />

            {eventDateIndex + 1 !== eventFormatted.dates.length && (
              <Divider color="var(--line)" />
            )}
          </Fragment>
        ))}

      {props.data.event_data.address && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconLocation width={18} height={18} color="var(--grey-400)" />
          <Typography className="body-small-regular" color="var(--grey-400)">
            {props.data.event_data.address}
          </Typography>
        </Box>
      )}

      {((isAssemblyCategory && props.data.event_data.jwLibraryUrl) ||
        props.data.event_data.mapsUrl) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {isAssemblyCategory && props.data.event_data.jwLibraryUrl && (
            <Box
              component="a"
              href={props.data.event_data.jwLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                px: '8px',
                py: '4px',
                borderRadius: 'var(--r-sm)',
                textDecoration: 'none',
                border: '1px solid var(--line)',
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
              }}
            >
              <Typography
                component="span"
                className="body-small-semibold"
                color="var(--grey-400)"
              >
                JW Library ↗
              </Typography>
            </Box>
          )}

          {props.data.event_data.mapsUrl && (
            <Box
              component="a"
              href={props.data.event_data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                px: '8px',
                py: '4px',
                borderRadius: 'var(--r-sm)',
                textDecoration: 'none',
                border: '1px solid var(--line)',
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
              }}
            >
              <Typography
                component="span"
                className="body-small-semibold"
                color="var(--grey-400)"
              >
                Google Maps ↗
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UpcomingEvent;

