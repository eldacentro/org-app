import { IconPrint } from '@components/icons';
import IconLoading from '@components/icon_loading';
import { useAppTranslation } from '@hooks/index';
import useResponsabilidadesExport from '../useResponsabilidadesExport';
import NavBarButton from '@components/nav_bar_button';

const ExportResponsabilidades = () => {
  const { t } = useAppTranslation();

  const { handleExportPDF, isProcessing } = useResponsabilidadesExport();

  return (
    <NavBarButton
      text={t('tr_export')}
      onClick={handleExportPDF}
      icon={
        isProcessing ? (
          <IconLoading color="var(--accent-main)" />
        ) : (
          <IconPrint color="var(--accent-main)" />
        )
      }
      disabled={isProcessing}
    />
  );
};

export default ExportResponsabilidades;
