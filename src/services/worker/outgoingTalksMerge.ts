import {
  OutgoingTalkExportScheduleType,
  OutgoingTalkScheduleType,
  SchedWeekType,
} from '@definition/schedules';
import { isSameRecord } from './merge';

// ── Fusión de los discursos salientes que manda el servidor ───────────────
// Los discursos salientes no viven en su propia tabla: se guardan dentro de
// la semana (`sched.weekend_meeting.outgoing_talks`). El servidor manda la
// lista completa de los que ha sincronizado y esto la reconcilia con lo que
// hay en el dispositivo, respetando dos cosas:
//
//  - Un discurso puesto A MANO (sin `synced`) no se toca jamás.
//  - Un discurso sincronizado que el servidor ya no manda se quita.
//
// Módulo puro (sin appDb) a propósito, igual que circuitVisitMerge: así se
// puede probar sin navegador. Devuelve SOLO las semanas que hay que escribir.
export const mergeOutgoingTalks = (
  schedules: SchedWeekType[],
  talks: OutgoingTalkExportScheduleType[]
): SchedWeekType[] => {
  if (!Array.isArray(talks)) return [];

  const byWeek = new Map(schedules.map((record) => [record.weekOf, record]));

  // Todas las modificaciones se hacen sobre UNA copia por semana, compartida
  // por los dos bucles. Antes el segundo bucle releía la semana de la base y
  // clonaba por cada discurso, con dos consecuencias: el borrado que acababa
  // de hacer el primer bucle se perdía, y si una misma semana traía dos
  // discursos, el último clon (que no sabía del anterior) se llevaba por
  // delante al primero — solo sobrevivía uno.
  const working = new Map<string, SchedWeekType>();

  const workingCopy = (weekOf: string) => {
    const existing = working.get(weekOf);

    if (existing) return existing;

    const original = byWeek.get(weekOf);

    if (!original) return undefined;

    const copy = structuredClone(original);
    working.set(weekOf, copy);

    return copy;
  };

  // Quitar los sincronizados que el servidor ya no manda. Las semanas
  // legadas/incompletas (sin weekend_meeting.outgoing_talks) se omiten: no
  // hay nada que quitar en ellas.
  for (const schedule of schedules) {
    const hasSynced = schedule.weekend_meeting?.outgoing_talks?.some(
      (talk) => talk.synced
    );

    if (!hasSynced) continue;

    const copy = workingCopy(schedule.weekOf);

    copy.weekend_meeting.outgoing_talks =
      copy.weekend_meeting.outgoing_talks.filter((localTalk) => {
        if (!localTalk.synced) return true; // los manuales se quedan

        return talks.some((remoteTalk) => remoteTalk.id === localTalk.id);
      });
  }

  // Añadir o actualizar lo que manda el servidor.
  for (const talk of talks) {
    const copy = workingCopy(talk.weekOf);

    if (!copy?.weekend_meeting) continue;

    // Sobre una copia del discurso: los tres campos que sobran se quitan de
    // lo que se guarda, no del objeto que ha llegado (que es de quien llama).
    const incoming = { ...talk };

    delete incoming.recipient;
    delete incoming.sender;
    delete incoming.weekOf;

    const toStore = incoming as OutgoingTalkScheduleType;

    if (!Array.isArray(copy.weekend_meeting.outgoing_talks)) {
      copy.weekend_meeting.outgoing_talks = [];
    }

    const localTalk = copy.weekend_meeting.outgoing_talks.find(
      (record) => record.id === talk.id
    );

    if (!localTalk) {
      copy.weekend_meeting.outgoing_talks.push(toStore);
      continue;
    }

    // Mismo criterio de siempre: solo gana el servidor si su marca es
    // estrictamente más nueva (empate = se queda lo local).
    const remoteUpdated = toStore.updatedAt || '';
    const localUpdated = localTalk.updatedAt || '';

    if (remoteUpdated > localUpdated) {
      copy.weekend_meeting.outgoing_talks = copy.weekend_meeting.outgoing_talks
        .filter((record) => record.id !== talk.id)
        .concat(toStore);
    }
  }

  const schedulesToUpdate: SchedWeekType[] = [];

  for (const [weekOf, copy] of working) {
    // Una semana que ha quedado exactamente como estaba no se escribe:
    // escribirla no cambiaría el dato pero redibujaría la pantalla entera.
    if (isSameRecord(byWeek.get(weekOf), copy)) continue;

    schedulesToUpdate.push(copy);
  }

  return schedulesToUpdate;
};
