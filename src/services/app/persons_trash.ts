import appDb from '@db/appDb';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { dbPersonsBulkSave } from '@services/dexie/persons';
import { dbFieldServiceReportsBulkSave } from '@services/dexie/cong_field_service_reports';
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
 * Qué informes se llevaría la norma de conservación EN CUANTO se restaure.
 *
 * No es una hipótesis: mientras la persona está en la papelera, `retention.ts`
 * se la salta (no está entre las vivas) y sus informes quedan congelados. Al
 * devolverla, vuelve a caer bajo la norma — y a un publicador inactivo la
 * norma solo le conserva el año de servicio de sus últimos informes. O sea que
 * restaurar a alguien que se fue hace años puede devolverle los informes y
 * quitárselos en la comprobación diaria del día siguiente.
 *
 * Se calcula ANTES de restaurar y se dice en pantalla. Una papelera que
 * devuelve unos datos y se los come sin avisar es peor que no tenerla.
 */
export const reportsPurgedOnRestore = (
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

  if (personReports.length === 0) return [];

  const plan = computeRetentionPlan(
    [restored],
    personReports,
    [],
    today
  );

  return plan.reportsToDelete.map((record) => record.report);
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
