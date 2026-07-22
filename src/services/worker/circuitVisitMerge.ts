import { CircuitVisitType } from '@definition/circuit_visit';

// ── Fusión de sync para circuit_overseer_visits ──────────────────────────
// A diferencia del resto de entidades sincronizadas (que llevan su payload
// en un objeto anidado con `updatedAt` propio, p. ej. person_data /
// event_data, y por eso las protege el guard de syncFromRemote), la visita
// del CO es una entidad PLANA: su `updatedAt` es hermano de los datos.
// Pasarla por syncFromRemote hacía que la copia del servidor pisara SIEMPRE
// la local, aunque fuera más vieja — y como el ciclo de sync hace GET+merge
// ANTES de construir la subida, cada edición local se revertía en el
// siguiente ciclo (bug real, 2026-07-21: fechas/lugares de reuniones
// especiales que "no se guardaban").
//
// Aquí el modelo correcto es last-write-wins A NIVEL DE REGISTRO: cada
// guardado (dbCircuitVisitSave) escribe el registro ENTERO con updatedAt
// fresco, así que no existe edición por-campo que fusionar — la copia más
// nueva es el estado completo e intencional. Es además el mismo modelo que
// ya usan los tombstones (_deleted + updatedAt).
//
// Módulo puro (sin appDb) a propósito: testeable en node con
// scratch/run_node_test.mjs.

// decryptObject (services/encryption) ELIMINA las claves cuyo valor viajó
// como null (null no se cifra, y al descifrar la clave desaparece). En esta
// entidad eso afecta a meeting_pioneers/meeting_elders cuando son null
// ('' / false / [] sí sobreviven el viaje). Al reemplazar el registro
// entero, re-materializamos las claves ausentes para que lo guardado en
// Dexie tenga siempre la forma completa de CircuitVisitType.
export const normalizeCircuitVisit = (
  v: CircuitVisitType
): CircuitVisitType => ({
  ...v,
  _deleted: v._deleted ?? false,
  updatedAt: v.updatedAt ?? '',
  weekOf: v.weekOf ?? '',
  date_start: v.date_start ?? '',
  date_end: v.date_end ?? '',
  is_substitute: v.is_substitute ?? false,
  substitute_name: v.substitute_name ?? '',
  substitute_spouse_name: v.substitute_spouse_name ?? '',
  accounting_note: v.accounting_note ?? '',
  meals: v.meals ?? [],
  co_companions: v.co_companions ?? [],
  shepherding_visits: v.shepherding_visits ?? [],
  meeting_pioneers: v.meeting_pioneers ?? null,
  meeting_elders: v.meeting_elders ?? null,
});

/**
 * LWW por registro. Devuelve SOLO las filas que hay que escribir (bulkPut);
 * las filas donde gana la copia local no se devuelven (no se tocan).
 *
 * Reglas: registro remoto sin local → entra; remoto más nuevo → reemplaza
 * ENTERO al local; local más nuevo o igual (incluye empate exacto y ambos
 * sin sello) → se conserva el local intacto. Un remoto sin `updatedAt`
 * nunca pisa un local sellado; el formato ISO-8601 UTC de toISOString()
 * hace correcta la comparación lexicográfica.
 */
export const mergeCircuitVisits = (
  localData: CircuitVisitType[],
  remoteData: CircuitVisitType[]
): CircuitVisitType[] => {
  const dataToUpdate: CircuitVisitType[] = [];

  for (const remoteItem of remoteData) {
    if (!remoteItem?.id) continue;

    const localItem = localData.find((r) => r.id === remoteItem.id);

    if (!localItem) {
      dataToUpdate.push(normalizeCircuitVisit(remoteItem));
      continue;
    }

    const remoteAt = remoteItem.updatedAt || '';
    const localAt = localItem.updatedAt || '';

    if (remoteAt > localAt) {
      dataToUpdate.push(normalizeCircuitVisit(remoteItem));
    }
  }

  return dataToUpdate;
};
