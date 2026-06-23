import { useAtomValue } from 'jotai';
import { territoriesEnabledPublishersState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useTerritoriesEnabled = () => {
  const territoriesEnabledPublishers = useAtomValue(territoriesEnabledPublishersState);

  const handleTerritoriesEnabledPublishersToggle = async (
    _: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    await dbAppSettingsUpdate({
      'cong_settings.territories_enabled_publishers': {
        value: checked,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  return { territoriesEnabledPublishers, handleTerritoriesEnabledPublishersToggle };
};

export default useTerritoriesEnabled;
