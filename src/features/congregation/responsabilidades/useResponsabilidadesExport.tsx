import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { responsabilidadesState } from '@states/responsabilidades';
import { congNameState, fullnameOptionState } from '@states/settings';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { TemplateResponsabilidades } from '@views/index';

const useResponsabilidadesExport = () => {
  const data = useAtomValue(responsabilidadesState);
  const congName = useAtomValue(congNameState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [isProcessing, setIsProcessing] = useState(false);

  const resolveName = (uid: string): string => {
    const person = persons.find((p) => p.person_uid === uid);
    if (!person) return uid; // fallback: show raw value (legacy name or unknown uid)

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  };

  const handleExportPDF = async () => {
    if (!data || isProcessing) return;

    try {
      setIsProcessing(true);

      const blob = await pdf(
        <TemplateResponsabilidades
          data={data}
          congregation={congName}
          resolveName={resolveName}
        />
      ).toBlob();

      saveAs(blob, `Responsabilidades_${congName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error?.message || 'error_app_generic-desc'),
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleExportPDF, isProcessing };
};

export default useResponsabilidadesExport;
