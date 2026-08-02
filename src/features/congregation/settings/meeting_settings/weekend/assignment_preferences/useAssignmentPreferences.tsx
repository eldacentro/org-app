import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  settingsState,
  userDataViewState,
  weekendMeetingOpeningPrayerAutoAssignState,
} from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useAssignmentPreferences = () => {
  const settings = useAtomValue(settingsState);
  const dataView = useAtomValue(userDataViewState);
  const prayerInitial = useAtomValue(
    weekendMeetingOpeningPrayerAutoAssignState
  );

  const [autoAssignOpeningPrayer, setAutoAssignOpeningPrayer] = useState(false);

  const handleAutoOpeningPrayerToggle = async () => {
    const weekendSettings = structuredClone(
      settings.cong_settings.weekend_meeting
    );

    const current = weekendSettings.find((record) => record.type === dataView);

    current.opening_prayer_auto_assigned.value = !autoAssignOpeningPrayer;
    current.opening_prayer_auto_assigned.updatedAt = new Date().toISOString();

    await dbAppSettingsUpdate({
      'cong_settings.weekend_meeting': weekendSettings,
    });
  };

  useEffect(() => {
    setAutoAssignOpeningPrayer(prayerInitial);
  }, [prayerInitial]);

  return {
    autoAssignOpeningPrayer,
    handleAutoOpeningPrayerToggle,
  };
};

export default useAssignmentPreferences;
