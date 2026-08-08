import appDb from '@db/appDb';
import { DeptWeekType } from '@definition/departments_schedule';
import { store } from '@states/index';
import { fullnameState } from '@states/settings';

/**
 * Marca que hay programa de departamentos pendiente de subir.
 *
 * SU PROPIA MARCA, no la de los programas de las reuniones. Antes esto ponía
 * `schedules.send_local`, y de ahí salían dos fallos:
 *
 * 1. SE PERDÍA LO PUBLICADO, en silencio. La red que protege lo que se edita
 *    mientras el móvil sube compara el CONTENIDO de la tabla que lleva la marca
 *    (ver `nextExportState`). La marca decía `schedules` y la tabla que cambiaba
 *    era `departments_schedule`, así que publicar durante una subida no
 *    registraba ningún cambio: la marca se daba por enviada y el trabajo se
 *    quedaba en el dispositivo PARA SIEMPRE. Encaja con «lo publiqué y a un
 *    hermano no le salía»: sin el sello de publicado, quien no lleva
 *    departamentos no ve nada, y quien sí lo lleva ve su borrador igual — de ahí
 *    que a unos les saliera y a otros no.
 * 2. NO LLEGABA EL AVISO al hermano. El cálculo de a quién han cambiado la
 *    asignación (`affected_uids`) ya preguntaba por
 *    `departments_schedule?.send_local`, una marca que nadie ponía nunca: la
 *    comparación de departamentos no se hacía JAMÁS, así que un cambio ahí no
 *    generaba notificación para nadie.
 *
 * Y de paso, tocar departamentos ya no obliga a re-subir los 125 programas de
 * las reuniones enteros.
 *
 * Se construye la entrada aunque no exista: en un dispositivo que todavía no ha
 * bajado ningún programa de departamentos, la clave puede no estar, y sin esto
 * la marca no se pondría y no se subiría nada.
 */
const dbMarkDepartmentsPending = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.departments_schedule = {
    version: '',
    ...metadata.metadata.departments_schedule,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbDeptScheduleGet = async (weekOf: string) => {
  const schedule = await appDb.departments_schedule.get(weekOf);
  return schedule || null;
};

export const dbDeptScheduleSave = async (data: DeptWeekType) => {
  const fullname = store.get(fullnameState);
  data.updatedAt = new Date().toISOString();
  data.lastModifiedBy = fullname;

  await appDb.departments_schedule.put(data);
  await dbMarkDepartmentsPending();
};

export const dbDeptScheduleBulkSave = async (data: DeptWeekType[]) => {
  const fullname = store.get(fullnameState);
  const updatedAt = new Date().toISOString();

  for (const record of data) {
    record.updatedAt = updatedAt;
    record.lastModifiedBy = fullname;
  }

  await appDb.departments_schedule.bulkPut(data);
  await dbMarkDepartmentsPending();
};

export const dbDeptScheduleGetAll = async () => {
  const schedules = await appDb.departments_schedule.toArray();
  return schedules;
};
