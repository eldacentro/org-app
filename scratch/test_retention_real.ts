/**
 * Simulación de la purga de retención sobre los datos REALES (archivo de
 * corrección final del 18-jul, que es el estado actual de la app tras el
 * import). NO escribe nada — solo calcula el plan.
 */
import { readFileSync } from 'node:fs';
import { computeRetentionPlan, retentionWindowStart } from '../src/services/app/retention';

const app = JSON.parse(
  readFileSync('/Users/carlossacajr./Downloads/Elda_Centro_CORRECCION_FINAL_18JUL.json', 'utf8')
);
const d = app.data;

const TODAY = new Date();
console.log(`ventana de conservación de activos: desde ${retentionWindowStart(TODAY)}`);

const plan = computeRetentionPlan(
  d.persons,
  d.cong_field_service_reports,
  d.meeting_attendance,
  TODAY
);

console.log(`\ninformes a purgar: ${plan.reportsToDelete.length}`);
const byMonth = new Map<string, number>();
const byPerson = new Map<string, number>();
for (const { report, name } of plan.reportsToDelete) {
  const m = report.report_data.report_date;
  byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  byPerson.set(name, (byPerson.get(name) ?? 0) + 1);
}
const months = [...byMonth.keys()].sort();
console.log(`  rango de meses: ${months[0]} → ${months.at(-1)}`);
console.log(`  personas afectadas: ${byPerson.size}`);

console.log(`\nasistencia a purgar: ${plan.attendanceToDelete.length} meses`);
console.log(`  ${plan.attendanceToDelete.map((a) => a.month_date).sort().join(', ')}`);

console.log(`\nnombramientos a purgar: ${plan.enrollmentsToDelete.length}`);
const enrollByPerson = new Map<string, number>();
for (const { name } of plan.enrollmentsToDelete) {
  enrollByPerson.set(name, (enrollByPerson.get(name) ?? 0) + 1);
}
for (const [n, c] of [...enrollByPerson.entries()].sort()) console.log(`  ${n}: ${c}`);

// distribución de casos especiales: inactivos/no-bautizados/sacados con purga total
console.log('\npersonas con purga TOTAL de informes (inactivos NB / sacados):');
const totalReports = new Map<string, number>();
for (const r of d.cong_field_service_reports) {
  if (r.report_data._deleted) continue;
  totalReports.set(r.report_data.person_uid, (totalReports.get(r.report_data.person_uid) ?? 0) + 1);
}
const delByUid = new Map<string, number>();
for (const { report } of plan.reportsToDelete) {
  delByUid.set(report.report_data.person_uid, (delByUid.get(report.report_data.person_uid) ?? 0) + 1);
}
const uid2name = new Map(
  d.persons.map((p: { person_uid: string; person_data: { person_firstname: { value: string }; person_lastname: { value: string } } }) => [
    p.person_uid,
    `${p.person_data.person_firstname.value} ${p.person_data.person_lastname.value}`.trim(),
  ])
);
for (const [uid, delCount] of delByUid) {
  if (delCount === totalReports.get(uid)) {
    console.log(`  ${uid2name.get(uid)}: ${delCount} informes (todos)`);
  }
}
