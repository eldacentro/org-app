import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import {
  backupIntervalState,
  themeFollowOSEnabledState,
  pdfExportEnabledPersonalState,
  midweekExportPersonalState,
} from '@states/settings';
import { useBreakpoints, useCurrentUser } from '@hooks/index';

const useAppSettings = () => {
  const { laptopUp } = useBreakpoints();

  // Quién ve el interruptor de exportación a PDF: solo quien tenga algún
  // documento que exportar. Ver `canExportAnySchedule` en useCurrentUser.
  const { canExportAnySchedule, isElder } = useCurrentUser();

  const autoBackupInterval = useAtomValue(backupIntervalState);
  const followOSTheme = useAtomValue(themeFollowOSEnabledState);
  const pdfExportPersonal = useAtomValue(pdfExportEnabledPersonalState);
  const midweekExportPersonal = useAtomValue(midweekExportPersonalState);

  const [autoSyncInterval, setAutoSyncInterval] = useState(autoBackupInterval);
  const [syncTheme, setSyncTheme] = useState(followOSTheme);
  const [pdfExportPersonalEnabled, setPdfExportPersonalEnabled] =
    useState(pdfExportPersonal);
  const [midweekExportEnabled, setMidweekExportEnabled] =
    useState(midweekExportPersonal);

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
  // que no afecta a nadie más de la congregación. Lo ve todo el mundo: cada
  // uno decide si quiere los botones de exportar en las páginas a las que ya
  // llega, sin pedirle permiso a nadie.
  const handleSwitchPdfExportPersonal = async (value: boolean) => {
    setPdfExportPersonalEnabled(value);

    await dbAppSettingsUpdate({
      'user_settings.pdf_export_enabled_personal': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Igual que el de arriba: solo user_settings, y solo para esta cuenta. Quien
  // lo enciende se asoma el botón de exportar el programa en «Programas
  // semanales» sin que a nadie más le cambie nada.
  const handleSwitchMidweekExport = async (value: boolean) => {
    setMidweekExportEnabled(value);

    await dbAppSettingsUpdate({
      'user_settings.midweek_export_enabled_personal': {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    setSyncTheme(followOSTheme);
  }, [followOSTheme]);

  useEffect(() => {
    setMidweekExportEnabled(midweekExportPersonal);
  }, [midweekExportPersonal]);

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
    pdfExportPersonalEnabled,
    handleSwitchPdfExportPersonal,
    canExportAnySchedule,
    midweekExportEnabled,
    handleSwitchMidweekExport,
    isElder,
  };
};

export default useAppSettings;
