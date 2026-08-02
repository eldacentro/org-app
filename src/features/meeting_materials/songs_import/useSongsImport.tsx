import { ChangeEvent, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { songsLocaleState } from '@states/songs';
import { JWLangState } from '@states/settings';
import { parseJwpubFile } from '@services/app/jwpub_import';
import {
  buildJwpubOverrideEntries,
  computeJwpubReport,
  JwpubReportType,
} from '@services/app/jwpub_report';
import { dbSongOverrideGet, dbSongOverrideSave } from '@services/dexie/songs';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { IconError } from '@components/icons';
import { PendingSongsImportType } from './index.types';

/**
 * Cuántos cánticos hacen falta para creerse que un archivo es un cancionero.
 *
 * El lector saca números de cualquier publicación numerada por capítulos, así
 * que sin esto un libro de estudio cualquiera entraría como cancionero. No es
 * la única defensa —el diálogo enseña el nombre de la publicación antes de
 * confirmar, que es la de verdad— pero corta lo evidente.
 */
const MINIMO_CANTICOS = 20;

const useSongsImport = () => {
  const songsList = useAtomValue(songsLocaleState);
  const jwLang = useAtomValue(JWLangState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [report, setReport] = useState<JwpubReportType | null>(null);
  const [pendingImport, setPendingImport] =
    useState<PendingSongsImportType | null>(null);

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

      if (parsed.entries.length < MINIMO_CANTICOS) {
        throw new Error('error_app_jwpub_not-songbook');
      }

      const informe = computeJwpubReport(
        parsed.entries,
        songsList.map((song) => ({
          number: song.song_number,
          title: song.song_title,
        }))
      );

      // Un archivo en otro idioma compara contra la lista equivocada: todo
      // saldría «cambiado» y se guardaría bajo el idioma del archivo, no bajo
      // el que se está mirando. Se avisa antes de confirmar, no después.
      const avisoIdioma =
        parsed.langCode !== jwLang
          ? `Este archivo está en el idioma «${parsed.langCode}» y ahora mismo se está usando «${jwLang}». Lo que se importe se guardará en el idioma del archivo, y la comparación de aquí abajo está hecha contra el idioma en uso.`
          : undefined;

      const avisoPublicacion = /^sjj/i.test(parsed.symbol)
        ? undefined
        : `Este archivo no parece un cancionero (su símbolo es «${parsed.symbol || 'sin símbolo'}»). Comprueba el nombre de la publicación antes de continuar.`;

      setPendingImport({
        langCode: parsed.langCode,
        publicationTitle: parsed.publicationTitle,
        symbol: parsed.symbol,
        total: parsed.entries.length,
        aviso: avisoIdioma ?? avisoPublicacion,
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

    if (!report.hasChanges) {
      handleCancel();
      return;
    }

    try {
      setIsSaving(true);

      const existing = await dbSongOverrideGet();
      const overrides = structuredClone(existing?.overrides ?? {});

      if (!overrides[pendingImport.langCode]) {
        overrides[pendingImport.langCode] = {};
      }

      // Se FUSIONA sobre lo que ya había, no se sustituye: un archivo que no
      // menciona un número no tiene por qué opinar sobre él. Es la misma
      // regla de siempre — importar sustituye lo que viene, no vacía lo que
      // falta.
      Object.assign(
        overrides[pendingImport.langCode],
        buildJwpubOverrideEntries(report)
      );

      await dbSongOverrideSave({
        overrides,
        publicationTitle: pendingImport.publicationTitle,
        symbol: pendingImport.symbol,
        total: pendingImport.total,
      });

      displaySnackNotification({
        header: 'Cancionero importado',
        message: `Se actualizaron ${report.changes.length} ${
          report.changes.length === 1 ? 'cántico' : 'cánticos'
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

export default useSongsImport;
