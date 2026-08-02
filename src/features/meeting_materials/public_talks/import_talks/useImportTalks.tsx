import { ChangeEvent, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { publicTalksLocaleState } from '@states/public_talks';
import { parseJwpubFile } from '@services/app/jwpub_import';
import {
  buildJwpubOverrideEntries,
  computeJwpubReport,
  JwpubReportType,
} from '@services/app/jwpub_report';
import {
  dbPublicTalkOverrideGet,
  dbPublicTalkOverrideSave,
} from '@services/dexie/public_talk';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { IconError } from '@components/icons';
import { PendingJwpubImportType } from './index.types';

const useImportTalks = () => {
  const talksList = useAtomValue(publicTalksLocaleState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [report, setReport] = useState<JwpubReportType | null>(null);
  const [pendingImport, setPendingImport] =
    useState<PendingJwpubImportType | null>(null);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Para que volver a elegir el MISMO archivo dispare onChange otra vez.
    event.target.value = '';

    if (!file) return;

    try {
      setIsParsing(true);

      const parsed = await parseJwpubFile(file);

      const informe = computeJwpubReport(
        parsed.entries,
        talksList.map((talk) => ({
          number: talk.talk_number,
          title: talk.talk_title,
        }))
      );

      // El diálogo se abre SIEMPRE, también cuando no ha cambiado nada.
      //
      // Antes, un archivo sin diferencias solo levantaba un aviso al pie que
      // ni siquiera se cerraba solo, y quien reimporta el mismo archivo —que
      // es el caso más frecuente— se quedaba sin saber si había pasado algo.
      // Reimportar no es un accidente: es cómo uno comprueba que está al día,
      // y merece la misma respuesta que una importación con cambios.
      setPendingImport({
        langCode: parsed.langCode,
        publicationTitle: parsed.publicationTitle,
      });
      setReport(informe);
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
    setReport(null);
    setPendingImport(null);
  };

  const handleConfirm = async () => {
    if (!pendingImport || !report) return;

    // Sin cambios no hay nada que guardar: el botón solo cierra.
    if (!report.hasChanges) {
      handleCancel();
      return;
    }

    try {
      setIsSaving(true);

      const existing = await dbPublicTalkOverrideGet();
      const overrides = structuredClone(existing?.overrides ?? {});

      if (!overrides[pendingImport.langCode]) {
        overrides[pendingImport.langCode] = {};
      }

      // Se FUSIONA sobre lo que ya había, no se sustituye: lo que el archivo
      // no menciona sigue donde estaba.
      Object.assign(
        overrides[pendingImport.langCode],
        buildJwpubOverrideEntries(report)
      );

      await dbPublicTalkOverrideSave(overrides);

      displaySnackNotification({
        header: 'Importación completada',
        message: `Se actualizaron ${report.changes.length} ${
          report.changes.length === 1 ? 'bosquejo' : 'bosquejos'
        }.`,
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
      setReport(null);
      setPendingImport(null);
    }
  };

  return {
    fileInputRef,
    handleOpenFilePicker,
    handleFileSelected,
    isParsing,
    isSaving,
    report,
    pendingImport,
    handleCancel,
    handleConfirm,
  };
};

export default useImportTalks;
