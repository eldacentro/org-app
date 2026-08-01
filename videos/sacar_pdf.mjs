/**
 * Pulsa el botón de exportar dentro de la aplicación y guarda el PDF.
 *
 * El documento se renderiza donde está pensado —en el navegador, con la
 * aplicación cargada— en vez de pelearse con Node, que no tiene ni fuentes ni
 * las cosas del navegador que la cadena de importaciones toca al arrancar.
 */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'es-ES',
  acceptDownloads: true,
});
const page = await context.newPage();

await page.goto('http://localhost:4137', { waitUntil: 'networkidle' });
const comenzar = page.getByText('Comenzar prueba', { exact: false }).first();
await comenzar.waitFor({ state: 'visible', timeout: 120000 });
await comenzar.click();
await page.waitForTimeout(3000);

await page.locator('button', { hasText: 'Configuración' }).first().click();
await page.waitForTimeout(1500);
const opciones = await page.evaluate(() =>
  [...document.querySelectorAll('button,a')]
    .map((e) => e.innerText.trim().split('\n')[0])
    .filter((t) => t && t.length < 44)
);
console.log('EN CONFIGURACIÓN:', JSON.stringify(opciones));
await page.locator('button', { hasText: 'congregación' }).first().click();
await page.waitForTimeout(2500);

const boton = page
  .locator('button', { hasText: 'Exportar' })
  .last();
await boton.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

const [descarga] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  boton.click(),
]);

await descarga.saveAs('/tmp/accesos.pdf');
console.log('PDF guardado:', await descarga.suggestedFilename());

await browser.close();
