import { buildDatabase } from './dbBuilder';
import { packageJwpub } from './packager';
import { JwpubInput } from './types';

export type { JwpubInput, JwpubChapter } from './types';
export { decryptContent, encryptContent, buildPubCard } from './crypto';

/**
 * Genera un archivo .jwpub completo a partir de la entrada del usuario.
 * Devuelve { blob, fileName } listo para descargar. Todo ocurre en el
 * navegador; nada se sincroniza ni sale del dispositivo.
 */
export const generateJwpub = async (
  input: JwpubInput
): Promise<{ blob: Blob; fileName: string }> => {
  if (!input.symbol.trim()) {
    throw new Error('El símbolo de la publicación es obligatorio.');
  }
  if (input.chapters.length === 0) {
    throw new Error('Añade al menos un capítulo.');
  }

  const dbBytes = await buildDatabase(input);
  const blob = await packageJwpub(input, dbBytes);

  return { blob, fileName: `${input.symbol}_S.jwpub` };
};
