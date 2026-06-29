import { useMemo } from 'react';
import { UpcomingEventsListProps } from './index.types';
import { UpcomingEventType } from '@definition/upcoming_events';
import useCurrentUser from '@hooks/useCurrentUser';

const useUpcomingEventsList = ({ data }: UpcomingEventsListProps) => {
  const { isAdmin } = useCurrentUser();

  const eventsSortedByYear = useMemo(() => {
    const yearMap = new Map<number, UpcomingEventType[]>();

    for (const event of data) {
      const dateStr = event.event_data?.start;

      if (!dateStr) continue;

      const year = new Date(dateStr).getFullYear();

      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }

      yearMap.get(year)!.push(event);
    }

    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

    return sortedYears.map((year) => yearMap.get(year)!);
  }, [data]);

  return { eventsSortedByYear, isAdmin };
};

export default useUpcomingEventsList;
