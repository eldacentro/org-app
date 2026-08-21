import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  midweekMeetingChairmanNotesSharedState,
  settingsState,
  userDataViewState,
} from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useChairmanNotes = () => {
  const settings = useAtomValue(settingsState);
  const dataView = useAtomValue(userDataViewState);
  const initialValue = useAtomValue(midweekMeetingChairmanNotesSharedState);

  const [shared, setShared] = useState(false);

  const handleToggle = async () => {
    const midweekSettings = structuredClone(
      settings.cong_settings.midweek_meeting
    );

    const current = midweekSettings.find((record) => record.type === dataView);

    // El ajuste es nuevo: un registro guardado antes de que existiera no lo
    // trae, y escribir sobre `undefined` reventaría.
    current.chairman_notes_shared = {
      value: !shared,
      updatedAt: new Date().toISOString(),
    };

    await dbAppSettingsUpdate({
      'cong_settings.midweek_meeting': midweekSettings,
    });
  };

  useEffect(() => {
    setShared(initialValue);
  }, [initialValue]);

  return { shared, handleToggle };
};

export default useChairmanNotes;
