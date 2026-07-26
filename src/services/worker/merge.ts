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
 */

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
