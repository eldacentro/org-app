/**
 * Verificación de la clasificación mes a mes de las tarjetas de totales del
 * S-21 (misma lógica que useReportMonthly) sobre los datos reales.
 */
import { readFileSync } from 'node:fs';
import { personIsEnrollmentActive } from '../src/services/app/persons';
import { PersonType } from '../src/definition/person';

const app = JSON.parse(
  readFileSync('/Users/carlossacajr./Downloads/Elda_Centro_CORRECCION_FINAL_18JUL.json', 'utf8')
);
const d = app.data;

const persons: PersonType[] = d.persons.filter(
  (p: PersonType) => !p._deleted?.value
);
const byUid = new Map(persons.map((p) => [p.person_uid, p]));

const nm = (p: PersonType) =>
  `${p.person_data.person_firstname.value} ${p.person_data.person_lastname.value}`.trim();

const classify = (p: PersonType, month: string) => {
  const fts = ['FMF', 'FR', 'FS'].some((k) =>
    personIsEnrollmentActive(p, k as 'FR', month)
  );
  if (fts) return 'REGULARES/TC';
  if (personIsEnrollmentActive(p, 'AP', month)) return 'AUXILIARES';
  return 'PUBLICADORES';
};

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label} (${actual})`);
};

// Agustina: AP en 2026/03-05, publicadora normal en 2026/01-02 y 06
const ag = persons.find((p) => nm(p).includes('Agustina'));
check('Agustina 2026/03 → tarjeta de auxiliares', classify(ag, '2026/03'), 'AUXILIARES');
check('Agustina 2026/05 → tarjeta de auxiliares', classify(ag, '2026/05'), 'AUXILIARES');
check('Agustina 2026/01 → tarjeta de publicadores', classify(ag, '2026/01'), 'PUBLICADORES');
check('Agustina 2026/06 → tarjeta de publicadores', classify(ag, '2026/06'), 'PUBLICADORES');

// Un precursor regular de continuo: siempre en la de regulares
const fr = persons.find((p) => nm(p) === 'Jael Santiago');
check('Jael Santiago 2026/06 → regulares', classify(fr, '2026/06'), 'REGULARES/TC');
check('Jael Santiago 2025/01 → regulares', classify(fr, '2025/01'), 'REGULARES/TC');

// Reparto de un mes completo (junio 2026): las 3 tarjetas suman TODOS los informes
const juneReports = d.cong_field_service_reports.filter(
  (r: { report_data: { report_date: string; _deleted: boolean } }) =>
    r.report_data.report_date === '2026/06' && !r.report_data._deleted
);
const buckets: Record<string, number> = { 'REGULARES/TC': 0, AUXILIARES: 0, PUBLICADORES: 0 };
for (const r of juneReports) {
  const p = byUid.get(r.report_data.person_uid);
  if (!p) continue;
  buckets[classify(p, '2026/06')]++;
}
console.log(`\njunio 2026 (${juneReports.length} informes): reparto =`, buckets);
check('las 3 tarjetas cubren todos los informes de junio',
  buckets['REGULARES/TC'] + buckets['AUXILIARES'] + buckets['PUBLICADORES'],
  juneReports.length);

if (failures === 0) console.log('\nTodos los escenarios PASAN.');
else { console.error(`\n${failures} FALLANDO`); process.exit(1); }
