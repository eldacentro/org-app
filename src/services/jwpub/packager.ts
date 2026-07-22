import JSZip from 'jszip';
import { JwpubInput } from './types';

// Empaqueta el .jwpub final: ZIP externo { manifest.json, contents }, donde
// `contents` es a su vez un ZIP con el .db (+ assets en fases futuras).
// Cadena de hashes verificada contra archivos oficiales:
//   manifest.hash             = SHA256(bytes del archivo contents)
//   manifest.publication.hash = SHA1(bytes del .db)

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const sha = async (
  algo: 'SHA-1' | 'SHA-256',
  data: Uint8Array
): Promise<string> => toHex(await crypto.subtle.digest(algo, data as BufferSource));

export const packageJwpub = async (
  input: JwpubInput,
  dbBytes: Uint8Array
): Promise<Blob> => {
  const { symbol, year, languageIndex, title, chapters } = input;
  const dbFileName = `${symbol}_S.db`;

  // 1) contents = ZIP con el .db. DEFLATE para el .db (comprime bien).
  const contentsZip = new JSZip();
  contentsZip.file(dbFileName, dbBytes);
  const contentsBytes = await contentsZip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dbHash = await sha('SHA-1', dbBytes);
  const contentsHash = await sha('SHA-256', contentsBytes);

  // 2) manifest.json — mismos campos que un .jwpub oficial mínimo.
  const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const manifest = {
    name: `${symbol}_S.jwpub`,
    hash: contentsHash,
    timestamp: nowIso,
    version: 1,
    expandedSize: dbBytes.length,
    contentFormat: 'z-a',
    htmlValidated: false,
    mepsPlatformVersion: 2.1,
    mepsBuildNumber: 14074,
    publication: {
      fileName: dbFileName,
      type: 1,
      title,
      shortTitle: title,
      displayTitle: title,
      referenceTitle: title,
      undatedReferenceTitle: title,
      symbol,
      uniqueEnglishSymbol: symbol,
      uniqueSymbol: symbol,
      undatedSymbol: symbol,
      englishSymbol: symbol,
      language: languageIndex,
      hash: dbHash,
      timestamp: nowIso,
      minPlatformVersion: 1,
      schemaVersion: 9,
      year,
      issueId: 0,
      issueNumber: 0,
      variation: '',
      publicationType: 'Book',
      rootSymbol: symbol,
      rootYear: year,
      rootLanguage: languageIndex,
      images: [] as unknown[],
      categories: ['bk'],
      attributes: [] as unknown[],
      issueAttributes: [] as unknown[],
      issueProperties: {
        title: '',
        undatedTitle: '',
        coverTitle: '',
        titleRich: '',
        undatedTitleRich: '',
        coverTitleRich: '',
        symbol: '',
        undatedSymbol: '',
      },
      documentCount: chapters.length,
    },
  };

  // 3) ZIP externo. STORE (sin comprimir) para el manifest, DEFLATE para
  //    contents — igual que los archivos oficiales.
  const outer = new JSZip();
  outer.file('manifest.json', JSON.stringify(manifest));
  outer.file('contents', contentsBytes);

  const outerBytes = await outer.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/octet-stream',
  });

  return outerBytes;
};
