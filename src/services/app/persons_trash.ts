import appDb from '@db/appDb';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import {
  dbPersonsBulkSave,
  dbPersonsMarkSendLocal,
} from '@services/dexie/persons';
import { dbFieldServiceReportsBulkSave } from '@services/dexie/cong_field_service_reports';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { computeRetentionPlan } from './retention';

/**
 * LA PAPELERA DE PERSONAS.
 *
 * ── Qué es borrar aquí ───────────────────────────────────────────────────
 *
 * Borrar a una persona en esta app no borra nada: pone una LÁPIDA
 * (`_deleted: { value: true, updatedAt }`) y el registro se queda entero en
 * `persons`, solo que fuera de todas las listas. Nada lo retira nunca —ni la
 * norma de conservación (`retention.ts`, que se salta a los borrados), ni
 * ningún `cleanup`, ni el servidor, que guarda el fichero de personas tal cual
 * se lo suben—. O sea que todo lo que se ha "eliminado" desde siempre sigue
 * ahí; lo único que faltaba era una pantalla que lo enseñara.
 *
 * Sus INFORMES tampoco se borran: se quedan vivos y HUÉRFANOS, apuntando con
 * `person_uid` a alguien que ya no sale por ninguna parte. Por eso restaurar a
 * la persona basta, casi siempre, para que vuelvan sus informes solos. Aun
 * así se restauran también los que sí tengan lápida, que es la mitad que de
 * verdad hacía falta el día que esto se pidió.
 *
 * ── Por qué hay que RESELLAR la fecha al restaurar ───────────────────────
 *
 * La fusión de la sincronización resuelve `_deleted` por `updatedAt`: gana el
 * más nuevo, y reemplaza el objeto entero. En el servidor está el BORRADO, con
 * su fecha. Si al restaurar se dejara la fecha vieja —o se pusiera una
 * anterior— la lápida del servidor volvería a ganar en el ciclo siguiente y la
 * persona desaparecería otra vez, sin que nadie entendiera por qué. De ahí que
 * `planRestore` exija la hora de AHORA y la escriba en todo lo que toca.
 *
 * Y en los informes se escribe además `rev`, la copia EN CLARO de `updatedAt`:
 * es por donde el servidor compara informe a informe (el `updatedAt` de verdad
 * viaja cifrado). Sin ella el servidor se queda con su versión —la borrada— y
 * la restauración no sale del dispositivo. `dbFieldServiceReportsBulkSave` ya
 * lo hace por su cuenta; se pone aquí también para que la prueba lo vea.
 */

export type TrashEntry = {
  person: PersonType;
  /** Cuándo se puso la lápida (ISO). */
  deletedAt: string;
  /** `person_uid` de quien la puso, o '' si se borró antes de que se anotara. */
  deletedBy: string;
  /** Informes suyos que siguen vivos (huérfanos mientras esté en la papelera). */
  reportsAlive: number;
  /** Informes suyos que también tienen lápida y volverían al restaurar. */
  reportsDeleted: number;
};

/**
 * Lo que hay en la papelera, lo más reciente primero.
 *
 * Se cuentan los informes de cada uno para poder decir en la tarjeta qué se
 * recupera exactamente — «y sus 34 informes» es la frase que contesta a la
 * pregunta por la que se abre esta pantalla.
 */
export const buildTrashEntries = (
  persons: PersonType[],
  reports: CongFieldServiceReportType[]
): TrashEntry[] => {
  const deleted = persons.filter((person) => person._deleted?.value);

  if (deleted.length === 0) return [];

  const alive = new Map<string, number>();
  const buried = new Map<string, number>();

  for (const report of reports) {
    const uid = report.report_data.person_uid;
    const target = report.report_data._deleted ? buried : alive;

    target.set(uid, (target.get(uid) ?? 0) + 1);
  }

  return deleted
    .map((person) => ({
      person,
      deletedAt: person._deleted.updatedAt ?? '',
      deletedBy: person._deleted.by ?? '',
      reportsAlive: alive.get(person.person_uid) ?? 0,
      reportsDeleted: buried.get(person.person_uid) ?? 0,
    }))
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
};

/**
 * Qué se escribe para devolver a alguien de la papelera.
 *
 * Puro a propósito: es el código que decide si unos datos existen o no, y así
 * se puede probar entero sin base de datos. Quien lo llama solo guarda lo que
 * salga de aquí.
 *
 * **Se busca por IDENTIFICADOR, nunca por texto.** El nombre de una persona
 * aparece dentro de los registros de otras (cabezas de familia, contactos de
 * emergencia, oradores), así que casar por nombre devolvería a quien no toca —
 * y en una papelera, restaurar a quien no toca es justo el fallo que no puede
 * pasar.
 */
