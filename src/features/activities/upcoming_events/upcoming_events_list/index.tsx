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
        eventsSortedByYear.map((upcomingEventsYear, yearIndex) => {
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
                  top: navBarHidden ? '0px' : `calc(50px + env(safe-area-inset-top, 0px))`,
                  paddingTop: navBarHidden
                    ? `calc(16px + env(safe-area-inset-top, 0px))`
                    : '16px',
                  paddingBottom: '40px',
                  zIndex: 2,
                  background:
                    'linear-gradient(180deg, var(--accent-100) 40%, rgba(248, 249, 255, 0%) 100%)',
                  transition: 'top 0.24s cubic-bezier(0.22, 1, 0.36, 1), padding-top 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
                  pointerEvents: 'none', // So it doesn't block clicks on events underneath the gradient
                  margin: {
                    mobile: '0 -16px',
                    tablet: '0 -24px',
                    desktop: '0 -32px',
                  },
                  paddingLeft: {
                    mobile: '16px',
                    tablet: '24px',
                    desktop: '32px',
                  },
                  paddingRight: {
                    mobile: '16px',
                    tablet: '24px',
                    desktop: '32px',
                  },
                }}
              >
                <Typography className="h4" color="var(--accent-400)">
                  {year}
                </Typography>
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
