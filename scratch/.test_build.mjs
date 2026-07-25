import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
// Shims mínimos de navegador para módulos que los tocan al importarse
const __mem = new Map();
globalThis.localStorage ??= {
  getItem: (k) => (__mem.has(k) ? __mem.get(k) : null),
  setItem: (k, v) => __mem.set(k, String(v)),
  removeItem: (k) => __mem.delete(k),
  clear: () => __mem.clear(),
  key: (i) => [...__mem.keys()][i] ?? null,
  get length() { return __mem.size; },
};
globalThis.window ??= globalThis;
globalThis.location ??= { hostname: 'localhost', origin: 'http://localhost', href: 'http://localhost/', pathname: '/', search: '' };

// src/services/worker/circuitVisitMerge.ts
var normalizeCircuitVisit = (v) => ({
  ...v,
  _deleted: v._deleted ?? false,
  updatedAt: v.updatedAt ?? "",
  weekOf: v.weekOf ?? "",
  date_start: v.date_start ?? "",
  date_end: v.date_end ?? "",
  is_substitute: v.is_substitute ?? false,
  substitute_name: v.substitute_name ?? "",
  substitute_spouse_name: v.substitute_spouse_name ?? "",
  accounting_note: v.accounting_note ?? "",
  meals: v.meals ?? [],
  co_companions: v.co_companions ?? [],
  shepherding_visits: v.shepherding_visits ?? [],
  meeting_pioneers: v.meeting_pioneers ?? null,
  meeting_elders: v.meeting_elders ?? null
});
var mergeCircuitVisits = (localData, remoteData) => {
  const dataToUpdate = [];
  for (const remoteItem of remoteData) {
    if (!remoteItem?.id) continue;
    const localItem = localData.find((r) => r.id === remoteItem.id);
    if (!localItem) {
      dataToUpdate.push(normalizeCircuitVisit(remoteItem));
      continue;
    }
    const remoteAt = remoteItem.updatedAt || "";
    const localAt = localItem.updatedAt || "";
    if (remoteAt > localAt) {
      dataToUpdate.push(normalizeCircuitVisit(remoteItem));
    }
  }
  return dataToUpdate;
};

// scratch/test_circuit_visit_merge.ts
var failures = 0;
var check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} \u2014 ${label}`);
  if (!ok) {
    console.log(`   esperado: ${JSON.stringify(expected)}`);
    console.log(`   real:     ${JSON.stringify(actual)}`);
  }
};
var mkVisit = (over) => ({
  id: "v1",
  _deleted: false,
  updatedAt: "2026-07-21T10:00:00.000Z",
  weekOf: "2026/10/12",
  date_start: "2026/10/13",
  date_end: "2026/10/18",
  is_substitute: false,
  substitute_name: "",
  substitute_spouse_name: "",
  meals: [],
  co_companions: [],
  shepherding_visits: [],
  meeting_pioneers: null,
  meeting_elders: null,
  accounting_note: "",
  ...over
});
{
  const local = mkVisit({
    updatedAt: "2026-07-21T10:00:00.000Z",
    meals: [{ id: "m1", date: "2026/10/14", host: "p1", note: "" }],
    co_companions: [
      {
        outingKey: "2026/10/14_10:00",
        brother: "pLocal",
        withWife: false,
        activity: "predicacion",
        spouse_companions: []
      }
    ]
  });
  const remote = mkVisit({
    updatedAt: "2026-07-21T11:00:00.000Z",
    meals: [],
    co_companions: [
      {
        outingKey: "2026/10/15_10:00",
        brother: "pRemote",
        withWife: false,
        activity: "revisitas",
        spouse_companions: []
      }
    ],
    meeting_elders: { date: "2026/10/16", time: "19:00", place: "Sal\xF3n" }
  });
  const out = mergeCircuitVisits([local], [remote]);
  check("remoto m\xE1s nuevo: 1 fila a escribir", out.length, 1);
  check("remoto m\xE1s nuevo: comidas = las del remoto", out[0]?.meals, []);
  check(
    "remoto m\xE1s nuevo: compa\xF1\xEDa = la del remoto",
    out[0]?.co_companions?.[0]?.brother,
    "pRemote"
  );
  check(
    "remoto m\xE1s nuevo: reuni\xF3n ancianos del remoto",
    out[0]?.meeting_elders?.time,
    "19:00"
  );
}
{
  const local = mkVisit({
    updatedAt: "2026-07-21T11:59:00.000Z",
    meeting_elders: { date: "2026/10/16", time: "19:00", place: "Sal\xF3n" }
  });
  const remote = mkVisit({
    updatedAt: "2026-07-21T11:00:00.000Z",
    meeting_elders: null
  });
  const out = mergeCircuitVisits([local], [remote]);
  check("regresi\xF3n: edici\xF3n local reciente NO se pisa (0 filas)", out.length, 0);
}
{
  const t = "2026-07-21T10:00:00.000Z";
  const out = mergeCircuitVisits(
    [mkVisit({ updatedAt: t })],
    [mkVisit({ updatedAt: t, accounting_note: "distinta" })]
  );
  check("empate exacto: 0 filas", out.length, 0);
}
{
  const sealed = "2026-07-21T10:00:00.000Z";
  check(
    "remoto '' vs local sellado: gana local",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: sealed })],
      [mkVisit({ updatedAt: "" })]
    ).length,
    0
  );
  check(
    "local '' vs remoto sellado: gana remoto",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: "" })],
      [mkVisit({ updatedAt: sealed })]
    ).length,
    1
  );
  check(
    "ambos '': gana local (conservador)",
    mergeCircuitVisits(
      [mkVisit({ updatedAt: "" })],
      [mkVisit({ updatedAt: "" })]
    ).length,
    0
  );
}
{
  const out = mergeCircuitVisits(
    [mkVisit({ updatedAt: "2026-07-21T10:00:00.000Z" })],
    [mkVisit({ updatedAt: "2026-07-21T10:30:00.000Z", _deleted: true })]
  );
  check("tombstone remoto nuevo: 1 fila", out.length, 1);
  check("tombstone remoto nuevo: _deleted true", out[0]?._deleted, true);
}
{
  const out = mergeCircuitVisits(
    [],
    [mkVisit({ id: "v2", updatedAt: "2026-07-21T09:00:00.000Z" })]
  );
  check("remota nueva: 1 fila", out.length, 1);
  check("remota nueva: id", out[0]?.id, "v2");
}
{
  const raw = mkVisit({ id: "v3", updatedAt: "2026-07-21T09:00:00.000Z" });
  delete raw.meeting_pioneers;
  delete raw.meals;
  const out = mergeCircuitVisits([], [raw]);
  check("normalizaci\xF3n: meeting_pioneers \u2192 null", out[0]?.meeting_pioneers, null);
  check("normalizaci\xF3n: meals \u2192 []", out[0]?.meals, []);
  const norm = normalizeCircuitVisit(raw);
  check("normalizeCircuitVisit directo: meeting_pioneers null", norm.meeting_pioneers, null);
}
{
  const bad = { updatedAt: "2026-07-21T09:00:00.000Z" };
  const out = mergeCircuitVisits([], [bad]);
  check("remoto sin id: ignorado", out.length, 0);
}
console.log(failures === 0 ? "\nTODO OK" : `
${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
