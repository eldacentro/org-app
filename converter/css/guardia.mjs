/**
 * IMPIDE QUE REGENERAR EL CSS SE LLEVE COSAS POR DELANTE.
 *
 * `generate:css` reescribe `src/global/global.css` desde las exportaciones de
 * Figma de `converter/css/sources/`. Todo lo que se haya ajustado A MANO en el
 * CSS y no exista en esas fuentes desaparece en la primera regeneración, sin
 * aviso y sin que falle nada.
 *
 * Ha pasado tres veces con consecuencias reales:
 *
 *   3 jul  Una auditoría de Territorios regeneró el CSS y borró el tema Rojo
 *          entero, añadido a mano el día anterior. Quien lo tuviera elegido se
 *          quedaba sin ninguna variable de color: la aplicación se desarmaba.
 *   2 ago  Lo mismo, y además el azul de la congregación volvió al de Figma.
 *          Se descubrió porque Carlos entró desde el móvil con sesión nueva y
 *          vio un azul que no era el suyo.
 *   2 ago  Y de la misma pasada se llevó la definición de tres CLASES DE
 *          TEXTO —`label-small-semibold`, `body-regular-semibold` y
 *          `body-small-medium`—, que se habían añadido a mano en julio. 97
 *          textos de la app pasaron a salir con el tamaño por defecto de MUI
 *          mientras el código pedía otra cosa. La guardia de entonces solo
 *          miraba colores y no dijo nada.
 *
 * Por eso ahora hay DOS comprobaciones:
 *
 *   1. COLORES (diff).  Compara el CSS de antes con el de después y aborta si
 *      desaparece alguna variable o algún tema.
 *
 *   2. CLASES DE TEXTO (invariante).  Comprueba que cada clase de la escala
 *      —la lista vive en `src/definition/app.ts`, no se copia aquí— tenga
 *      alguna regla que la alcance TANTO en un móvil COMO en un escritorio.
 *
 *      Es una invariante y no un diff a propósito. El fallo de agosto no fue
 *      "la clase desapareció del fichero": fue que se quedó existiendo SOLO
 *      dentro de la media query del escalón de tablet. Un grep la encontraba
 *      y un diff de nombres la habría dado por buena; en un móvil no pintaba
 *      nada. Lo que hay que comprobar es si la regla LLEGA, no si el texto
 *      está escrito en alguna parte.
 *
 *      Ojo: casi ninguna clase tiene una regla "base". `h3` y compañía se
 *      definen en dos media queries complementarias (`max-width: 768px` y
 *      `min-width: 768px`) que entre las dos cubren todo, y eso está bien. Por
 *      eso se evalúan las condiciones contra dos dispositivos concretos en vez
 *      de exigir una regla sin envolver.
 *
 *   node converter/css/guardia.mjs antes    → guarda una copia
 *   node converter/css/guardia.mjs despues  → las dos comprobaciones
 *   node converter/css/guardia.mjs clases   → solo la 2ª, sin necesidad de
 *                                             haber regenerado nada
 */
import { readFile, writeFile } from 'node:fs/promises';

const CSS = 'src/global/global.css';
const SEMANTICO = 'src/global/index.css';
const TIPOS = 'src/definition/app.ts';
const COPIA = 'converter/css/.antes.css';

/* ── 1. Colores ────────────────────────────────────────────────────────── */

const variables = (css) =>
  new Set(css.match(/--[a-z0-9-]+-base(?=\s*:)/g) ?? []);
const temas = (css) => new Set(css.match(/\[data-theme='[a-z-]+'\]/g) ?? []);

/* ── 2. Clases de texto ────────────────────────────────────────────────── */

/**
 * Los dos dispositivos contra los que se evalúan las media queries. No son
 * "un ancho cualquiera": son un móvil y un portátil, con su puntero. El
 * escalón de tablet pide `any-pointer: coarse`, así que un portátil no entra
 * en él — que es justo lo que hizo invisible el fallo de agosto.
 */
const DISPOSITIVOS = [
  { nombre: 'móvil', width: 390, height: 844, 'any-pointer': 'coarse' },
  { nombre: 'escritorio', width: 1280, height: 800, 'any-pointer': 'fine' },
];

/** Quita comentarios `/* … *​/` sin tocar nada más. */
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Recorre el CSS contando llaves y devuelve, por cada regla, su selector y la
 * condición de la media query que la envuelve (o `null` si no hay ninguna).
 *
 * Es un recorrido a mano y no una expresión regular porque hay que saber
 * DÓNDE está cada regla, y eso una regular no lo sabe: es justo la diferencia
 * entre "la clase aparece en el fichero" y "la clase se aplica".
 */
const reglas = (css) => {
  const salida = [];
  const pila = [];
  let i = 0;
  let inicio = 0;

  while (i < css.length) {
    const c = css[i];

    if (c === '{') {
      const cabecera = css.slice(inicio, i).trim();
      if (cabecera.startsWith('@')) {
        pila.push(cabecera);
      } else {
        const media = pila.filter((a) => a.startsWith('@media')).join(' and ');
        const otras = pila.some((a) => !a.startsWith('@media'));
        salida.push({ selector: cabecera, media: media || null, otras });
        // Saltar el cuerpo de la regla de golpe: dentro no hay selectores.
        let nivel = 1;
        i++;
        while (i < css.length && nivel > 0) {
          if (css[i] === '{') nivel++;
          else if (css[i] === '}') nivel--;
          i++;
        }
        inicio = i;
        continue;
      }
      inicio = i + 1;
    } else if (c === '}') {
      pila.pop();
      inicio = i + 1;
    }
    i++;
  }

  return salida;
};

