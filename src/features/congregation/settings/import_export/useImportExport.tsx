import { useMemo, useState } from 'react';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { DialogType, ImportExportType } from './index.types';
import Import from './import';
import Export from './export';
import ManualTab from './manual_tab';
import LocalBackupsTab from './local_backups_tab';
import GoogleDriveTab from './google_drive_tab';

const useImportExport = ({ onClose }: ImportExportType) => {
  const { t } = useAppTranslation();
  const { isAdmin } = useCurrentUser();

  const [value, setValue] = useState(0);
  const [state, setState] = useState<DialogType>('import/export');

  const handleOpenImportExport = () => setState('import/export');

  const handleOpenConfirm = () => setState('import/confirm');

  const tabs = useMemo(() => {
    if (isAdmin) {
      return [
        {
          label: 'Manual (JSON)',
          Component: <ManualTab onClose={onClose} onNext={handleOpenConfirm} />,
        },
        {
          label: 'Copias Locales',
          Component: <LocalBackupsTab />,
        },
        {
          label: 'Google Drive',
          Component: <GoogleDriveTab />,
        },
      ];
    }

    return [
      {
        label: t('tr_export'),
        Component: <Export onClose={onClose} />,
      },
      {
        label: t('tr_import'),
        Component: <Import onClose={onClose} onNext={handleOpenConfirm} />,
      },
    ];
  }, [t, onClose, isAdmin]);

  const handleTabChange = (tab: number) => setValue(tab);

  return { tabs, value, handleTabChange, state, handleOpenImportExport };
};

export default useImportExport;
