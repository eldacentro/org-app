import { useRef, useEffect } from 'react';
import { useStore } from 'jotai';
import { schedulesState } from '@states/schedules';
import { dbSchedUpdate } from '@services/dexie/schedules';
import { formatDate, removeSecondsFromTime, generateDateFromTime } from '@utils/date';
import { CongregationResponseType, CountryResponseType } from '@definition/api';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { ScheduleItemType } from './index.types';

type UseScheduleItemMutationsProps = ScheduleItemType & {
  setCountry: React.Dispatch<React.SetStateAction<CountryResponseType>>;
  setCongName: React.Dispatch<React.SetStateAction<string>>;
  setCongAddress: React.Dispatch<React.SetStateAction<string>>;
  setMeetingDay: React.Dispatch<React.SetStateAction<string | number>>;
  setMeetingTime: React.Dispatch<React.SetStateAction<Date>>;
  congName: string;
  congAddress: string;
};

export const useScheduleItemMutations = ({ 
  schedule, 
  week, 
  setCountry, 
  setCongName, 
  setCongAddress, 
  setMeetingDay, 
  setMeetingTime,
  congName,
  congAddress
}: UseScheduleItemMutationsProps) => {
  const store = useStore();
  const nameTimer = useRef<NodeJS.Timeout>(undefined);
  const addressTimer = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    return () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
      if (addressTimer.current) clearTimeout(addressTimer.current);
    };
  }, []);

  const getWeekSchedule = () => {
    const normWeek = week?.replace(/\//g, '-');
    return store.get(schedulesState).find((record) => record.weekOf.replace(/\//g, '-') === normWeek);
  };

  const handleCountryChange = async (value: CountryResponseType) => {
    setCountry(value);

    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, country: value?.countryCode || '' } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleCongNameChange = (value: string) => {
    setCongName(value);
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => handleCongNameSaveDb(value), 1000);
  };

  const handleCongNameSave = () => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    handleCongNameSaveDb(congName);
  };

  const handleCongNameSaveDb = async (currentName: string) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, name: currentName } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleCongAddressChange = (value: string) => {
    setCongAddress(value);
    if (addressTimer.current) clearTimeout(addressTimer.current);
    addressTimer.current = setTimeout(() => handleCongAddressSaveDb(value), 1000);
  };

  const handleCongAddressSave = () => {
    if (addressTimer.current) clearTimeout(addressTimer.current);
    handleCongAddressSaveDb(congAddress);
  };

  const handleCongAddressSaveDb = async (currentAddress: string) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, address: currentAddress } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleMeetingDayChange = async (value: number) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, weekday: value } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleMeetingTimeChange = async (value: Date) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, time: formatDate(value, 'HH:mm') } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleSelectCongregation = async (value: CongregationResponseType) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { 
              ...talk.congregation, 
              address: value?.address || '',
              name: value?.congName || '',
              weekday: value?.weekendMeetingTime.weekday || undefined,
              time: value ? removeSecondsFromTime(value.weekendMeetingTime.time) : '',
            } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleCongSearchOverride = async (value: string) => {
    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { ...talk.congregation, name: value } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  const handleSelectFromCatalog = async (cong: SpeakersCongregationsType | null) => {
    if (!cong) return;

    const name = cong.cong_data.cong_name.value;
    const address = cong.cong_data.cong_location.address.value;
    const weekday = cong.cong_data.weekend_meeting.weekday.value;
    const time = cong.cong_data.weekend_meeting.time.value;

    setCongName(name);
    setCongAddress(address);
    setMeetingDay(weekday);
    setMeetingTime(time ? generateDateFromTime(time) : null);

    const currentWeekSchedule = getWeekSchedule();
    if (!currentWeekSchedule) return;

    const outgoingTalks = currentWeekSchedule.weekend_meeting.outgoing_talks;
    const targetSchedule = outgoingTalks.find((record) => record.id === schedule.id);
    if (!targetSchedule) return;

    const updatedTalks = outgoingTalks.map(talk => 
      talk.id === schedule.id 
        ? { 
            ...talk, 
            updatedAt: new Date().toISOString(), 
            congregation: { 
              ...talk.congregation, 
              name: name,
              address: address,
              weekday: weekday,
              time: time ?? '',
              number: cong.cong_data.cong_number.value ?? ''
            } 
          }
        : talk
    );

    await dbSchedUpdate(week, {
      'weekend_meeting.outgoing_talks': updatedTalks,
    });
  };

  return {
    handleCountryChange,
    handleCongNameChange,
    handleCongNameSave,
    handleCongAddressChange,
    handleCongAddressSave,
    handleMeetingDayChange,
    handleMeetingTimeChange,
    handleSelectCongregation,
    handleCongSearchOverride,
    handleSelectFromCatalog,
  };
};
