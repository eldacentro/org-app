/**
 * Núcleo de la fusión de datos que llega del servidor.
 *
 * Vive aparte del resto del worker A PROPÓSITO: aquí no se toca la base de
 * datos ni la red, así que se puede probar de verdad, sin navegador. Es el
 * punto donde este proyecto ya ha perdido datos más de una vez, así que
 * cualquier cambio aquí debería venir acompañado de una prueba que describa el
 * comportamiento esperado (ver merge.test.ts).
 *
 * REGLAS que implementa (y que las pruebas fijan):
 *  - Lo más nuevo gana, comparando el `updatedAt` de cada registro.
 *  - Un registro que solo existe en el servidor se añade.
 *  - Un registro que solo existe en local NO se borra: quitarlo es cosa de las
 *    marcas de borrado (`_deleted`), no de la fusión.
 *  - Sin `updatedAt` no hay forma de decidir, así que se fusiona campo a campo
 *    bajando un nivel.
 *
 * Aquí vive además `isSameRecord`, que responde a la otra pregunta del ciclo:
 * una vez fusionado, ¿hace falta guardarlo? Ver su comentario más abajo. Y
 * `buildMetadataRecord`, que arma el registro de versiones con el que se cierra
 * cada sincronización.
 */

import { MetadataRecordType } from '@definition/metadata';

export const syncFromRemote = <T extends object>(local: T, remote: T): T => {
  const arrayKeys = Object.keys(remote).filter(
    (key) => remote[key] !== null && Array.isArray(remote[key])
  );

  // 'id' must win when present: it's the only key guaranteed unique for
  // dynamic, repeatable lists like weekend_meeting.outgoing_talks (multiple
  // records can legitimately share the same 'type', e.g. the same dataView).
  // Fixed-slot records (chairman, opening_prayer, etc.) have no 'id' and
  // fall through to 'type' as before.
  const lockKeys = ['id', 'type', 'talk_number'];

  for (const key of arrayKeys) {
    if (!local[key]) {
      local[key] = remote[key];
      continue;
    }

    if (!Array.isArray(local[key])) {
      local[key] = remote[key];
      continue;
    }

    for (const remoteValue of remote[key]) {
      if (typeof remoteValue !== 'object') {
        continue;
      }

      for (const lockKey of lockKeys) {
        if (lockKey in remoteValue) {
          const localValue = local[key].find(
            (r) => r[lockKey] === remoteValue[lockKey]
          );

          if (!localValue) {
            local[key].push(remoteValue);
          } else {
            if ('updatedAt' in localValue) {
              if (
                !localValue.updatedAt ||
                remoteValue.updatedAt > localValue.updatedAt
              ) {
                Object.assign(localValue, remoteValue);
              }
            } else if ('updatedAt' in remoteValue) {
              Object.assign(localValue, remoteValue);
            }

            if (!('updatedAt' in localValue)) {
              syncFromRemote(localValue, remoteValue);
            }
          }

          break;
        }
      }
    }
  }

  const objectKeys = Object.keys(remote).filter(
    (key) =>
      remote[key] !== null &&
      !Array.isArray(remote[key]) &&
      typeof remote[key] === 'object'
  );

  for (const key of objectKeys) {
    if (local[key]) {
      if ('updatedAt' in remote[key]) {
        if (
          !local[key].updatedAt ||
          remote[key].updatedAt > local[key].updatedAt
        ) {
          local[key] = remote[key];
        }
      } else {
        syncFromRemote(local[key], remote[key]);
      }
    } else {
      local[key] = remote[key];
    }
  }

  const primitiveKeys = Object.keys(remote).filter(
    (key) => typeof remote[key] !== 'object'
  );

  for (const key of primitiveKeys) {
    // Un `undefined` del otro lado NUNCA borra lo que hay aquí. Por la red no
    // puede llegar (el JSON no transporta undefined), pero en memoria sí, y
    // este proyecto ya tuvo un incidente por escribir undefined en tablas
    // sincronizadas. Para vaciar un campo se escribe '' o null, que sí viajan
    // y sí se comparan.
    if (remote[key] === undefined) continue;

    local[key] = remote[key];
  }

  return local;
};

// Un objeto "llano" es el que se sabe comparar campo a campo: lo que sale de
// JSON.parse / structuredClone de datos sincronizados. Cualquier otra cosa
// (Date, Map, Blob, ArrayBuffer…) se declara DISTINTA aunque quizá no lo sea:
// equivocarse hacia "distinto" solo cuesta una escritura de más; equivocarse
// hacia "igual" se tragaría un cambio real.
const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * ¿Son el mismo dato, campo a campo?
 *
 * Sirve para NO escribir en la base local un registro que ya está guardado
 * exactamente igual: la escritura no cambiaría nada, pero sí despierta a los
 * observadores de la tabla (`useLiveQuery`), que entregan un array nuevo y
 * redibujan la pantalla entera — el parpadeo "solo, cada pocos minutos".
 *
 * Es deliberadamente ESTRICTA: en cuanto hay la menor duda responde que son
 * distintos, y entonces todo sigue como antes (se escribe).
 *  - El orden de una lista cuenta: reordenar es un cambio real.
 *  - Una clave que existe con valor `undefined` NO es lo mismo que no existir.
 *  - Nada de conversiones: 1 y '1' son distintos.
 */
