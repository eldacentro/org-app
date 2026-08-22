import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  settingsState,
  userDataViewState,
  weekendMeetingPublicTalkRepeatMonthsState,
} from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useRepeatNotice = () => {
  const settings = useAtomValue(settingsState);
  const dataView = useAtomValue(userDataViewState);
  const initialValue = useAtomValue(weekendMeetingPublicTalkRepeatMonthsState);

  const [meses, setMeses] = useState(12);

  const handleChange = async (value: number) => {
    const weekendSettings = structuredClone(
      settings.cong_settings.weekend_meeting
    );

    const current = weekendSettings.find((record) => record.type === dataView);

    // El ajuste es nuevo: un registro guardado antes de que existiera no lo
    // trae, y escribir sobre `undefined` reventaría.
    current.public_talk_repeat_notice_months = {
      value,
      updatedAt: new Date().toISOString(),
    };

    await dbAppSettingsUpdate({
      'cong_settings.weekend_meeting': weekendSettings,
    });
  };

  useEffect(() => {
    setMeses(initialValue);
  }, [initialValue]);

  return { meses, handleChange };
};

export default useRepeatNotice;
