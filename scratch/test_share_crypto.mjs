import { build } from 'esbuild';
import { createRequire } from 'module';
await build({
  entryPoints: ['src/services/encryption/share.ts'],
  bundle: true, format: 'cjs', platform: 'node', outfile: '/tmp/share_bundle.cjs',
});
const require = createRequire(import.meta.url);
const m = require('/tmp/share_bundle.cjs');

let fail = 0;
const ck = (l, c) => { if (!c) fail++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + l); };
const CONG = 'cong-abc123', TOKEN = m.generateShareToken();

// 1. Token y clave
ck('token de 32 chars (192 bits)', TOKEN.length === 32);
ck('token es base64url válido como ID de Firestore', /^[A-Za-z0-9_-]+$/.test(TOKEN) && !TOKEN.includes('/') && !TOKEN.includes('.'));
ck('tokens distintos en cada llamada', m.generateShareToken() !== m.generateShareToken());
const key = m.generateShareKey();
ck('clave de 32 bytes', key.length === 32);
const keyStr = m.shareKeyToString(key);
ck(`clave en base64url de ${m.SHARE_KEY_LENGTH} chars`, keyStr.length === m.SHARE_KEY_LENGTH);
ck('clave ida y vuelta', Buffer.compare(Buffer.from(m.shareKeyFromString(keyStr)), Buffer.from(key)) === 0);

// 2. Round-trip
const payload = { v:1, label:'Territorio 45', congName:'Elda Centro', notas:'Ojo con el perro',
  locations:[{direccion:'C/ Mayor 3, 2ºB', nota:'No visitar'}], geometry:{type:'Polygon',coordinates:[[[-0.79,38.47],[-0.79,38.48],[-0.78,38.48],[-0.79,38.47]]]} };
const ct = await m.encryptSharePayload(payload, key, CONG, TOKEN);
ck('el cifrado lleva prefijo de versión', ct.startsWith('v1.'));
ck('el texto cifrado NO contiene los datos en claro', !ct.includes('Mayor') && !ct.includes('perro') && !ct.includes('Territorio 45'));
const back = await m.decryptSharePayload(ct, key, CONG, TOKEN);
ck('descifra idéntico', JSON.stringify(back) === JSON.stringify(payload));

// 3. IV aleatorio: dos cifrados del mismo dato son distintos
const ct2 = await m.encryptSharePayload(payload, key, CONG, TOKEN);
ck('mismo dato → distinto ciphertext (IV aleatorio)', ct !== ct2);

// 4. AAD: el ciphertext está atado a SU documento
const other = await m.decryptSharePayload(ct, key, CONG, TOKEN).then(()=>null).catch(e=>e);
let movedFails = false;
try { await m.decryptSharePayload(ct, key, CONG, m.generateShareToken()); } catch { movedFails = true; }
ck('mover el payload a otro token FALLA (AAD)', movedFails);
let otherCong = false;
try { await m.decryptSharePayload(ct, key, 'otra-cong', TOKEN); } catch { otherCong = true; }
ck('reutilizarlo en otra congregación FALLA (AAD)', otherCong);

// 5. Clave incorrecta
let wrongKey = false;
try { await m.decryptSharePayload(ct, m.generateShareKey(), CONG, TOKEN); } catch { wrongKey = true; }
ck('clave incorrecta FALLA', wrongKey);

// 6. Manipulación del ciphertext
const tampered = ct.slice(0, -4) + (ct.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
let tamperFails = false;
try { await m.decryptSharePayload(tampered, key, CONG, TOKEN); } catch { tamperFails = true; }
ck('ciphertext manipulado FALLA (autenticado)', tamperFails);

// 7. EL CASO QUE ROMPE deterministic.ts: payload grande (spread → RangeError)
const big = { geometry: { type:'Polygon', coordinates: [Array.from({length: 9000}, (_,i)=>[-0.79 + i*1e-7, 38.47 + i*1e-7])] } };
const bigCt = await m.encryptSharePayload(big, key, CONG, TOKEN);
const bigBack = await m.decryptSharePayload(bigCt, key, CONG, TOKEN);
ck(`payload grande (~${Math.round(JSON.stringify(big).length/1024)} KB) va y vuelve sin RangeError`,
   JSON.stringify(bigBack) === JSON.stringify(big));
// prueba de que el método de deterministic.ts SÍ habría reventado a este tamaño
let oldWouldBreak = false;
try { btoa(String.fromCharCode(...new Uint8Array(JSON.stringify(big).length))); }
catch (e) { oldWouldBreak = /call stack|Invalid array length/i.test(e.message); }
ck('el método antiguo (spread de deterministic.ts) SÍ revienta a este tamaño', oldWouldBreak);

// 8. Guarda de tamaño
let tooBig = false;
try { await m.encryptSharePayload({ blob: 'x'.repeat(900_000) }, key, CONG, TOKEN); } catch (e) { tooBig = /demasiado grande/.test(e.message); }
ck('payload por encima del límite se rechaza con mensaje claro', tooBig);

// 9. Formato desconocido
let badFormat = false;
try { await m.decryptSharePayload('loquesea', key, CONG, TOKEN); } catch (e) { badFormat = /Formato/.test(e.message); }
ck('formato desconocido se rechaza', badFormat);

// 10. sha256
const h = await m.sha256Hex('abc');
ck('sha256 correcto', h === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
