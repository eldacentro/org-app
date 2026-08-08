import { SchedWeekType } from '@definition/schedules';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { FullnameOption } from '@definition/settings';
import { speakerGetDisplayName } from '@utils/common';

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
export const stampSpeakerInfo = (
  week: SchedWeekType,
  congregacionPorOrador: Map<string, string>,
  nombrePorOrador?: Map<string, string>
): boolean => {
  const partes = week?.weekend_meeting?.speaker;

  if (!partes || typeof partes !== 'object') return false;

  let tocado = false;

  for (const parte of Object.values(partes as Record<string, unknown>)) {
    const registros = Array.isArray(parte) ? parte : [parte];

    for (const registro of registros) {
      if (!registro || typeof registro !== 'object') continue;

      const record = registro as Record<string, unknown>;

      const uid = record.value;

      if (typeof uid !== 'string' || uid.length === 0) continue;

      // LA CONGREGACIÓN. Si ya la tiene NO se pisa: el relleno solo completa lo
      // que falta, y lo que alguien haya escrito manda sobre lo que deduzca
      // esto.
      if (typeof record.congregation !== 'string') {
        const cong = congregacionPorOrador.get(uid);

        if (cong) {
          record.congregation = cong;
          tocado = true;
        }
      }

      // EL NOMBRE, por el mismo motivo y con el mismo criterio. En los datos
      // reales de la congregación la mayoría de los oradores del catálogo se
      // guardaron con `name: ''`, y ese campo es el ÚNICO por el que un
      // publicador puede saber quién da el discurso: el catálogo va cifrado con
      // la llave maestra y él no la tiene. Sin esto, a él la línea le sale
      // vacía aunque el orador esté puesto.
      //
      // Vacío cuenta como ausente, que es justo el caso a reparar; una cadena
      // con algo escrito se respeta.
      if (typeof record.name !== 'string' || record.name.length === 0) {
        const nombre = nombrePorOrador?.get(uid);

        if (nombre) {
          record.name = nombre;
          tocado = true;
        }
      }
    }
  }

  return tocado;
};

/**
 * El nombre con el que hay que escribir a cada orador dentro del programa.
 *
 * Se compone igual que al asignarlo a mano (`speakerGetDisplayName`), para que
 * el relleno no escriba un nombre con otra forma que el resto. Y se descarta lo
 * que salga vacío, por lo mismo que en el mapa de congregaciones: un catálogo
 * sin descifrar no tiene nombres legibles, y meter basura dentro del programa es
 * peor que dejar el hueco.
 */
export const buildSpeakerNameMap = (
  speakers: VisitingSpeakerType[],
  fullnameOption: FullnameOption
): Map<string, string> => {
  const result = new Map<string, string>();

  for (const speaker of speakers ?? []) {
    const uid = speaker?.person_uid;

    if (typeof uid !== 'string' || uid.length === 0) continue;

    let nombre = '';

    try {
      // `displayNameEnabled` va en falso a propósito: en esta aplicación ese
      // ajuste está fijo en falso, y el nombre sale siempre del nombre completo.
      nombre = speakerGetDisplayName(speaker, false, fullnameOption);
    } catch {
      // Un registro sin descifrar no tiene los campos donde se los busca.
      continue;
    }

    if (typeof nombre !== 'string' || nombre.trim().length === 0) continue;

    result.set(uid, nombre);
  }

  return result;
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