export const isSameRecord = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;

  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);

  if (aIsArray !== bIsArray) return false;

  if (aIsArray) {
    const listA = a as unknown[];
    const listB = b as unknown[];

    if (listA.length !== listB.length) return false;

    for (let i = 0; i < listA.length; i++) {
      if (!isSameRecord(listA[i], listB[i])) return false;
    }

    return true;
  }

  if (!isPlainObject(a) || !isPlainObject(b)) return false;

  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;

  const keysA = Object.keys(recordA);
  const keysB = Object.keys(recordB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(recordB, key)) return false;
    if (!isSameRecord(recordA[key], recordB[key])) return false;
  }

  return true;
};

/**
 * ¿Tiene una tabla exactamente este contenido?
 *
 * Para las tablas DERIVADAS, las que se reconstruyen enteras (`clear()` +
 * `bulkPut()`) a partir de las traducciones: tipos de semana, asignaciones,
 * discursos públicos y canciones. Se rehacían al terminar CADA
 * sincronización, y aunque el resultado fuera idéntico letra por letra, el
 * borrado y la reescritura despertaban a `useLiveQuery` y redibujaban las
 * páginas densas — el mismo parpadeo, por otra puerta.
 *
 * El orden NO cuenta aquí (a diferencia de `isSameRecord`): se compara por
 * clave primaria, porque una tabla no tiene orden propio — Dexie devuelve las
 * filas ordenadas por su clave, y quien reconstruye la lista las genera en el
 * orden que le sale. Comparar posición a posición diría "distinto" siempre.
 *
 * `next` se compara tal y como lo guardaría `bulkPut`: si una clave se
 * repite, gana la última.
 */
export const isSameTableContent = <T extends object>(
  current: T[],
  next: T[],
  keyField: keyof T & string
): boolean => {
  const nextByKey = new Map<unknown, T>();

  for (const row of next) {
    nextByKey.set(row[keyField], row);
  }

  // `current` sale de la base, así que sus claves son únicas: si hay tantas
  // filas como claves distintas traería `bulkPut` y todas casan, el contenido
  // es el mismo.
  if (nextByKey.size !== current.length) return false;

  for (const row of current) {
    const candidate = nextByKey.get(row[keyField]);

    if (!candidate) return false;
    if (!isSameRecord(row, candidate)) return false;
  }

  return true;
};

/**
 * El registro de versiones que cierra cada sincronización.
 *
 * Toma las versiones que acaba de confirmar el servidor y las mezcla sobre las
 * que ya había, conservando el `send_local` de cada categoría (esa marca es
 * local: dice que este dispositivo aún tiene algo pendiente de subir).
 *
 * CUIDADO con lo que devuelve: quien lo guarda usa `put`, que reemplaza el
 * registro ENTERO. Por eso se arrastra `...oldMetadata`. El registro de
 * metadata lleva además campos SUELTOS, fuera de `metadata` —las marcas de
 * "reemplazo forzado ya aplicado" (`schedules_reset_applied` y hermanas)—, y
 * devolver solo `{ id, metadata }` las borraba en cada ciclo. Como el servidor
 * manda esas marcas de reset en TODAS sus respuestas (no solo la primera vez),
 * borrarlas equivalía a no haberlas aplicado nunca: el reemplazo forzado se
 * repetía en cada sincronización, pisando una y otra vez las ediciones locales
 * de programas y oradores.
 */
export const buildMetadataRecord = (
  oldMetadata: MetadataRecordType | undefined,
  versions: Record<string, string>
): MetadataRecordType => {
  // Copia en vez de mutar el registro leído: así se puede comparar el antes con
  // el después (isSameRecord) y no escribir cuando el sync no ha traído ninguna
  // versión nueva — el caso normal cuando nadie ha tocado nada.
  const metadata = { ...(oldMetadata?.metadata || {}) };

  for (const [key, value] of Object.entries(versions)) {
    metadata[key] = {
      version: value,
      send_local: metadata[key]?.send_local || false,
    };
  }

  return { ...oldMetadata, id: oldMetadata?.id || 1, metadata };
};

export const getObjectLatestUpdate = (obj: unknown) => {
  let latest = '';

  const traverse = (current: unknown) => {
    if (!current || typeof current !== 'object') return;
    const record = current as Record<string, unknown>;
    for (const key in record) {
      const val = record[key];
      if (key === 'updatedAt' && typeof val === 'string') {
        if (val > latest) {
          latest = val;
        }
      } else if (val !== null && typeof val === 'object') {
        traverse(val);
      }
    }
  };

  traverse(obj);
  return latest;
};
