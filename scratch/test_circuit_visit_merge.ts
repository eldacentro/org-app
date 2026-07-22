/**
 * Verificación del merge LWW por registro de circuit_overseer_visits
 * (mergeCircuitVisits / normalizeCircuitVisit) — el bug real era que la
 * copia del servidor pisaba SIEMPRE la edición local recién guardada.
 *
 * Uso: node scratch/run_node_test.mjs scratch/test_circuit_visit_merge.ts
 */
import {
  mergeCircuitVisits,
  normalizeCircuitVisit,
} from '../src/services/worker/circuitVisitMerge';
import { CircuitVisitType } from '../src/definition/circuit_visit';

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

const mkVisit = (over: Partial<CircuitVisitType>): CircuitVisitType => ({
  id: 'v1',
  _deleted: false,
  updatedAt: '2026-07-21T10:00:00.000Z',
  weekOf: '2026/10/12',
  date_start: '2026/10/13',
  date_end: '2026/10/18',
  is_substitute: false,
  substitute_name: '',
  substitute_spouse_name: '',
  meals: [],
  co_companions: [],
  shepherding_visits: [],
  meeting_pioneers: null,
  meeting_elders: null,
  accounting_note: '',
  ...over,
});

// 1. Remoto más nuevo → replace TOTAL (colecciones del remoto, sin fusión)
{
  const local = mkVisit({
    updatedAt: '2026-07-21T10:00:00.000Z',
    meals: [{ id: 'm1', date: '2026/10/14', host: 'p1', note: '' }],
    co_companions: [
      {
        outingKey: '2026/10/14_10:00',
        brother: 'pLocal',
        withWife: false,
        activity: 'predicacion',
        spouse_companions: [],
      },
    ],
  });
  const remote = mkVisit({
    updatedAt: '2026-07-21T11:00:00.000Z',
    meals: [],
    co_companions: [
      {
        outingKey: '2026/10/15_10:00',
        brother: 'pRemote',
        withWife: false,
        activity: 'revisitas',
        spouse_companions: [],
      },
    ],
    meeting_elders: { date: '2026/10/16', time: '19:00', place: 'Salón' },
  });
  const out = mergeCircuitVisits([local], [remote]);
  check('remoto más nuevo: 1 fila a escribir', out.length, 1);
  check('remoto más nuevo: comidas = las del remoto', out[0]?.meals, []);
  check(
    'remoto más nuevo: compañía = la del remoto',
    out[0]?.co_companions?.[0]?.brother,
    'pRemote'
  );
  check(
    'remoto más nuevo: reunión ancianos del remoto',
    out[0]?.meeting_elders?.time,
    '19:00'
  );
}

// 2. REGRESIÓN del bug: local editado hace 1 min, remoto de hace 1 h → intacto
{
  const local = mkVisit({
    updatedAt: '2026-07-21T11:59:00.000Z',
    meeting_elders: { date: '2026/10/16', time: '19:00', place: 'Salón' },
  });
  const remote = mkVisit({
    updatedAt: '2026-07-21T11:00:00.000Z',
    meeting_elders: null,
  });
  const out = mergeCircuitVisits([local], [remote]);
  check('regresión: edición local reciente NO se pisa (0 filas)', out.length, 0);
}

// 3. Empate exacto → gana local (no se escribe)
{
  const t = '2026-07-21T10:00:00.000Z';
  const out = mergeCircuitVisits(
    [mkVisit({ updatedAt: t })],
    [mkVisit({ updatedAt: t, accounting_note: 'distinta' })]
  );
  check('empate exacto: 0 filas', out.length, 0);
}

// 4. Sellos vacíos
{
  const sealed = '2026-07-21T10:00:00.000Z';
  check(
    "remoto '' vs local sellado: gana local",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: sealed })],
      [mkVisit({ updatedAt: '' })]
    ).length,
    0
  );
  check(
    "local '' vs remoto sellado: gana remoto",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: '' })],
      [mkVisit({ updatedAt: sealed })]
    ).length,
    1
  );
  check(
    "ambos '': gana local (conservador)",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: '' })],
      [mkVisit({ updatedAt: '' })]
    ).length,
    0
  );
}

// 5. Tombstone remoto más nuevo → la baja gana
{
  const out = mergeCircuitVisits(
    [mkVisit({ updatedAt: '2026-07-21T10:00:00.000Z' })],
    [mkVisit({ updatedAt: '2026-07-21T10:30:00.000Z', _deleted: true })]
  );
  check('tombstone remoto nuevo: 1 fila', out.length, 1);
  check('tombstone remoto nuevo: _deleted true', out[0]?._deleted, true);
}

// 6. Visita remota sin copia local → entra tal cual (push)
{
  const out = mergeCircuitVisits(
    [],
    [mkVisit({ id: 'v2', updatedAt: '2026-07-21T09:00:00.000Z' })]
  );
  check('remota nueva: 1 fila', out.length, 1);
  check('remota nueva: id', out[0]?.id, 'v2');
}

// 7. Normalización de claves ausentes (decryptObject borra las null)
{
  const raw = mkVisit({ id: 'v3', updatedAt: '2026-07-21T09:00:00.000Z' });
  delete (raw as Partial<CircuitVisitType>).meeting_pioneers;
  delete (raw as Partial<CircuitVisitType>).meals;
  const out = mergeCircuitVisits([], [raw]);
  check('normalización: meeting_pioneers → null', out[0]?.meeting_pioneers, null);
  check('normalización: meals → []', out[0]?.meals, []);

  const norm = normalizeCircuitVisit(raw);
  check('normalizeCircuitVisit directo: meeting_pioneers null', norm.meeting_pioneers, null);
}

// 8. Remoto corrupto sin id → ignorado sin romper
{
  const bad = { updatedAt: '2026-07-21T09:00:00.000Z' } as CircuitVisitType;
  const out = mergeCircuitVisits([], [bad]);
  check('remoto sin id: ignorado', out.length, 0);
}

console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
