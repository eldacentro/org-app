import { SchedWeekType } from '@definition/schedules';

/**
 * Copiar la congregación del orador dentro de la asignación.
 *
 * Vive aparte y sin Dexie A PROPÓSITO: escribe dentro de los programas, que es
 * la tabla que más disgustos ha dado en este repo, y tiene que poder
 * comprobarse sola. Quien la llama (`dbBackfillSpeakerCongregation`) solo pone
 * y quita datos de la base; las reglas de QUÉ se sella están aquí.
 */

/**
 * Sella la congregación en las dos partes del orador de una semana.
 *
 * Devuelve `true` si ha cambiado algo, para que quien llama pueda no guardar ni
 * pedir subir cuando no hay nada que hacer — guardar un registro idéntico
 * despierta la sincronización de toda la congregación para nada (CLAUDE.md).
 *
 * MUTA la semana que recibe: quien llama le pasa una copia.
 */
export const stampSpeakerCongregation = (
  week: SchedWeekType,
  nombrePorOrador: Map<string, string>
): boolean => {
  const partes = week?.weekend_meeting?.speaker;

  if (!partes || typeof partes !== 'object') return false;

  let tocado = false;

  for (const parte of Object.values(partes as Record<string, unknown>)) {
    const registros = Array.isArray(parte) ? parte : [parte];

    for (const registro of registros) {
      if (!registro || typeof registro !== 'object') continue;

      const record = registro as Record<string, unknown>;

      // Ya la tiene: NO se pisa. El relleno solo completa lo que falta; lo que
      // alguien haya escrito manda sobre lo que deduzca esto.
      if (typeof record.congregation === 'string') continue;

      const uid = record.value;

      if (typeof uid !== 'string' || uid.length === 0) continue;

      const nombre = nombrePorOrador.get(uid);

      if (!nombre) continue;

      record.congregation = nombre;
      tocado = true;
    }
  }

  return tocado;
};

/**
 * El nombre de congregación de cada orador, listo para sellar.
 *
 * Descarta en silencio todo lo que no sea texto legible, y ese es el punto
 * entero de la función: en un dispositivo SIN la llave maestra el catálogo de
 * oradores llega sin descifrar, y sus campos son texto cifrado o vienen
 * ausentes. Sellar eso metería basura dentro del programa —que viaja a TODA la
 * congregación— y es justo la forma del fallo que se le mandó sin querer a los
 * publicadores el 2026-08-08. Mejor sin congregación que con basura.
 */
export const buildSpeakerCongregationMap = (
  speakers: { person_uid?: unknown; speaker_data?: unknown }[],
  congregations: { id?: unknown; cong_data?: unknown }[]
): Map<string, string> => {
  const result = new Map<string, string>();

  const nombrePorCongId = new Map<string, string>();

  for (const cong of congregations ?? []) {
    if (typeof cong?.id !== 'string' || cong.id.length === 0) continue;

    const data = cong.cong_data as { cong_name?: unknown } | undefined;
    const name = data?.cong_name;

    const value =
      name && typeof name === 'object'
        ? (name as { value?: unknown }).value
        : name;

    if (typeof value !== 'string' || value.trim().length === 0) continue;

    nombrePorCongId.set(cong.id, value);
  }

  for (const speaker of speakers ?? []) {
    const uid = speaker?.person_uid;

    if (typeof uid !== 'string' || uid.length === 0) continue;

    const data = speaker.speaker_data as { cong_id?: unknown } | undefined;
    const congId = data?.cong_id;

    if (typeof congId !== 'string' || congId.length === 0) continue;

    const nombre = nombrePorCongId.get(congId);

    if (!nombre) continue;

    result.set(uid, nombre);
  }

  return result;
};
