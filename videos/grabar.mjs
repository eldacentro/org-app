/**
 * GRABA LA INTERFAZ EN MOVIMIENTO, Y APUNTA DÓNDE PASA CADA COSA.
 *
 * Dos salidas por toma:
 *
 *   tomas/<id>/0000.jpg…   los fotogramas de la aplicación funcionando
 *   tomas/<id>/marcas.json qué ocurrió, en qué fotograma y en qué coordenada
 *
 * El segundo archivo es el que permite lo que faltaba: que la cámara se acerque
 * A UN BOTÓN concreto y no al centro de la pantalla, y que el dedo caiga en el
 * sitio exacto. Las coordenadas se leen de la página en el momento de tocar,
 * así que si mañana ese botón se mueve, el vídeo se recoloca solo.
 *
 *   node grabar.mjs
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:4137';
const RAIZ = new URL('./tomas/', import.meta.url).pathname;

const ANCHO = 402;
const ALTO = 874;

/** A 3x hay resolución de sobra para un plano muy cerrado sin que se ablande. */
const ESCALA = 3;

const TOMAS = [
  {
    id: 'informe',
    descripcion: 'Sumar horas y enviar el informe',
    async preparar({ ir }) {
      await ir('Predicación');
      await ir('Informe de predicación');
    },
    async hacer({ tocar, esperar, marcarElemento, desplazarHasta }) {
      await esperar(0.5);

      // Las horas, de una en una. Es EL gesto de la aplicación.
      await marcarElemento('Sumar', 'horas');
      for (let i = 0; i < 4; i++) {
        await tocar('Sumar');
        await esperar(0.42);
      }

      await esperar(0.6);

      // Guardar el día. «Enviar» está deshabilitado hasta que se guarda: es
      // el flujo real de la aplicación, así que el vídeo lo enseña entero.
      await marcarElemento('Guardar', 'guardar');
      await tocar('Guardar');
      await esperar(1.1);

      // Y enviar el mes. «Enviar» tarda en habilitarse tras guardar, así que
      // se le da tiempo y se busca en su sitio: está más abajo de lo que cabe.
      await esperar(0.9);
      await desplazarHasta('Enviar');
      await esperar(0.6);
      await marcarElemento('Enviar', 'enviar');
      await tocar('Enviar');
      await esperar(2.2);
    },
  },
];

