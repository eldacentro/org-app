import { build } from 'esbuild';
import { createRequire } from 'module';
await build({
  entryPoints: ['src/services/app/territory_share.ts'],
  bundle: true, format: 'cjs', platform: 'node', outfile: '/tmp/payload_bundle.cjs',
  alias: { '@definition': './src/definition', '@services': './src/services', '@utils': './src/utils' },
});
const require = createRequire(import.meta.url);
const { buildSharePayload, shareContentFingerprint } = require('/tmp/payload_bundle.cjs');

let fail = 0;
const ck = (l, c) => { if (!c) fail++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + l); };

const zones = [{ id:'z1', nombre:'Centro', color:'#123456' }];
const tags = [{ id:'t1', nombre:'Grande', color:'#abc' }, { id:'t2', nombre:'Piso', color:'#def' }];
const territory = { id:'ter1', zoneId:'z1', numero:'45', nombre:'Mercado', geometry:{type:'Polygon',coordinates:[[[0,0]]]},
  imageURL:'https://firebasestorage.googleapis.com/x?alt=media&token=abc', numeroViviendas: 120,
  notas:'Ojo con el perro', tags:['t1','t2'], updatedAt:'2026-07-01T00:00:00Z' };
const locations = [
  { id:'l1', territoryId:'ter1', direccion:'C/ Mayor 3', nota:'No abrir', aprobada:true },
  { id:'l2', territoryId:'ter1', direccion:'C/ Sol 9', aprobada:false },          // sin aprobar
  { id:'l3', territoryId:'OTRO', direccion:'C/ Luna 1', aprobada:true },          // otro territorio
];
const base = { territory, zones, tags, locations, congName:'Elda Centro', now:'2026-07-25T10:00:00Z' };

const p = buildSharePayload(base);

// Contenido correcto
ck('etiqueta compuesta', p.label === '45 — Mercado');
ck('zona y color resueltos', p.zoneName === 'Centro' && p.zoneColor === '#123456');
ck('congregación incluida', p.congName === 'Elda Centro');
ck('geometría y viviendas', p.geometry && p.numeroViviendas === 120);
ck('etiquetas resueltas a nombre', JSON.stringify(p.tags) === JSON.stringify([{nombre:'Grande',color:'#abc'},{nombre:'Piso',color:'#def'}]));

// Direcciones: solo aprobadas y solo de este territorio
ck('solo direcciones aprobadas de ESTE territorio', p.locations.length === 1 && p.locations[0].direccion === 'C/ Mayor 3');

// PRIVACIDAD: nada de datos personales de terceros
const asJson = JSON.stringify(p);
ck('no incluye personUid ni nombre del asignatario', !/personUid|assignedAt|dueAt|assignedBy|addedBy|approvedBy/.test(asJson));
ck('no incluye ids internos del territorio', !asJson.includes('"id"') && !asJson.includes('ter1'));

// SIN CLAVE MAESTRA: los campos cifrados se omiten, no se cuelan
const encTerritory = { ...territory, notas: 'enc::U2FsdGVkX1abc' };
const encLocations = [{ id:'l1', territoryId:'ter1', direccion:'enc::U2FsdGVkX1xyz', nota:'enc::U2FsdGVkX1n', aprobada:true }];
const p2 = buildSharePayload({ ...base, territory: encTerritory, locations: encLocations });
ck('nota cifrada se OMITE (no se enseña enc::)', p2.notas === undefined);
ck('dirección cifrada se OMITE por completo', p2.locations.length === 0);
ck('en ningún caso aparece "enc::" en el payload', !JSON.stringify(p2).includes('enc::'));

// Nota cifrada suelta en una dirección legible
const mixed = [{ id:'l1', territoryId:'ter1', direccion:'C/ Mayor 3', nota:'enc::U2FsdGVkX1n', aprobada:true }];
const p3 = buildSharePayload({ ...base, locations: mixed });
ck('dirección legible con nota cifrada → se ve la dirección, no la nota',
   p3.locations.length === 1 && p3.locations[0].direccion === 'C/ Mayor 3' && p3.locations[0].nota === undefined);

// Huella
const fpA = shareContentFingerprint(p);
const fpB = shareContentFingerprint(buildSharePayload({ ...base, now: '2099-01-01T00:00:00Z' }));
ck('la huella IGNORA generatedAt (no falsos cambios)', fpA === fpB);
const fpC = shareContentFingerprint(buildSharePayload({ ...base, territory: { ...territory, numeroViviendas: 121 } }));
ck('la huella CAMBIA si cambia el contenido', fpA !== fpC);
const fpD = shareContentFingerprint(buildSharePayload({ ...base, locations: [locations[0], locations[1], locations[2]] }));
ck('la huella es estable ante el mismo contenido', fpA === fpD);
const fpE = shareContentFingerprint(buildSharePayload({ ...base, territory: { ...territory, imageURL: 'https://otra/x?token=nuevo' } }));
ck('la huella CAMBIA si cambia la imagen (token nuevo al re-subir)', fpA !== fpE);

console.log(fail ? `\n${fail} FALLOS` : '\nTODO OK');
