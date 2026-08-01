/**
 * CAPTURA LAS PANTALLAS DE LA APLICACIÓN PARA LOS VÍDEOS.
 *
 * Recorre la aplicación de verdad —en modo de prueba, con la congregación
 * ficticia— y guarda un PNG por plano en `capturas/`. No hay ni una captura
 * hecha a mano: se vuelve a ejecutar y salen iguales.
 *
 * Ahí está el premio: cuando cambie la interfaz, se relanza esto, se
 * re-renderiza el vídeo y ya está al día. Los tutoriales grabados a mano se
 * quedan viejos y nadie los rehace.
 *
 *   node capturar.mjs
 *
 * Necesita el preview levantado en el 4137 (npm run preview en la app).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:4137';
const SALIDA = new URL('./capturas/', import.meta.url).pathname;

// iPhone 16 Pro en puntos. Se captura a 3x para que al escalar dentro del
// marco del dispositivo no se vea blando.
const ANCHO = 402;
const ALTO = 874;
const ESCALA = 3;

/** Los planos del guión que necesitan captura. Ver GUION_MAESTRO.md. */
const PLANOS = [
  {
    id: '03-asignaciones',
    descripcion: 'Inicio con «Mis asignaciones»',
    pasos: 0,
    async hacer() {
      /* el inicio ya es la pantalla de partida */
    },
  },
  {
    id: '04-informe',
    descripcion: 'Informe de predicación',
    pasos: 2,
    async hacer(page) {
      await irA(page, 'Predicación');
      await irA(page, 'Informe de predicación');
    },
  },
  {
    id: '05-programas',
    descripcion: 'Programas semanales, entre semana',
    pasos: 1,
    async hacer(page) {
      await irA(page, 'Programas semanales');
    },
  },
  {
    id: '06-territorios',
    descripcion: 'Territorios',
    pasos: 2,
    async hacer(page) {
      await irA(page, 'Predicación');
      await irA(page, 'Territorios');
    },
  },
];

/**
 * Pulsa el BOTÓN que contiene ese texto. Con `getByText` se agarraba el nodo
 * de dentro —un párrafo—, que no es lo clicable, y la pulsación se quedaba
 * esperando para siempre.
 */
const irA = async (page, texto) => {
  const destino = page.locator('button', { hasText: texto }).first();
  await destino.waitFor({ state: 'visible', timeout: 15000 });
  await destino.click();
  await page.waitForTimeout(1400);
};

/**
 * Arranca en el inicio, ya sembrado.
 *
 * El modo de prueba rehace los datos ficticios en CADA recarga y pide
 * confirmar; por eso se entra una sola vez y luego se navega pulsando, nunca
 * cambiando la dirección: una recarga se llevaría por delante los datos.
 */
const abrir = async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const comenzar = page.getByText('Comenzar prueba', { exact: false }).first();
  await comenzar.waitFor({ state: 'visible', timeout: 90000 });
  await comenzar.click();

  await page.waitForTimeout(2500);
};

/**
 * Vuelve atrás tantas pantallas como se haya avanzado.
 *
 * Nunca recargando: el modo de prueba REHACE los datos ficticios en cada
 * recarga y vuelve a pedir confirmación, así que volver por la dirección
 * costaba medio minuto por plano y podía dejar la sesión a medias.
 */
const volverAtras = async (page, veces) => {
  for (let i = 0; i < veces; i++) {
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(600);
};

const main = async () => {
  await mkdir(SALIDA, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: ESCALA,
    locale: 'es-ES',
  });
  const page = await context.newPage();

  await abrir(page);

  for (const plano of PLANOS) {
    try {
      await plano.hacer(page);
      await page.screenshot({ path: `${SALIDA}${plano.id}.png` });
      console.log(`  ✓ ${plano.id}  —  ${plano.descripcion}`);
    } catch (err) {
      console.log(`  ✗ ${plano.id}  —  ${err.message.split('\n')[0]}`);
    }
    await volverAtras(page, plano.pasos);
  }

  await browser.close();
  console.log(`\nCapturas en ${SALIDA}`);
};

main();
