/**
 * Verifica el motor de cifrado jwpub (src/services/jwpub/crypto.ts) contra un
 * Document.Content REAL extraído de pt14_S.jwpub:
 *  1. descifra a HTML legible,
 *  2. re-cifra byte-idéntico al blob original (prueba de que reproducimos el
 *     formato exacto que espera JW Library),
 *  3. ciclo propio sin pérdida.
 *
 * Uso: node scratch/test_jwpub_crypto.mjs
 * (transpila el .ts al vuelo con esbuild — mismo enfoque que run_node_test.mjs)
 */
import { readFileSync } from 'fs';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname;

// bundlear el módulo TS (pako se resuelve de node_modules)
const out = await build({
  entryPoints: [root + 'src/services/jwpub/crypto.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'node',
});
const mod = await import(
  'data:text/javascript;base64,' +
    Buffer.from(out.outputFiles[0].text).toString('base64')
);
const { encryptContent, decryptContent, buildPubCard } = mod;

const identity = JSON.parse(
  readFileSync(root + 'scratch/jwpub_fixtures/identity.json', 'utf8')
);
const original = new Uint8Array(
  Buffer.from(
    readFileSync(root + 'scratch/jwpub_fixtures/content.b64', 'utf8'),
    'base64'
  )
);

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
};

check('pubCard = idioma_símbolo_año', buildPubCard(identity) === '1_pt14_2023');

const html = await decryptContent(original, identity);
check('descifra HTML legible (empieza con <)', html.trimStart().startsWith('<'));
console.log('   HTML:', html.slice(0, 90).replace(/\n/g, ' '));

const re = await encryptContent(html, identity);
check(
  're-cifrado byte-idéntico al original',
  re.length === original.length && re.every((b, i) => b === original[i])
);

const back = await decryptContent(re, identity);
check('ciclo propio sin pérdida', back === html);

// identidad distinta NO debe descifrar bien
let wrongFailed = false;
try {
  await decryptContent(original, { ...identity, year: 2099 });
} catch {
  wrongFailed = true;
}
check('identidad equivocada no descifra', wrongFailed);

console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
