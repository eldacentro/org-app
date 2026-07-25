/**
 * Verificación del escenario: la reunión de entre semana es el MIÉRCOLES 1 de
 * julio de 2026 (primer día del mes), pero esa semana es la visita del
 * superintendente de circuito y la reunión pasa al MARTES 30 de junio.
 * El registro de asistencia debe contarla en JUNIO, no en julio.
 *
 * Ejercita las funciones REALES (schedulesGetMeetingDate vía
 * attendanceWeeksForMonth) contra el store global de la app.
 *
 * Uso: npx tsx scratch/test_attendance_co_visit.ts
 */
import { store } from '../src/states/index';
import { settingsState } from '../src/states/settings';
import { schedulesState } from '../src/states/schedules';
import { settingSchema, scheduleSchema } from '../src/services/dexie/schema';
import { Week } from '../src/definition/week_type';
import { attendanceWeeksForMonth } from '../src/features/reports/meeting_attendance/hooks/attendanceWeeks';

const COVISIT_WEEK = '2026/06/29'; // lunes; el miércoles de esa semana es el 1 de julio

const setup = (weekType: Week) => {
  const settings = structuredClone(settingSchema);
  // miércoles (offset 2 desde el lunes) — valor por defecto del schema, se
  // fija explícito para que el escenario quede documentado
  settings.cong_settings.midweek_meeting[0].weekday.value = 2;
  // sin visit_weekday configurado → el código usa martes (1) por defecto
  store.set(settingsState, settings);

  const sched = structuredClone(scheduleSchema);
  sched.weekOf = COVISIT_WEEK;
  sched.midweek_meeting.week_type = [
    { type: 'main', value: weekType, updatedAt: '' },
  ];
  sched.weekend_meeting.week_type = [
    { type: 'main', value: weekType, updatedAt: '' },
  ];
  store.set(schedulesState, [sched]);
};

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

// ── Escenario A: semana NORMAL — la reunión del mié 1 jul cuenta en julio ──
setup(Week.NORMAL);

check(
  'semana normal: junio tiene 4 reuniones de entre semana (3,10,17,24)',
  attendanceWeeksForMonth('2026/06', 'midweek').map((w) => w.date),
  ['2026/06/03', '2026/06/10', '2026/06/17', '2026/06/24']
);

check(
  'semana normal: julio tiene 5, la primera es el miércoles 1',
  attendanceWeeksForMonth('2026/07', 'midweek').map((w) => w.date),
  ['2026/07/01', '2026/07/08', '2026/07/15', '2026/07/22', '2026/07/29']
);

// ── Escenario B: semana de VISITA DEL CO — la reunión pasa al mar 30 jun ──
setup(Week.CO_VISIT);

check(
  'visita del CO: la reunión se mueve al martes 30 y JUNIO pasa a tener 5',
  attendanceWeeksForMonth('2026/06', 'midweek').map((w) => w.date),
  ['2026/06/03', '2026/06/10', '2026/06/17', '2026/06/24', '2026/06/30']
);

check(
  'visita del CO: julio pierde esa reunión y se queda con 4 (8,15,22,29)',
  attendanceWeeksForMonth('2026/07', 'midweek').map((w) => w.date),
  ['2026/07/08', '2026/07/15', '2026/07/22', '2026/07/29']
);

// ── Escenario C: la reunión de FIN DE SEMANA de esa semana no se mueve ──
check(
  'visita del CO: el fin de semana (domingo 5 jul) sigue contando en julio',
  attendanceWeeksForMonth('2026/07', 'weekend').map((w) => w.date),
  ['2026/07/05', '2026/07/12', '2026/07/19', '2026/07/26']
);

if (failures === 0) {
  console.log('\nTodos los escenarios PASAN.');
  process.exit(0);
} else {
  console.error(`\n${failures} escenario(s) FALLANDO.`);
  process.exit(1);
}
