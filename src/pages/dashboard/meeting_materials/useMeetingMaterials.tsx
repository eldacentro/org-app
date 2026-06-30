import { ChangeEvent, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { IconError } from '@components/icons';
import { useAppTranslation, useInternetChecker } from '@hooks/index';
import {
  setEpubFile,
  setIsImportEPUB,
  setIsImportJWOrg,
} from '@services/states/sources';
import { displaySnackNotification } from '@services/states/app';
import { JWLangState } from '@states/settings';

const useMeetingMaterials = () => {
  const { t } = useAppTranslation();

  const { isNavigatorOnline } = useInternetChecker();

  const sourceLang = useAtomValue(JWLangState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenJWImport = () => setIsImportJWOrg(true);

  const handleOpenEPUBFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again triggers onChange.
    event.target.value = '';

    if (!file) return;

    const isJwpub = file.name.toLowerCase().endsWith('.jwpub');
    const epubLang = file.name.split('_')[1]?.split('.')[0];
    const langOk = isJwpub || (!!epubLang && epubLang === sourceLang.toUpperCase());

    if (langOk) {
      setEpubFile(file);
      setIsImportEPUB(true);
    } else {
      displaySnackNotification({
        header: t('tr_EPUBImportFailed'),
        message: t('tr_EPUBImportFailedDesc'),
        severity: 'error',
        icon: <IconError color="var(--always-white)" />,
      });
    }
  };

  return { handleOpenJWImport, isNavigatorOnline, handleOpenEPUBFile, fileInputRef, handleFileSelected };
};

export default useMeetingMaterials;
