/**
 * Verifica el pipeline COMPLETO de generación de .jwpub en el navegador:
 * genera un archivo desde Markdown, lo re-abre con nuestro propio motor y
 * comprueba que (1) la cadena de hashes es autoconsistente, (2) el Content
 * se descifra al HTML esperado, (3) los offsets de párrafo extraen el texto
 * correcto, (4) el índice de navegación apunta a los documentos.
 *
 * Uso: node scratch/test_jwpub_generate.mjs
 */
import { build } from 'esbuild';
import { unzipSync } from 'fflate';
import initSqlJs from 'sql.js';
import { createHash, createDecipheriv } from 'crypto';
import { inflateSync } from 'zlib';
import { writeFileSync } from 'fs';
import { createRequire } from 'module';

const root = new URL('..', import.meta.url).pathname;

// bundlear el orquestador como CJS (jszip/sql.js usan require) a un temp.
await build({
  entryPoints: [root + 'src/services/jwpub/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: '/tmp/jwpub_bundle.cjs',
  plugins: [
    {
      name: 'stub-wasm-url',
      setup(b) {
        b.onResolve({ filter: /sql-wasm\.wasm\?url$/ }, () => ({
          path: 'wasmurl',
          namespace: 'stub',
        }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: `module.exports = ${JSON.stringify(
            root + 'node_modules/sql.js/dist/sql-wasm.wasm'
          )}`,
        }));
      },
    },
  ],
});
const require = createRequire(import.meta.url);
const { generateJwpub } = require('/tmp/jwpub_bundle.cjs');

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
};

const input = {
  title: 'Mi guía de estudio',
  symbol: 'xmp01',
  year: 2026,
  languageIndex: 1,
  chapters: [
    {
      title: 'Introducción',
      markdown:
        'Bienvenido a esta **guía personalizada**.\n\nEste es el segundo párrafo con *énfasis* y una lista:\n\n- Punto uno\n- Punto dos',
    },
    {
      title: 'Capítulo dos',
      markdown: 'Contenido del segundo capítulo.\n\n## Un subtítulo\n\nMás texto aquí.',
    },
  ],
};

const { blob, fileName } = await generateJwpub(input);
check('nombre de archivo', fileName === 'xmp01_S.jwpub');

const bytes = new Uint8Array(await blob.arrayBuffer());
const outer = unzipSync(bytes);
check('tiene manifest.json y contents', !!outer['manifest.json'] && !!outer['contents']);

const manifest = JSON.parse(new TextDecoder().decode(outer['manifest.json']));
const contents = outer['contents'];

// (1) cadena de hashes
const contentsHash = createHash('sha256').update(Buffer.from(contents)).digest('hex');
check('manifest.hash = SHA256(contents)', manifest.hash === contentsHash);

const inner = unzipSync(contents);
const dbName = manifest.publication.fileName;
check('db se llama xmp01_S.db', dbName === 'xmp01_S.db');
const dbBytes = inner[dbName];
const dbHash = createHash('sha1').update(Buffer.from(dbBytes)).digest('hex');
check('publication.hash = SHA1(db)', manifest.publication.hash === dbHash);
check('language/symbol/year en manifest', manifest.publication.language === 1 && manifest.publication.symbol === 'xmp01' && manifest.publication.year === 2026);

// (2) descifrado del Content
const SQL = await initSqlJs();
const db = new SQL.Database(dbBytes);

const docCount = db.exec('SELECT COUNT(*) FROM Document')[0].values[0][0];
check('2 documentos', docCount === 2);

const MASTER = Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7', 'hex');
const km = Buffer.alloc(32);
const h = createHash('sha256').update('1_xmp01_2026', 'utf8').digest();
for (let i = 0; i < 32; i++) km[i] = h[i] ^ MASTER[i];
const decryptDoc = (blob) => {
  const d = createDecipheriv('aes-128-cbc', km.subarray(0, 16), km.subarray(16, 32));
  return inflateSync(Buffer.concat([d.update(Buffer.from(blob)), d.final()])).toString('utf8');
};

const doc0 = db.exec('SELECT Content, ContentLength FROM Document WHERE DocumentId=0')[0].values[0];
const html0 = decryptDoc(doc0[0]);
check('Content descifra a HTML', html0.includes('<h1') && html0.includes('guía personalizada'));
check('ContentLength = bytes UTF-8 del HTML', doc0[1] === Buffer.byteLength(html0, 'utf8'));
check('título como h1 pid 1', /<h1 id="p1" data-pid="1">Introducción<\/h1>/.test(html0));
check('lista renderizada', html0.includes('<li>Punto uno</li>'));

// (3) offsets de párrafo extraen texto correcto
const paras = db.exec('SELECT ParagraphIndex, BeginPosition, EndPosition FROM DocumentParagraph WHERE DocumentId=0 ORDER BY ParagraphIndex')[0].values;
const buf0 = Buffer.from(html0, 'utf8');
const p1 = buf0.subarray(paras[0][1], paras[0][2]).toString('utf8');
check('offset p1 rodea el <h1>', p1.startsWith('<h1') && p1.trimEnd().endsWith('</h1>'));

// (4) índice de navegación
const items = db.exec('SELECT PublicationViewItemId, Title, DefaultDocumentId FROM PublicationViewItem ORDER BY PublicationViewItemId')[0].values;
// estructura oficial: ítem raíz (doc -1) + un hijo por capítulo
check('3 ítems de índice (raíz + 2 capítulos)', items.length === 3);
check('raíz sin documento (-1)', items[0][2] === -1);
check('hijo 1 → doc 0', items[1][2] === 0 && items[1][1] === 'Introducción');
check('hijo 2 → doc 1', items[2][2] === 1);
const childDocs = db.exec('SELECT PublicationViewItemId, DocumentId FROM PublicationViewItemDocument ORDER BY PublicationViewItemDocumentId')[0].values;
check('ViewItemDocument solo para hijos', childDocs.length === 2 && childDocs[0][0] === 2 && childDocs[0][1] === 0 && childDocs[1][0] === 3 && childDocs[1][1] === 1);
const tableCount = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table'")[0].values[0][0];
const indexCount = db.exec("SELECT count(*) FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")[0].values[0][0];
check('52 tablas como un oficial schemaVersion 9', tableCount === 52);
check('22 índices como un oficial', indexCount === 22);
const docRow = db.exec('SELECT Class, SectionNumber, HasMediaLinks, HasLinks, FirstPageNumber, LastPageNumber, HasPronunciationGuide FROM Document LIMIT 1')[0].values[0];
check('Document sin NULLs (convención oficial)', String(docRow[0]) === '13' && docRow[1] === 0 && docRow[2] === 0 && docRow[3] === 0 && docRow[4] === 1 && docRow[5] === 1 && docRow[6] === 0);

const vid = db.exec("SELECT DataType FROM PublicationViewSchema")[0].values[0][0];
check('PublicationViewSchema name', vid === 'name');

db.close();

console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