const main = async () => {
  const browser = await chromium.launch();
  /**
   * RESOLUCIÓN DE VERDAD.
   *
   * El screencast de Chrome entrega los fotogramas al tamaño del viewport EN
   * PUNTOS e ignora `deviceScaleFactor` —salían a 402x874, y ampliar eso en un
   * plano cerrado es exactamente lo que se veía blando—. `maxWidth` tampoco lo
   * arregla: no sube de ahí.
   *
   * La vuelta: dar un viewport tres veces mayor y devolver la maquetación a
   * tamaño de móvil con `zoom`. La aplicación sigue viendo 402 px de ancho —o
   * sea, sigue siendo la vista de móvil, con sus mismas medias queries— pero
   * se pinta sobre 1206 píxeles reales.
   */
  const context = await browser.newContext({
    viewport: { width: ANCHO * ESCALA, height: ALTO * ESCALA },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();

  await page.addInitScript((escala) => {
    const aplicar = () => {
      if (document.documentElement) {
        document.documentElement.style.zoom = String(escala);
      }
    };
    aplicar();
    document.addEventListener('DOMContentLoaded', aplicar);
  }, ESCALA);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  const comenzar = page.getByText('Comenzar prueba', { exact: false }).first();
  await comenzar.waitFor({ state: 'visible', timeout: 120000 });
  await comenzar.click();
  await page.waitForTimeout(2500);

  const ir = async (texto) => {
    const destino = page.locator('button', { hasText: texto }).first();
    await destino.waitFor({ state: 'visible', timeout: 15000 });
    await destino.click();
    await page.waitForTimeout(1400);
  };

  for (const toma of TOMAS) {
    const dir = `${RAIZ}${toma.id}/`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    await toma.preparar({ ir, page });
    await page.waitForTimeout(700);

    const cdp = await context.newCDPSession(page);
    let n = 0;
    const pendientes = [];
    const marcas = [];

    // El screencast solo emite cuando la página REPINTA, así que los
    // fotogramas no están repartidos en el tiempo: hay ráfagas durante una
    // animación y huecos largos mientras nada se mueve. Sin guardar el sello
    // temporal de cada uno, reproducirlos a ritmo fijo deforma el movimiento
    // —justo lo que se nota—. Con él, el montaje puede remuestrear al ritmo
    // real.
    const tiempos = [];

    cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
      tiempos.push(metadata?.timestamp ?? null);
      pendientes.push(
        writeFile(`${dir}${String(n++).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'))
      );
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });

    /**
     * FORZAR REPINTADOS PARA GRABAR A 60, NO A 8.
     *
     * El screencast solo emite cuando la página repinta. Una aplicación
     * quieta no repinta, así que salían 67 fotogramas en 8 segundos y los
     * planos cerrados se veían a tirones.
     *
     * Esto mete un punto de 1px fuera de la vista que cambia de color en cada
     * fotograma de animación. Obliga a Chrome a repintar 60 veces por segundo
     * —y por tanto a emitir 60 fotogramas— sin que se vea nada en pantalla.
     */
    await page.evaluate(() => {
      const marcapasos = document.createElement('div');
      marcapasos.id = '__marcapasos__';
      marcapasos.style.cssText =
        'position:fixed;left:-4px;top:-4px;width:1px;height:1px;z-index:2147483647;pointer-events:none';
      document.body.appendChild(marcapasos);

      let i = 0;
      const latir = () => {
        marcapasos.style.background = `rgb(${i % 2}, 0, 0)`;
        i++;
        requestAnimationFrame(latir);
      };
      requestAnimationFrame(latir);
    });

    // `maxWidth`/`maxHeight` NO son un recorte: son la resolución a la que
    // Chrome entrega los fotogramas. Sin ellos ignora el factor de escala del
    // contexto y devuelve 402x874 —tamaño en puntos—, así que un plano cerrado
    // ampliaba una imagen diminuta. Con ellos llegan a 3x de verdad.
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      everyNthFrame: 1,
    });

    /** Dónde está un botón AHORA, en tanto por uno del viewport. */
    const donde = async (etiqueta) => {
      const caja = await page
        .locator(`button[aria-label="${etiqueta}"], button:has-text("${etiqueta}")`)
        .first()
        .boundingBox();

      if (!caja) return null;

      return {
        x: (caja.x + caja.width / 2) / (ANCHO * ESCALA),
        y: (caja.y + caja.height / 2) / (ALTO * ESCALA),
        ancho: caja.width / (ANCHO * ESCALA),
        alto: caja.height / (ALTO * ESCALA),
      };
    };

    /** Apunta un elemento para que la cámara sepa a dónde encuadrar. */
    const marcarElemento = async (etiqueta, nombre) => {
      const pos = await donde(etiqueta);
      if (pos) marcas.push({ tipo: 'elemento', nombre, fotograma: n, ...pos });
    };

    /**
     * Toca, y deja constancia de dónde y cuándo para dibujar el dedo.
     *
     * Si el botón no se puede pulsar —«Enviar» está deshabilitado hasta que la
     * aplicación lo permite— se avisa y se sigue. Un paso que no sale no puede
     * tirar la toma entera: se pierden los cien fotogramas ya grabados.
     */
    const tocar = async (etiqueta) => {
      const pos = await donde(etiqueta);
      if (!pos) return false;

      try {
        await page
          .locator(`button[aria-label="${etiqueta}"], button:has-text("${etiqueta}")`)
          .first()
          .click({ timeout: 4000 });
      } catch {
        console.log(`    · «${etiqueta}» no se pudo pulsar; se sigue`);
        return false;
      }

      marcas.push({ tipo: 'toque', fotograma: n, x: pos.x, y: pos.y });
      return true;
    };

    const esperar = (s) => page.waitForTimeout(s * 1000);

    /** Lleva un botón al centro de la pantalla, deslizando como una persona. */
    const desplazarHasta = async (etiqueta) => {
      await page
        .locator(`button[aria-label="${etiqueta}"], button:has-text("${etiqueta}")`)
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
      await page.waitForTimeout(400);
    };

    await toma.hacer({ page, tocar, esperar, marcarElemento, desplazarHasta });

    await cdp.send('Page.stopScreencast');
    await Promise.all(pendientes);
    await cdp.detach().catch(() => {});

    await writeFile(
      `${dir}marcas.json`,
      JSON.stringify(
        {
          fotogramas: n,
          ancho: ANCHO,
          alto: ALTO,
          // Segundos desde el primer fotograma. Es lo que permite remuestrear.
          tiempos: tiempos.map((t) => (t && tiempos[0] ? +(t - tiempos[0]).toFixed(3) : 0)),
          marcas,
        },
        null,
        2
      )
    );

    console.log(`  ✓ ${toma.id}  —  ${n} fotogramas, ${marcas.length} marcas`);
  }

  await browser.close();
  console.log(`\nTomas en ${RAIZ}`);
};

main();
