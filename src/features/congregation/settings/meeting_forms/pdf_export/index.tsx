import { useAppTranslation, useCurrentUser } from '@hooks/index';
import usePdfExport from './usePdfExport';
import SwitchWithLabel from '@components/switch_with_label';

const PdfExport = () => {
  const { t } = useAppTranslation();

  const { isMidweekEditor, isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();

  const { pdfExport, handlePdfExportToggle } = usePdfExport();

  return (
    <SwitchWithLabel
      label={t('tr_pdfExportEnabled')}
      helper={t('tr_pdfExportEnabledDesc')}
      checked={pdfExport}
      onChange={handlePdfExportToggle}
      readOnly={!isMidweekEditor && !isWeekendEditor && !isPublicTalkCoordinator}
    />
  );
};

export default PdfExport;
