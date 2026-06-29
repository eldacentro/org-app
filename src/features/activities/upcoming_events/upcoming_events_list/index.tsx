import { Box, Typography } from '@mui/material';
import { useAtomValue } from 'jotai';
import { IconInfo } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { UpcomingEventsListProps } from './index.types';
import useUpcomingEventsList from './useUpcomingEventsList';
import InfoTip from '@components/info_tip';
import UpcomingEvent from '../upcoming_event';
import { navBarHiddenState } from '@states/app';

const UpcomingEventsList = (props: UpcomingEventsListProps) => {
  const { t } = useAppTranslation();

  const { eventsSortedByYear } = useUpcomingEventsList(props);

  const navBarHidden = useAtomValue(navBarHiddenState);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!props.isAdding && eventsSortedByYear.length === 0 && (
        <InfoTip
          isBig={false}
          icon={<IconInfo />}
          color="white"
          text={t('tr_upcomingEventsEmpty')}
        />
      )}

      {eventsSortedByYear.length > 0 &&
        eventsSortedByYear.map((upcomingEventsYear) => {
          const firstStart = upcomingEventsYear[0]?.event_data.start;

          if (!firstStart) return null;

          const year = new Date(firstStart).getFullYear();

          return (
            <Box
              key={year}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >

              <Box
                sx={{
                  position: 'sticky',
                  // Solo esta propiedad se anima — antes también se animaba
                  // paddingTop a la vez, y las dos transiciones compitiendo
                  // sobre un elemento sticky producían el salto/tirón al
                  // esconderse la barra de navegación.
                  top: navBarHidden
                    ? 'env(safe-area-inset-top, 0px)'
                    : `calc(50px + env(safe-area-inset-top, 0px))`,
                  transition: 'top 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
                  zIndex: 2,
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  pointerEvents: 'none', // el wrapper no bloquea clicks de la lista
                }}
              >
                <Box
                  className="upcoming-year-pill"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '999px',
                    padding: '6px 18px',
                    pointerEvents: 'auto',
                  }}
                >
                  <Typography
                    className="h4"
                    color="var(--accent-400)"
                    sx={{ fontWeight: 700, letterSpacing: '0.2px' }}
                  >
                    {year}
                  </Typography>
                </Box>
              </Box>

              {upcomingEventsYear.map((upcomingEvent) => (
                <UpcomingEvent
                  data={upcomingEvent}
                  key={upcomingEvent.event_uid}
                />
              ))}
            </Box>
          );
        })}
    </Box>
  );
};

export default UpcomingEventsList;