/**
 * ¿Se aplica esta condición en ese dispositivo?
 *
 * Lo que no se sabe leer cuenta como NO. Prefiero un aviso de más —que se
 * mira en un minuto— a dejar pasar otra clase muda durante tres semanas.
 */
const seAplica = (media, dispositivo) => {
  if (!media) return true;

  const condiciones = media
    .replace(/@media/g, '')
    .split(/\s+and\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return condiciones.every((cond) => {
    let m = cond.match(/^\(\s*(min|max)-(width|height)\s*:\s*(\d+)px\s*\)$/);
    if (m) {
      const [, limite, eje, valor] = m;
      const real = dispositivo[eje];
      return limite === 'min' ? real >= +valor : real <= +valor;
    }

    m = cond.match(/^\(\s*(any-pointer|pointer)\s*:\s*(\w+)\s*\)$/);
    if (m) return dispositivo['any-pointer'] === m[2];

    return false;
  });
};

const compruebaClases = async () => {
  const tipos = await readFile(TIPOS, 'utf8');
  const bloque = tipos.match(/export type CustomClassName =([\s\S]*?);/);
  if (!bloque) {
    console.error(
      `\n  ✗ No se encuentra el tipo CustomClassName en ${TIPOS}.\n` +
        '    La guardia lee de ahí la lista de clases para no tener una copia\n' +
        '    propia que se quede vieja. Si el tipo se ha movido, actualiza la\n' +
        '    ruta en converter/css/guardia.mjs.\n'
    );
    return false;
  }

  const clases = [...bloque[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);

  const css =
    sinComentarios(await readFile(CSS, 'utf8')) +
    '\n' +
    sinComentarios(await readFile(SEMANTICO, 'utf8'));

  const todas = reglas(css);

  const mudas = [];

  for (const clase of clases) {
    // Solo la regla que define LA clase, no las que la matizan dentro de otra
    // (`.programas-semanales .h3`): esas no la definen para todo el mundo.
    const suyas = todas.filter(
      (r) =>
        !r.otras && r.selector.split(',').some((s) => s.trim() === `.${clase}`)
    );

    const sinCubrir = DISPOSITIVOS.filter(
      (d) => !suyas.some((r) => seAplica(r.media, d))
    ).map((d) => d.nombre);

    if (sinCubrir.length)
      mudas.push({ clase, sinCubrir, reglas: suyas.length });
  }

  if (mudas.length) {
    console.error('\n  ✗ Clases de texto que NO pintan nada:\n');
    for (const { clase, sinCubrir, reglas: n } of mudas) {
      console.error(
        `    .${clase} — sin definición en ${sinCubrir.join(' y ')}` +
          (n ? ` (tiene ${n} regla(s), pero ninguna llega)` : ' (no existe)')
      );
    }
    console.error(
      '\n  Un texto con esa clase sale a 16px peso 400, el defecto de MUI,\n' +
        '  mientras el código dice otra cosa. Sin error y sin aviso.\n' +
        '\n' +
        `  Defínelas en ${SEMANTICO} (que NO se regenera), y ANTES del escalón\n` +
        '  de tablet: una media query no suma especificidad, así que entre dos\n' +
        '  reglas de la misma clase decide el orden del fichero.\n'
    );
    return false;
  }

  console.log(
    `  ✓ Las ${clases.length} clases de texto pintan en móvil y en escritorio`
  );
  return true;
};

/* ── Puesta en marcha ──────────────────────────────────────────────────── */

const modo = process.argv[2];

if (modo === 'antes') {
  await writeFile(COPIA, await readFile(CSS, 'utf8'));
  process.exit(0);
}

if (modo === 'clases') {
  process.exit((await compruebaClases()) ? 0 : 1);
}

const antes = await readFile(COPIA, 'utf8');
const despues = await readFile(CSS, 'utf8');

const varsPerdidas = [...variables(antes)].filter(
  (v) => !variables(despues).has(v)
);
const temasPerdidos = [...temas(antes)].filter((t) => !temas(despues).has(t));

if (varsPerdidas.length || temasPerdidos.length) {
  console.error('\n  ✗ Regenerar el CSS habría BORRADO colores:\n');
  if (temasPerdidos.length)
    console.error('    temas:', temasPerdidos.join(', '));
  if (varsPerdidas.length)
    console.error('    variables:', varsPerdidas.join(', '));
  console.error(
    '\n  Están en global.css pero NO en converter/css/sources/. Añádelos ahí\n' +
      '  antes de regenerar, o se pierden. Se ha restaurado el CSS anterior.\n'
  );
  await writeFile(CSS, antes);
  process.exit(1);
}

console.log('  ✓ Ningún color perdido al regenerar');

if (!(await compruebaClases())) {
  console.error('  Se ha restaurado el CSS anterior.\n');
  await writeFile(CSS, antes);
  process.exit(1);
}
