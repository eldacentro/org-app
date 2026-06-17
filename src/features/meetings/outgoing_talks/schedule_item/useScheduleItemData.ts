import { useState, useMemo, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { schedulesState } from '@states/schedules';
import { congAccountConnectedState, countriesState } from '@states/app';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';
import { hour24FormatState } from '@states/settings';
import { generateDateFromTime } from '@utils/date';
import { ScheduleItemType } from './index.types';
import { CountryResponseType } from '@definition/api';

export const useScheduleItemData = ({ schedule, week }: ScheduleItemType) => {
  const congConnected = useAtomValue(congAccountConnectedState);
  const countries = useAtomValue(countriesState);
  const speakersCongregations = useAtomValue(speakersCongregationsActiveState);
  const use24hFormat = useAtomValue(hour24FormatState);

  const [country, setCountry] = useState<CountryResponseType>(null);
  const [congName, setCongName] = useState('');
  const [congAddress, setCongAddress] = useState('');
  const [meetingDay, setMeetingDay] = useState<string | number>('');
  const [meetingTime, setMeetingTime] = useState<Date>(null);
  const [isManualInput, setIsManualInput] = useState(false);

  // Aislamiento de Renderizados (O(1) Rendering)
  const outgoingScheduleAtom = useMemo(() => {
    const normWeek = week?.replace(/\//g, '-');
    const weekScheduleAtom = selectAtom(schedulesState, (schedules) =>
      schedules.find((record) => record.weekOf.replace(/\//g, '-') === normWeek)
    );
    return selectAtom(weekScheduleAtom, (weekData) =>
      weekData?.weekend_meeting?.outgoing_talks?.find((t) => t.id === schedule.id)
    );
  }, [week, schedule.id]);

  const outgoingSchedule = useAtomValue(outgoingScheduleAtom);

  useEffect(() => {
    if (outgoingSchedule) {
      // for manual entry
      setCongName(outgoingSchedule.congregation.name || '');
      setCongAddress(outgoingSchedule.congregation.address || '');
      setMeetingDay(outgoingSchedule.congregation.weekday || '');

      setMeetingTime(
        outgoingSchedule.congregation.time.length > 0
          ? generateDateFromTime(outgoingSchedule.congregation.time)
          : null
      );

      // using jw search
      const countryCode = outgoingSchedule.congregation.country;
      const findCountry = countries.find(
        (record) => record.countryCode === countryCode
      );
      setCountry(findCountry ?? null);

      // Determine whether it matches a catalog congregation
      const noCatalog = speakersCongregations.length === 0;
      const existingName = outgoingSchedule.congregation.name || '';
      const inCatalog = !noCatalog && speakersCongregations.some(
        (c) => c.cong_data.cong_name.value === existingName
      );
      setIsManualInput(noCatalog || (existingName.length > 0 && !inCatalog));
    }
  }, [outgoingSchedule, countries, speakersCongregations]);

  return {
    congConnected,
    countries,
    speakersCongregations,
    use24hFormat,
    country,
    setCountry,
    congName,
    setCongName,
    congAddress,
    setCongAddress,
    meetingDay,
    setMeetingDay,
    meetingTime,
    setMeetingTime,
    isManualInput,
    setIsManualInput,
  };
};
