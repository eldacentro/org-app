import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import {
  backupIntervalState,
  congRoleState,
  themeFollowOSEnabledState,
  pdfExportEnabledPersonalState,
} from '@states/settings';
import { useBreakpoints, useCurrentUser } from '@hooks/index';
import { PDF_EXPORT_SCOPED_ROLES } from '@constants/index';

const useAppSettings = () => {
  const { laptopUp } = useBreakpoints();
  const { isElder, isAdmin } = useCurrentUser();
  const userRole = useAtomValue(congRoleState);

  const autoBackupInterval = useAtomValue(backupIntervalState);
  const followOSTheme = useAtomValue(themeFollowOSEnabledState);
  const pdfExportPersonal = useAtomValue(pdfExportEnabledPersonalState);

  const [autoSyncInterval, setAutoSyncInterval] = useState(autoBackupInterval);
  const [syncTheme, setSyncTheme] = useState(followOSTheme);
  const [pdfExportPersonalEnabled, setPdfExportPersonalEnabled] =
    useState(pdfExportPersonal);

  // El interruptor lo ve quien puede exportar algo: los ancianos —que ven
  // todos los programas— y también quien tiene un rol dueño de UN documento,
  // como el que lleva Departamentos. A este último el interruptor solo le abre
  // el suyo, no el resto (ver `pdfExportPorRol` en `states/settings`).
  const showPdfExportPersonal =
    isElder ||
    isAdmin ||
    PDF_EXPORT_SCOPED_ROLES.some((role) => userRole.includes(role));

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
    setAutoSyncInterval(autoBackupInterval);
  }, [autoBackupInterval]);

  useEffect(() => {
    setPdfExportPersonalEnabled(pdfExportPersonal);
  }, [pdfExportPersonal]);

  return {
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
