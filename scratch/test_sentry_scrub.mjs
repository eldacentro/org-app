// El regex de saneado, copiado tal cual del servicio (no se puede importar:
// el módulo llama a Sentry.init al cargarse).
const SECRET_PARAM = /([?&])k=[A-Za-z0-9_\-=]+/g;
const SHARE_PATH = /(#\/t\/[^/]+\/)[A-Za-z0-9_-]+/g;
const scrub = (v) => v.replace(SECRET_PARAM, '$1k=[redactado]').replace(SHARE_PATH, '$1[redactado]');

let fail = 0;
const ck = (l, c) => { if (!c) fail++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + l); };

const KEY = 'dGhpc19pc19hX3Rlc3Rfa2V5X29mXzQzX2NoYXJzX2Fh';
const TOKEN = 'abcDEF123456789_-XYZabcDEF12';
const url = `https://eldacentro.com/#/t/cong123/${TOKEN}?k=${KEY}`;
const out = scrub(url);

ck('la clave desaparece', !out.includes(KEY));
ck('el token desaparece', !out.includes(TOKEN));
ck('queda claro que se redactó', out.includes('[redactado]'));
ck('la parte no secreta se conserva', out.startsWith('https://eldacentro.com/#/t/cong123/'));
ck('URL normal no se toca', scrub('https://eldacentro.com/#/congregation/territories?view=abc') === 'https://eldacentro.com/#/congregation/territories?view=abc');
ck('otros parámetros no se tocan', scrub('https://x.com/?view=abc&k=SECRETO&z=1') === 'https://x.com/?view=abc&k=[redactado]&z=1');
ck('no confunde un parámetro que acaba en k', scrub('https://x.com/?ok=visible') === 'https://x.com/?ok=visible');
console.log('\n  ejemplo →', out);
console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
