import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:2, locale:'es-ES' });
const p = await c.newPage();
await p.goto('http://localhost:4137', { waitUntil:'networkidle' });
const cta = p.getByText('Comenzar prueba', {exact:false}).first();
await cta.waitFor({state:'visible', timeout:120000}); await cta.click(); await p.waitForTimeout(2500);
for (const t of ['Predicación','Informe de predicación']) {
  await p.locator('button', {hasText:t}).first().click(); await p.waitForTimeout(1500);
}
const info = await p.evaluate(() => [...document.querySelectorAll('button')].map((e,i)=>{
  const r=e.getBoundingClientRect();
  return {i, txt:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,34), x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};
}).filter(o=>o.w>0&&o.h>0));
console.log(JSON.stringify(info,null,0));
await b.close();
