import { useState } from 'react';
import { generateJwpub, JwpubChapter } from '@services/jwpub';
import { displaySnackNotification } from '@services/states/app';

export type ChapterDraft = JwpubChapter & { id: string };

const emptyChapter = (): ChapterDraft => ({
  id: crypto.randomUUID(),
  title: '',
  markdown: '',
});

const useJwpubStudio = () => {
  const [title, setTitle] = useState('');
  const [symbol, setSymbol] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [chapters, setChapters] = useState<ChapterDraft[]>([emptyChapter()]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addChapter = () =>
    setChapters((prev) => [...prev, emptyChapter()]);

  const removeChapter = (id: string) =>
    setChapters((prev) =>
      prev.length > 1 ? prev.filter((c) => c.id !== id) : prev
    );

  const updateChapter = (id: string, patch: Partial<ChapterDraft>) =>
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );

  // Símbolo: solo minúsculas/números, empezando por letra. Se recomienda un
  // prefijo propio para no chocar con símbolos oficiales de JW.
  const sanitizeSymbol = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);

  const canGenerate =
    title.trim().length > 0 &&
    symbol.trim().length > 0 &&
    chapters.some((c) => c.title.trim() && c.markdown.trim());

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);
    try {
      const usableChapters = chapters
        .filter((c) => c.title.trim() && c.markdown.trim())
        .map((c) => ({ title: c.title.trim(), markdown: c.markdown }));

      const { blob, fileName } = await generateJwpub({
        title: title.trim(),
        symbol: symbol.trim(),
        year,
        languageIndex: 1, // español (MepsLanguageIndex)
        chapters: usableChapters,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      displaySnackNotification({
        header: 'Archivo generado',
        message: `${fileName} listo. Ábrelo con JW Library para importarlo.`,
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'No se pudo generar',
        message:
          (error as Error)?.message || 'Ocurrió un error al crear el archivo.',
        severity: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    title,
    setTitle,
    symbol,
    setSymbol,
    sanitizeSymbol,
    year,
    setYear,
    chapters,
    addChapter,
    removeChapter,
    updateChapter,
    canGenerate,
    isGenerating,
    handleGenerate,
  };
};

export default useJwpubStudio;
