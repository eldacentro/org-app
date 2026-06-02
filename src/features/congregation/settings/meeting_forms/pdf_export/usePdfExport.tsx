import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { settingsState, pdfExportEnabledState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const usePdfExport = () => {
  const settings = useAtomValue(settingsState);
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);

  const [pdfExport, setPdfExport] = useState(pdfExportEnabled);

  const handlePdfExportToggle = async () => {
    const pdfExportObj = structuredClone(settings.cong_settings.pdf_export_enabled || { value: false, updatedAt: '' });

    pdfExportObj.value = !pdfExport;
    pdfExportObj.updatedAt = new Date().toISOString();

    await dbAppSettingsUpdate({
      'cong_settings.pdf_export_enabled': pdfExportObj,
    });
  };

  useEffect(() => {
    setPdfExport(pdfExportEnabled);
  }, [pdfExportEnabled]);

  return { pdfExport, handlePdfExportToggle };
};

export default usePdfExport;
