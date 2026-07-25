/**
 * Runner para ejecutar scripts de verificación que importan módulos de la
 * app fuera de Vite. Bundlea con esbuild (resolviendo los alias de
 * vite.config.ts) y stubea los módulos que solo funcionan en navegador
 * (sql.js/wasm con sufijo ?url de Vite).
 *
 * Uso: node scratch/run_node_test.mjs <script.ts>
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const entry = process.argv[2];
if (!entry) {
  console.error('Uso: node scratch/run_node_test.mjs <script.ts>');
  process.exit(1);
}

const alias = Object.fromEntries(
  [
    ['@assets', 'src/assets'],
    ['@components', 'src/components'],
    ['@icons', 'src/components/icons'],
    ['@constants', 'src/constants'],
    ['@features', 'src/features'],
    ['@hooks', 'src/hooks'],
    ['@layouts', 'src/layouts'],
    ['@pages', 'src/pages'],
    ['@routes', 'src/routes'],
    ['@services', 'src/services'],
    ['@states', 'src/states'],
    ['@utils', 'src/utils'],
    ['@wrapper', 'src/wrapper'],
    ['@locales', 'src/locales'],
    ['@definition', 'src/definition'],
    ['@db', 'src/indexedDb'],
    ['@views', 'src/views'],
  ].map(([k, v]) => [k, resolve(root, v)])
);

const outfile = resolve(root, 'scratch/.test_build.mjs');

await build({
  entryPoints: [resolve(root, entry)],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile,
  alias,
  logLevel: 'silent',
  banner: {
    js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
// Shims mínimos de navegador para módulos que los tocan al importarse
const __mem = new Map();
globalThis.localStorage ??= {
  getItem: (k) => (__mem.has(k) ? __mem.get(k) : null),
  setItem: (k, v) => __mem.set(k, String(v)),
  removeItem: (k) => __mem.delete(k),
  clear: () => __mem.clear(),
  key: (i) => [...__mem.keys()][i] ?? null,
  get length() { return __mem.size; },
};
globalThis.window ??= globalThis;
globalThis.location ??= { hostname: 'localhost', origin: 'http://localhost', href: 'http://localhost/', pathname: '/', search: '' };`,
  },
  plugins: [
    {
      name: 'browser-stubs',
      setup(b) {
        // sql.js + su wasm (?url de Vite) solo se usan para importar .jwpub;
        // irrelevantes para los tests de lógica.
        b.onResolve({ filter: /mwb_docid_extractor|jwpub_import/ }, (args) => {
          if (args.importer.includes('scratch')) return null;
          return { path: 'stub-docids', namespace: 'stub' };
        });
        b.onResolve({ filter: /\?url$/ }, () => ({
          path: 'stub-url',
          namespace: 'stub',
        }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
          if (args.path === 'stub-docids') {
            return {
              contents: `export const extractMwbDocids = async () => [];
export const parseJwpubFile = async () => null;
export const computeJwpubDiff = async () => null;`,
              loader: 'js',
            };
          }
          return { contents: 'export default "";', loader: 'js' };
        });
      },
    },
  ],
});

const result = spawnSync('node', [outfile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
