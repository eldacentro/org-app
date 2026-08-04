import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  midweekMeetingLCSpecialPartsAssignedState,
  settingsState,
  userDataViewState,
} from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useSpecialParts = () => {
  const settings = useAtomValue(settingsState);
  const dataView = useAtomValue(userDataViewState);
  const initialValue = useAtomValue(midweekMeetingLCSpecialPartsAssignedState);

  const [assigned, setAssigned] = useState(false);

  const handleToggle = async () => {
    const midweekSettings = structuredClone(
      settings.cong_settings.midweek_meeting
    );

    const current = midweekSettings.find((record) => record.type === dataView);

    // El ajuste es nuevo: un registro guardado antes de que existiera no lo
    // trae, y escribir sobre `undefined` reventaría.
    current.lc_special_parts_assigned = {
      value: !assigned,
      updatedAt: new Date().toISOString(),
    };

    await dbAppSettingsUpdate({
      'cong_settings.midweek_meeting': midweekSettings,
    });
  };

  useEffect(() => {
    setAssigned(initialValue);
  }, [initialValue]);

  return { assigned, handleToggle };
};

export default useSpecialParts;
