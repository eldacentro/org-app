import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import {
  backupAutoState,
  backupIntervalState,
  themeFollowOSEnabledState,
  pdfExportEnabledPersonalState,
} from '@states/settings';
import { useBreakpoints, useCurrentUser } from '@hooks/index';

const useAppSettings = () => {
  const { laptopUp } = useBreakpoints();
  const { isElder, isAdmin } = useCurrentUser();

  const autoBackup = useAtomValue(backupAutoState);
  const autoBackupInterval = useAtomValue(backupIntervalState);
  const followOSTheme = useAtomValue(themeFollowOSEnabledState);
  const pdfExportPersonal = useAtomValue(pdfExportEnabledPersonalState);

  const [autoSync, setAutoSync] = useState(autoBackup);
  const [autoSyncInterval, setAutoSyncInterval] = useState(autoBackupInterval);
  const [syncTheme, setSyncTheme] = useState(followOSTheme);
  const [pdfExportPersonalEnabled, setPdfExportPersonalEnabled] = useState(pdfExportPersonal);

  const showPdfExportPersonal = isElder || isAdmin;

  const handleSwitchAutoBackup = async (value) => {
    setAutoSync(value);

    await dbAppSettingsUpdate({
      'user_settings.backup_automatic.enabled': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleUpdateSyncInterval = async (value: number) => {
    setAutoSyncInterval(value);

    await dbAppSettingsUpdate({
      'user_settings.backup_automatic.interval': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleUpdateSyncTheme = async (value) => {
    setSyncTheme(value);

    await dbAppSettingsUpdate({
      'user_settings.theme_follow_os_enabled': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Solo escribe en user_settings (por-cuenta): no toca cong_settings, así
  // que no afecta a nadie más de la congregación.
  const handleSwitchPdfExportPersonal = async (value: boolean) => {
    setPdfExportPersonalEnabled(value);

    await dbAppSettingsUpdate({
      'user_settings.pdf_export_enabled_personal': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    setSyncTheme(followOSTheme);
  }, [followOSTheme]);

  // Mantener en sincronía si los átomos cambian externamente (ej. data sync push)
  useEffect(() => {
    setAutoSync(autoBackup);
  }, [autoBackup]);

  useEffect(() => {
    setAutoSyncInterval(autoBackupInterval);
  }, [autoBackupInterval]);

  useEffect(() => {
    setPdfExportPersonalEnabled(pdfExportPersonal);
  }, [pdfExportPersonal]);

  return {
    autoSync,
    handleSwitchAutoBackup,
    autoSyncInterval,
    handleUpdateSyncInterval,
    laptopUp,
    syncTheme,
    handleUpdateSyncTheme,
    showPdfExportPersonal,
    pdfExportPersonalEnabled,
    handleSwitchPdfExportPersonal,
  };
};

export default useAppSettings;
