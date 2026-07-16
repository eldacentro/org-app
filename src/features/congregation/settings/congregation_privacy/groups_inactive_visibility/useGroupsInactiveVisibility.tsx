import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { settingsState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useGroupsInactiveVisibility = () => {
  const settings = useAtomValue(settingsState);

  const [inactiveVisible, setInactiveVisible] = useState(false);

  const handleToggle = async () => {
    await dbAppSettingsUpdate({
      'cong_settings.groups_inactive_visible_to_elders': {
        value: !inactiveVisible,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    setInactiveVisible(
      settings.cong_settings.groups_inactive_visible_to_elders?.value ?? false
    );
  }, [settings]);

  return { inactiveVisible, handleToggle };
};

export default useGroupsInactiveVisibility;
