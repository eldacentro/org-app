import { ChangeEvent, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { publicTalksLocaleState } from '@states/public_talks';
import { computeJwpubDiff, parseJwpubFile } from '@services/app/jwpub_import';
import {
  dbPublicTalkOverrideGet,
  dbPublicTalkOverrideSave,
} from '@services/dexie/public_talk';
import { PublicTalkImportDiffType } from '@definition/public_talks';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { useAppTranslation } from '@hooks/index';
import { IconError } from '@components/icons';
import { PendingJwpubImportType } from './index.types';

const useImportTalks = () => {
  const { t } = useAppTranslation();
  const talksList = useAtomValue(publicTalksLocaleState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [diffs, setDiffs] = useState<PublicTalkImportDiffType[] | null>(null);
  const [pendingImport, setPendingImport] =
    useState<PendingJwpubImportType | null>(null);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    // Para que volver a elegir el MISMO archivo dispare onChange otra vez.
    event.target.value = '';

    if (!file) return;

    try {
      setIsParsing(true);

      const parsed = await parseJwpubFile(file);
      const diff = computeJwpubDiff(parsed.entries, talksList);

      if (diff.length === 0) {
        displaySnackNotification({
          header: t('tr_jwpubImportNoChanges'),
          message: t('tr_jwpubImportNoChangesDesc'),
          severity: 'message-with-button',
        });

        return;
      }

      setPendingImport({ langCode: parsed.langCode });
      setDiffs(diff);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleCancel = () => {
    setDiffs(null);
    setPendingImport(null);
  };

  const handleConfirm = async () => {
    if (!pendingImport || !diffs) return;

    try {
      setIsSaving(true);

      const existing = await dbPublicTalkOverrideGet();
      const overrides = structuredClone(existing?.overrides ?? {});

      if (!overrides[pendingImport.langCode]) {
        overrides[pendingImport.langCode] = {};
      }

      for (const diff of diffs) {
        overrides[pendingImport.langCode][String(diff.talk_number)] =
          diff.new_title;
      }

      await dbPublicTalkOverrideSave(overrides);

      displaySnackNotification({
        header: t('tr_jwpubImportSuccess'),
        message: t('tr_jwpubImportSuccessDesc', { count: diffs.length }),
        severity: 'success',
      });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode('error_app_generic-desc'),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setIsSaving(false);
      setDiffs(null);
      setPendingImport(null);
    }
  };

  return {
    fileInputRef,
    handleOpenFilePicker,
    handleFileSelected,
    isParsing,
    isSaving,
    diffs,
    handleCancel,
    handleConfirm,
  };
};

export default useImportTalks;