export const planRestore = (
  person: PersonType,
  reports: CongFieldServiceReportType[],
  now: string
) => {
  const restored = structuredClone(person);
  restored._deleted = { value: false, updatedAt: now };

  const reportsToRestore = reports
    .filter(
      (report) =>
        report.report_data.person_uid === person.person_uid &&
        report.report_data._deleted
    )
    .map((report) => {
      const record = structuredClone(report);
      record.report_data._deleted = false;
      record.report_data.updatedAt = now;
      record.report_data.rev = now;

      return record;
    });

  return { person: restored, reports: reportsToRestore };
};

/**
 * Qué se llevaría la norma de conservación EN CUANTO se restaure.
 *
 * No es una hipótesis: mientras la persona está en la papelera, `retention.ts`
 * se la salta (no está entre las vivas) y sus informes quedan congelados. Al
 * devolverla, vuelve a caer bajo la norma — y a un publicador inactivo la
 * norma solo le conserva el año de servicio de sus últimos informes. O sea que
 * restaurar a alguien que se fue hace años puede devolverle los informes y
 * quitárselos en la comprobación diaria del día siguiente.
 *
 * Cuenta también los NOMBRAMIENTOS cerrados (precursorados), que la misma
 * norma retira con el mismo criterio: son parte del registro del publicador y
 * dejarlos fuera del aviso sería prometer de más.
 *
 * Se calcula ANTES de restaurar y se dice en pantalla. Una papelera que
 * devuelve unos datos y se los come sin avisar es peor que no tenerla.
 */
export const purgedOnRestore = (
  person: PersonType,
  reports: CongFieldServiceReportType[],
  today = new Date()
) => {
  const { person: restored, reports: revived } = planRestore(
    person,
    reports,
    person._deleted?.updatedAt ?? ''
  );

  const revivedIds = new Set(revived.map((record) => record.report_id));

  const personReports = reports
    .filter((report) => report.report_data.person_uid === person.person_uid)
    .map((report) =>
      revivedIds.has(report.report_id)
        ? revived.find((record) => record.report_id === report.report_id)
        : report
    )
    .filter((report) => !report.report_data._deleted);

  // Sin un solo informe vivo, `computeRetentionPlan` sale antes de mirar nada
  // —incluidos los nombramientos, que recorre dentro del bucle de informes—,
  // así que aquí tampoco hay nada que avisar.
  if (personReports.length === 0) return { reports: 0, enrollments: 0 };

  const plan = computeRetentionPlan([restored], personReports, [], today);

  return {
    reports: plan.reportsToDelete.length,
    enrollments: plan.enrollmentsToDelete.length,
  };
};

/**
 * Devuelve a una persona de la papelera, con sus informes.
 *
 * Los cuatro pasos que hacen falta para que salga del dispositivo y no vuelva
 * a desaparecer en la siguiente sincronización:
 *
 *   1. quitar la lápida,
 *   2. sellar con la hora de AHORA (si no, gana el borrado del servidor),
 *   3. marcar `persons` y `cong_field_service_reports` como `send_local`,
 *   4. poner `rev` al día en los informes.
 *
 * Los pasos 3 y 4 los ponen ya `dbPersonsBulkSave` y
 * `dbFieldServiceReportsBulkSave`, que es justo la razón de pasar por ellos y
 * no escribir en Dexie a pelo.
 */
export const restorePersonFromTrash = async (person_uid: string) => {
  const person = await appDb.persons.get(person_uid);

  if (!person) {
    throw new Error('No se ha encontrado a esa persona en este dispositivo.');
  }

  if (!person._deleted?.value) {
    return { person, reportsRestored: 0 };
  }

  const reports = await appDb.cong_field_service_reports.toArray();

  const plan = planRestore(person, reports, new Date().toISOString());

  await dbPersonsBulkSave([plan.person]);

  if (plan.reports.length > 0) {
    await dbFieldServiceReportsBulkSave(plan.reports);
  }

  return { person: plan.person, reportsRestored: plan.reports.length };
};

/**
 * Qué se escribe para BORRAR PARA SIEMPRE a quien está en la papelera.
 *
 * Puro, como `planRestore`, y por el mismo motivo: decide si unos datos dejan
 * de existir, y eso hay que poder probarlo sin base de datos.
 *
 * Dos tratos distintos porque el servidor guarda cada tabla de una manera:
 *
 * - **La persona se retira de verdad.** La tabla de personas se sube ENTERA y
 *   el servidor reemplaza el fichero con lo que le llega, así que quitar la
 *   fila aquí la quita también de allí.
 * - **Sus informes se marcan con lápida**, no se retiran. Los informes se
 *   fusionan registro a registro en el servidor (`saveReportsMerging`): una
 *   fila que se quita del dispositivo no le dice nada al servidor y volvería a
 *   bajar en el ciclo siguiente. La lápida sí viaja.
 *
 * Y NUNCA se toca a quien no tenga ya la lápida puesta: borrar para siempre es
 * una operación sobre la papelera, no un atajo para saltarse el paso previo.
 */
