/**
 * Verificación de la norma de conservación (computeRetentionPlan) con los 4
 * casos de las instrucciones + el rollover del año de servicio.
 *
 * Uso: node scratch/run_node_test.mjs scratch/test_retention.ts
 */
import {
  computeRetentionPlan,
  retentionWindowStart,
  serviceYearStartOf,
} from '../src/services/app/retention';
import { personSchema } from '../src/services/dexie/schema';
import { PersonType } from '../src/definition/person';
import { CongFieldServiceReportType } from '../src/definition/cong_field_service_reports';
import { MeetingAttendanceType } from '../src/definition/meeting_attendance';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
  if (!ok) {
    console.log(`   esperado: ${JSON.stringify(expected)}`);
    console.log(`   real:     ${JSON.stringify(actual)}`);
  }
};

// ── helpers de datos ──
const mkPerson = (
  uid: string,
  opts: {
    baptized?: boolean;
    open?: boolean;        // historial abierto (activo)
    unbaptizedOnly?: boolean;
    disqualified?: boolean;
    enrollments?: { id: string; end: string | null }[];
  }
): PersonType => {
  const p: PersonType = structuredClone(personSchema);
  p.person_uid = uid;
  p.person_data.person_firstname.value = uid;
  p.person_data.disqualified.value = opts.disqualified ?? false;
  const hist = [
    {
      id: 'h1',
      _deleted: false,
      updatedAt: '',
      start_date: '2023/01/01',
      end_date: opts.open ? null : '2025/03/31',
    },
  ];
  if (opts.unbaptizedOnly) {
    p.person_data.publisher_unbaptized.history = hist;
    p.person_data.publisher_baptized.history = [];
  } else if (opts.baptized !== false) {
    p.person_data.publisher_baptized.history = hist;
    p.person_data.publisher_baptized.baptism_date.value = '2020-01-01T00:00:00.000Z';
  }
  p.person_data.enrollments = (opts.enrollments ?? []).map((e) => ({
    id: e.id,
    _deleted: false,
    updatedAt: '',
    enrollment: 'AP',
    start_date: '2023/09/01',
    end_date: e.end,
  }));
  return p;
};

const mkReport = (uid: string, month: string): CongFieldServiceReportType =>
  ({
    report_id: `${uid}-${month}`,
    report_data: {
      _deleted: false,
      updatedAt: '',
      report_date: month,
      person_uid: uid,
      shared_ministry: true,
      hours: { field_service: 0, credit: { value: 0, approved: 0 } },
      bible_studies: 0,
      comments: '',
      late: { value: false, submitted: '' },
      status: 'confirmed',
    },
  }) as unknown as CongFieldServiceReportType;

const mkAtt = (month: string): MeetingAttendanceType =>
  ({
    _deleted: { value: false, updatedAt: '' },
    month_date: month,
  }) as unknown as MeetingAttendanceType;

// ── helpers de fecha ──
const TODAY = new Date(2026, 6, 18); // 18-jul-2026 → AS 2026 (sep25-ago26); ventana desde 2024/09

check('ventana de activos (jul-2026)', retentionWindowStart(TODAY), '2024/09');
check('rollover: el 1-sep-2026 la ventana pasa a 2025/09', retentionWindowStart(new Date(2026, 8, 1)), '2025/09');
check('año de servicio de 2024/08', serviceYearStartOf('2024/08'), '2023/09');
check('año de servicio de 2024/09', serviceYearStartOf('2024/09'), '2024/09');

// ── escenarios ──
const activo = mkPerson('activo', { open: true, enrollments: [
  { id: 'e-viejo', end: '2024/06/30' },   // fuera de ventana → borrar
  { id: 'e-reciente', end: '2026/05/31' },// dentro → conservar
  { id: 'e-abierto', end: null },         // abierto → nunca tocar
] });
const inactivoB = mkPerson('inactivoB', { open: false }); // bautizado inactivo, últimos informes 2025/03 → AS 2025 (2024/09-2025/08)
const inactivoNB = mkPerson('inactivoNB', { unbaptizedOnly: true, open: false });
const sacado = mkPerson('sacado', { open: true, disqualified: true });

const reports = [
  // activo: 2024/08 fuera, 2024/09 y 2026/06 dentro
  mkReport('activo', '2024/08'), mkReport('activo', '2024/09'), mkReport('activo', '2026/06'),
  // inactivo bautizado: informes 2023/10 (AS 2024, fuera), 2024/11 y 2025/03 (AS 2025 = año en que quedó inactivo → se conservan)
  mkReport('inactivoB', '2023/10'), mkReport('inactivoB', '2024/11'), mkReport('inactivoB', '2025/03'),
  // no bautizado inactivo: todo fuera
  mkReport('inactivoNB', '2025/02'), mkReport('inactivoNB', '2026/01'),
  // sacado: todo fuera
  mkReport('sacado', '2026/05'),
  // informe huérfano (persona no sincronizada aún) → NO tocar
  mkReport('desconocido', '2020/01'),
];

const atts = [mkAtt('2024/08'), mkAtt('2024/09'), mkAtt('2026/06')];

const plan = computeRetentionPlan([activo, inactivoB, inactivoNB, sacado], reports, atts, TODAY);

const del = (uid: string) =>
  plan.reportsToDelete.filter((x) => x.report.report_data.person_uid === uid)
    .map((x) => x.report.report_data.report_date).sort();

