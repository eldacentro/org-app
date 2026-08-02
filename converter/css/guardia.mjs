/**
 * IMPIDE QUE REGENERAR EL CSS SE LLEVE COLORES POR DELANTE.
 *
 * `generate:css` reescribe `src/global/global.css` desde las exportaciones de
 * Figma de `converter/css/sources/`. Todo color que se haya ajustado A MANO en
 * el CSS y no exista en esas fuentes desaparece en la primera regeneración,
 * sin aviso y sin que falle nada.
 *
 * Ha pasado dos veces con consecuencias reales:
 *
 *   3 jul  Una auditoría de Territorios regeneró el CSS y borró el tema Rojo
 *          entero, añadido a mano el día anterior. Quien lo tuviera elegido se
 *          quedaba sin ninguna variable de color: la aplicación se desarmaba.
 *   2 ago  Lo mismo, y además el azul de la congregación volvió al de Figma.
 *          Se descubrió porque Carlos entró desde el móvil con sesión nueva y
 *          vio un azul que no era el suyo.
 *
 * Esto compara el CSS de antes y el de después y ABORTA si desaparece alguna
 * variable o algún tema. Antes de regenerar, el CSS se guarda a un lado.
 *
 *   node converter/css/guardia.mjs antes   → guarda una copia
 *   node converter/css/guardia.mjs después → compara y falla si se perdió algo
 */
import { readFile, writeFile } from 'node:fs/promises';

const CSS = 'src/global/global.css';
const COPIA = 'converter/css/.antes.css';

const variables = (css) => new Set(css.match(/--[a-z0-9-]+-base(?=\s*:)/g) ?? []);
const temas = (css) => new Set(css.match(/\[data-theme='[a-z-]+'\]/g) ?? []);

const modo = process.argv[2];

if (modo === 'antes') {
  await writeFile(COPIA, await readFile(CSS, 'utf8'));
  process.exit(0);
}

const antes = await readFile(COPIA, 'utf8');
const despues = await readFile(CSS, 'utf8');

const varsPerdidas = [...variables(antes)].filter((v) => !variables(despues).has(v));
const temasPerdidos = [...temas(antes)].filter((t) => !temas(despues).has(t));

if (varsPerdidas.length || temasPerdidos.length) {
  console.error('\n  ✗ Regenerar el CSS habría BORRADO colores:\n');
  if (temasPerdidos.length) console.error('    temas:', temasPerdidos.join(', '));
  if (varsPerdidas.length) console.error('    variables:', varsPerdidas.join(', '));
  console.error(
    '\n  Están en global.css pero NO en converter/css/sources/. Añádelos ahí\n' +
      '  antes de regenerar, o se pierden. Se ha restaurado el CSS anterior.\n'
  );
  await writeFile(CSS, antes);
  process.exit(1);
}

console.log('  ✓ Ningún color perdido al regenerar');