export const planPurge = (
  persons: PersonType[],
  reports: CongFieldServiceReportType[],
  uids: string[],
  now: string
) => {
  const wanted = new Set(uids);

  const toRemove = persons
    .filter((person) => wanted.has(person.person_uid) && person._deleted?.value)
    .map((person) => person.person_uid);

  const removing = new Set(toRemove);

  const reportsToBury = reports
    .filter(
      (report) =>
        removing.has(report.report_data.person_uid) &&
        !report.report_data._deleted
    )
    .map((report) => {
      const record = structuredClone(report);
      record.report_data._deleted = true;
      record.report_data.updatedAt = now;
      record.report_data.rev = now;

      return record;
    });

  return { personUids: toRemove, reports: reportsToBury };
};

/**
 * Aplica la lista de borrados definitivos a lo que haya en este dispositivo.
 *
 * Corre en CADA sincronización, después de bajar personas, y es lo que hace
 * que un borrado definitivo se propague sin inventarse nada: no deduce el
 * borrado de una ausencia —que es como se pierden datos—, sino que retira
 * exactamente los identificadores que alguien puso en la lista.
 *
 * Es idempotente y se cura sola: si un dispositivo que llevaba semanas sin
 * abrirse vuelve a subir su tabla entera y resucita a alguien, al ciclo
 * siguiente todos —incluido él— lo vuelven a retirar.
 *
 * No escribe nada si no hay nada que retirar: una escritura en `persons`
 * despierta a `useLiveQuery` y redibuja la pantalla entera.
 */
export const applyPersonsPurge = async () => {
  const settings = await appDb.app_settings.get(1);

  const uids = settings?.cong_settings?.persons_purged?.value ?? [];

  if (uids.length === 0) return { persons: 0, reports: 0 };

  const wanted = new Set(uids);

  const persons = await appDb.persons.toArray();
  const present = persons.filter((person) => wanted.has(person.person_uid));

  const reports = await appDb.cong_field_service_reports.toArray();
  const pending = reports.filter(
    (report) =>
      wanted.has(report.report_data.person_uid) && !report.report_data._deleted
  );

  if (present.length === 0 && pending.length === 0) {
    return { persons: 0, reports: 0 };
  }

  const now = new Date().toISOString();

  if (present.length > 0) {
    await appDb.persons.bulkDelete(present.map((person) => person.person_uid));
  }

  if (pending.length > 0) {
    const buried = pending.map((report) => {
      const record = structuredClone(report);
      record.report_data._deleted = true;
      record.report_data.updatedAt = now;
      record.report_data.rev = now;

      return record;
    });

    await dbFieldServiceReportsBulkSave(buried);
  }

  return { persons: present.length, reports: pending.length };
};

/**
 * Borra para siempre a quien se le pase, y lo apunta para que se borre también
 * en los demás dispositivos.
 *
 * El orden importa: primero la LISTA y después las filas. Si se cayera la app
 * entre las dos cosas, quedaría apuntado un borrado que aún no se ha hecho —y
 * `applyPersonsPurge` lo termina en la siguiente vuelta—, que es el lado bueno
 * del fallo. Al revés quedarían unas filas retiradas sin nadie que se lo
 * cuente al resto, y volverían.
 */
export const purgePersonsForever = async (uids: string[]) => {
  const persons = await appDb.persons.toArray();
  const reports = await appDb.cong_field_service_reports.toArray();

  const plan = planPurge(persons, reports, uids, new Date().toISOString());

  if (plan.personUids.length === 0) return { persons: 0, reports: 0 };

  const settings = await appDb.app_settings.get(1);
  const already = settings?.cong_settings?.persons_purged?.value ?? [];

  await dbAppSettingsUpdate({
    'cong_settings.persons_purged': {
      value: [...new Set([...already, ...plan.personUids])],
      updatedAt: new Date().toISOString(),
    },
  });

  await appDb.persons.bulkDelete(plan.personUids);
  await dbPersonsMarkSendLocal();

  if (plan.reports.length > 0) {
    await dbFieldServiceReportsBulkSave(plan.reports);
  }

  return { persons: plan.personUids.length, reports: plan.reports.length };
};
