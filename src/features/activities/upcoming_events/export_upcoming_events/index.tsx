import { IconPrint } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import IconLoading from '@components/icon_loading';
import useExportUpcomingEvents from './useExportUpcomingEvents';
import NavBarButton from '@components/nav_bar_button';
import { useAtomValue } from 'jotai';
import { pdfExportEnabledState } from '@states/settings';

const ExportUpcomingEvents = () => {
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const { t } = useAppTranslation();
  const { isProcessing, handleExport } = useExportUpcomingEvents();

  if (!pdfExportEnabled) {
    return null;
  }

  return (
    <NavBarButton
      text={t('tr_export')}
      icon={
        isProcessing ? (
          <IconLoading color="var(--accent-main)" />
        ) : (
          <IconPrint color="var(--accent-main)" />
        )
      }
      onClick={handleExport}
    ></NavBarButton>
  );
};

export default ExportUpcomingEvents;
