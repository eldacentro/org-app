/**
 * GRABA LA INTERFAZ EN MOVIMIENTO, NO FOTOS DE ELLA.
 *
 * Un PNG nunca va a ser demostrativo: no se ve el número subir, ni el visto
 * al enviar, ni el desplazamiento. Esto abre la aplicación de verdad, hace los
 * gestos y va sacando un fotograma tras otro con el screencast de Chrome
 * —el mismo canal que usan las herramientas de desarrollo—, así que se captura
 * la animación REAL de la aplicación, no una reconstrucción.
 *
 * Sale una carpeta de fotogramas numerados por toma. Remotion los monta como
 * una secuencia de imágenes, que da más nitidez que un vídeo comprimido y
 * permite ir fotograma a fotograma al ajustar el montaje.
 *
 *   node grabar.mjs
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:4137';
const RAIZ = new URL('./tomas/', import.meta.url).pathname;

const ANCHO = 402;
const ALTO = 874;
const ESCALA = 2;

/** Grabar por encima de los 30 finales deja margen para el desenfoque. */
const FPS = 60;

/**
 * Las tomas. Cada una es un gesto real, no una pantalla quieta.
 *
 * `hacer` recibe utilidades: `tocar` pulsa con una pausa humana, `esperar`
 * deja correr la animación de la aplicación, y `ir` navega.
 */
const TOMAS = [
  {
    id: 'informe',
    descripcion: 'Subir las horas y enviar el informe',
    async preparar({ ir }) {
      await ir('Predicación');
      await ir('Informe de predicación');
    },
    async hacer({ page, esperar }) {
      // Las horas, de una en una: es el gesto que hace todo el mundo.
      const mas = page.locator('button').filter({ hasText: /^\+$/ }).first();
      const hayMas = await mas.isVisible().catch(() => false);

      if (hayMas) {
        for (let i = 0; i < 4; i++) {
          await mas.click();
          await esperar(0.35);
        }
      }

      await esperar(0.9);
      await page.mouse.wheel(0, 320);
      await esperar(1.4);
    },
  },
  {
    id: 'inicio',
    descripcion: 'El inicio, desplazándose despacio',
    async preparar() {},
    async hacer({ page, esperar }) {
      await esperar(0.6);
      for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 46);
        await esperar(0.05);
      }
      await esperar(1.2);
    },
  },
  {
    id: 'programas',
    descripcion: 'Programas semanales',
    async preparar({ ir }) {
      await ir('Programas semanales');
    },
    async hacer({ page, esperar }) {
      await esperar(0.7);
      for (let i = 0; i < 16; i++) {
        await page.mouse.wheel(0, 40);
        await esperar(0.05);
      }
      await esperar(1.1);
    },
  },
];

const main = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: ESCALA,
    locale: 'es-ES',
  });
  const page = await context.newPage();

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

    // El screencast de Chrome: fotogramas tal y como los pinta el navegador.
    const cdp = await context.newCDPSession(page);
    let n = 0;
    const pendientes = [];

    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      const nombre = `${dir}${String(n++).padStart(4, '0')}.jpg`;
      pendientes.push(writeFile(nombre, Buffer.from(data, 'base64')));
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      everyNthFrame: 1,
    });

    const esperar = (s) => page.waitForTimeout(s * 1000);
    await toma.hacer({ page, esperar });

    await cdp.send('Page.stopScreencast');
    await Promise.all(pendientes);
    await cdp.detach().catch(() => {});

    console.log(`  ✓ ${toma.id}  —  ${n} fotogramas  —  ${toma.descripcion}`);

    // Volver al inicio sin recargar: una recarga rehace los datos de prueba.
    await page.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const otra = page.getByText('Comenzar prueba', { exact: false }).first();
    if (await otra.isVisible({ timeout: 60000 }).catch(() => false)) {
      await otra.click();
      await page.waitForTimeout(2500);
    }
  }

  await browser.close();
  console.log(`\nTomas en ${RAIZ}  ·  grabado a ~${FPS} fps`);
};

main();
