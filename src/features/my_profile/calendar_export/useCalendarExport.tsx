import { useCalendarExportPreference } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import useAppTranslation from '@hooks/useAppTranslation';

/**
 * Account-settings "Añadir al calendario" toggle. Pure client-side
 * preference (no permission dance or backend token, unlike push) — it just
 * gates whether the calendar-export button shows in Mis asignaciones.
 */
const useCalendarExport = () => {
  const { t } = useAppTranslation();
  const { enabled, setEnabled } = useCalendarExportPreference();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);

    displaySnackNotification({
      header: t('tr_calendarExportPreference'),
      message: t('tr_calendarExportPreferenceDesc'),
      severity: 'success',
    });
  };

  return { enabled, handleToggle };
};

export default useCalendarExport;
