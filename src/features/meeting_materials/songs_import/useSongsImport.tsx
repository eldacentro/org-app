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
 * Las dos guardas que impiden importar OTRA publicación como si fuera el
 * cancionero, y por qué las dos son necesarias.
 *
 * El lector saca un número de cualquier publicación numerada por capítulos.
 * Probado con el Libro de los precursores (`pt14`): salen 35 «cánticos»
 * perfectamente formados, con los títulos de sus capítulos. Confirmarlo
 * dejaría los cánticos 1 al 35 con títulos que no son, y no hay deshacer.
 *
 * Por eso la cuenta mínima es alta: un cancionero pasa de 150 cánticos y
 * ninguna publicación de estudio tiene cien capítulos numerados. Y por eso el
 * símbolo se comprueba aparte: los cancioneros lo tienen empezando por «sj»
 * desde hace décadas (sjj, sjjm, sjjls), y fallar cerrado es lo que
 * corresponde aquí — si algún día cambiara la convención, el mensaje dice qué
 * símbolo ha encontrado y es una línea de arreglo.
 */
const MINIMO_CANTICOS = 100;
const SIMBOLO_CANCIONERO = /^sj/i;

/**
 * El cancionero guarda el número DENTRO del título.
 *
 * En `songs.json` un cántico es «1. Las cualidades principales de Jehová», y
 * así se pinta tal cual en el selector de canciones y en los programas: el
 * número no se compone aparte, como sí pasa con los discursos públicos.
 *
 * Pero el `.jwpub` del cancionero trae el número en su propia columna y el
 * título limpio («Las cualidades principales de Jehová»). Guardarlo así
 * dejaría los 163 cánticos SIN número por toda la aplicación, y la vista
 * previa marcaría los 163 como «cambia el título» aunque no cambie ninguno.
 *
 * Se devuelve al formato de la casa antes de comparar, para que la vista
 * previa diga la verdad y lo guardado encaje con lo que ya había.
 */
const conNumeroDelante = (number: number, title: string) =>
  new RegExp(`^${number}\\s*\\.`).test(title) ? title : `${number}. ${title}`;

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

      // Se rechaza aquí y no en el diálogo: enseñar una vista previa de 35
      // capítulos del Libro de los precursores como si fueran cánticos ya es
      // media importación hecha.
      if (
        parsed.entries.length < MINIMO_CANTICOS ||
        !SIMBOLO_CANCIONERO.test(parsed.symbol)
      ) {
        displaySnackNotification({
          header: 'Este archivo no es el cancionero',
          message: `El archivo elegido es «${
            parsed.publicationTitle || 'sin título'
          }» (símbolo «${parsed.symbol || 'sin símbolo'}»), con ${
            parsed.entries.length
          } ${
            parsed.entries.length === 1
              ? 'documento numerado'
              : 'documentos numerados'
          }. Elige el .jwpub del cancionero.`,
          severity: 'error',
          icon: <IconError color="var(--card)" />,
        });

        return;
      }

      const informe = computeJwpubReport(
        parsed.entries.map((entry) => ({
          ...entry,
          title: conNumeroDelante(entry.number, entry.title),
        })),
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

      setPendingImport({
        langCode: parsed.langCode,
        publicationTitle: parsed.publicationTitle,
        symbol: parsed.symbol,
        total: parsed.entries.length,
        aviso: avisoIdioma,
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
        message:
          report.changes.length === 1
            ? 'Se actualizó 1 cántico.'
            : `Se actualizaron ${report.changes.length} cánticos.`,
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