check('activo: solo cae 2024/08', del('activo'), ['2024/08']);
check('inactivo bautizado: cae 2023/10, se conserva su año de inactividad (2024/11, 2025/03)', del('inactivoB'), ['2023/10']);
check('no bautizado inactivo: caen todos', del('inactivoNB'), ['2025/02', '2026/01']);
check('sacado: caen todos', del('sacado'), ['2026/05']);
check('informe de persona no sincronizada: intacto', del('desconocido'), []);
check('asistencia: solo cae 2024/08', plan.attendanceToDelete.map((a) => a.month_date), ['2024/08']);
check('nombramientos del activo: solo cae el viejo cerrado',
  plan.enrollmentsToDelete.map((e) => e.enrollmentId), ['e-viejo']);

// guardas de seguridad: sin personas o sin informes → plan vacío
const empty1 = computeRetentionPlan([], reports, atts, TODAY);
const empty2 = computeRetentionPlan([activo], [], atts, TODAY);
check('sin personas sincronizadas → no se toca nada',
  empty1.reportsToDelete.length + empty1.attendanceToDelete.length, 0);
check('sin informes sincronizados → no se toca nada',
  empty2.reportsToDelete.length + empty2.attendanceToDelete.length, 0);

// ═══════════════ TRANSICIONES inactivo ↔ activo (añadido 2026-07-18) ═══════════════
console.log('\n— transiciones —');

// A) ESTABILIDAD del inactivo: su año de inactividad NUNCA se purga, por
// muchos años que pasen. El último informe siempre queda, así que el año
// conservado no cambia entre ejecuciones.
{
  const p = mkPerson('estable', { open: false }); // inactivo bautizado
  const reps = [mkReport('estable', '2023/10'), mkReport('estable', '2024/02')]; // último = 2024/02 → AS 2024 (2023/09-2024/08)
  // hoy = jul-2026 (más de 2 años después)
  const plan1 = computeRetentionPlan([p], reps, [], TODAY);
  check('inactivo: SOLO cae lo anterior a su año de inactividad',
    plan1.reportsToDelete.map((x) => x.report.report_data.report_date), []);
  // ambos informes son del AS 2024 → se conservan los dos... comprobar con uno fuera:
  const reps2 = [mkReport('estable', '2023/08'), ...reps]; // 2023/08 = AS 2023 → cae
  const plan2 = computeRetentionPlan([p], reps2, [], TODAY);
  check('inactivo: cae el AS anterior, se conserva el de inactividad',
    plan2.reportsToDelete.map((x) => x.report.report_data.report_date), ['2023/08']);
  // segunda pasada tras la purga: NADA más cae (estable para siempre)
  const survivors = reps2.filter((r) => r.report_data.report_date !== '2023/08');
  const plan3 = computeRetentionPlan([p], survivors, [], new Date(2030, 6, 1)); // año 2030
  check('inactivo: 4 años después sigue conservando su año de inactividad',
    plan3.reportsToDelete.length, 0);
}

// B) REACTIVACIÓN: al volver a estar activo, pasa a la ventana normal
// (año en curso + anterior) — su antiguo año de inactividad, si quedó fuera
// de la ventana, se purga (norma de 2 años para activos).
{
  const p = mkPerson('reactivado', { open: true }); // historial ABIERTO otra vez
  const reps = [
    mkReport('reactivado', '2024/02'),  // su antiguo año de inactividad (AS 2024) — ya fuera de ventana
    mkReport('reactivado', '2026/07'),  // informe nuevo tras reactivarse
  ];
  const plan = computeRetentionPlan([p], reps, [], TODAY);
  check('reactivado: su año de inactividad antiguo cae, el informe nuevo se conserva',
    plan.reportsToDelete.map((x) => x.report.report_data.report_date), ['2024/02']);
}

// C) REACTIVACIÓN RECIENTE con año de inactividad dentro de la ventana:
// no cae nada (la ventana de activos lo cubre).
{
  const p = mkPerson('reactivado2', { open: true });
  const reps = [mkReport('reactivado2', '2025/03'), mkReport('reactivado2', '2026/07')];
  const plan = computeRetentionPlan([p], reps, [], TODAY);
  check('reactivado reciente: nada cae (todo dentro de la ventana)',
    plan.reportsToDelete.length, 0);
}

// D) DESCALIFICADO y luego READMITIDO: mientras está descalificado todo cae;
// al readmitirlo (disqualified=false + historial abierto) rige la ventana.
{
  const p = mkPerson('readmitido', { open: true, disqualified: false });
  const reps = [mkReport('readmitido', '2026/05')];
  const plan = computeRetentionPlan([p], reps, [], TODAY);
  check('readmitido: sus informes nuevos se conservan', plan.reportsToDelete.length, 0);
}

// E) Inactivo SIN informes: nada que conservar, nada que romper.
{
  const p = mkPerson('sininformes', { open: false });
  const plan = computeRetentionPlan([p], [mkReport('otro', '2020/01')], [], TODAY);
  check('inactivo sin informes: no rompe y no toca informes ajenos',
    plan.reportsToDelete.length, 0);
}

if (failures === 0) {
  console.log('\nTodos los escenarios PASAN.');
  process.exit(0);
} else {
  console.error(`\n${failures} escenario(s) FALLANDO.`);
  process.exit(1);
}
