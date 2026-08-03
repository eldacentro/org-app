/*
This file holds the source of the truth from the table "fieldServiceReports".
*/

import { atom } from 'jotai';
import {
  CongFieldServiceReportType,
  PersonFilterOption,
  ReportStatusFilterOption,
} from '@definition/cong_field_service_reports';
import { congFieldServiceReportSchema } from '@services/dexie/schema';
import { buildMinistryMonthsIndex } from '@services/app/publisher_status';
import { retentionServiceYears, serviceYearOfMonth } from '@utils/date';
import { congRoleState, isElderState, userLocalUIDState } from './settings';
import { delegatedFieldServiceReportsState } from './delegated_field_service_reports';

export const fieldServiceReportsState = atom<CongFieldServiceReportType[]>([]);

export const congFieldServiceReportsState = atom((get) => {
  const reports = get(fieldServiceReportsState);

  const results = reports.filter(
    (record) => record.report_data._deleted === false
  );

  return results;
});

/**
 * Meses con participación en la predicación, por persona. Es lo único que
 * necesita la regla de publicador activo/inactivo (publisher_status.ts), y se
 * calcula UNA vez por cambio de informes en lugar de una vez por cada tarjeta,
 * filtro o grupo que pregunte.
 */
export const ministryMonthsState = atom((get) =>
  buildMinistryMonthsIndex(get(congFieldServiceReportsState))
);

/**
 * ¿Puede ESTE dispositivo saber quién está activo y quién no?
 *
 * La regla de publicador activo mira si alguien ha participado en la
 * predicación en los últimos seis meses. Para contestarla hacen falta los
 * meses de participación de TODA la congregación, y no todo el mundo los tiene.
 *
 * Dos maneras de tenerlos, y las dos valen:
 *
 * 1. **Por el rol.** A quien lleva los informes —anciano, superintendente de
 *    grupo o de grupo de idioma— el servidor le manda los informes completos.
 *    Se calca de `reportEditorRole` del backend (`services/api/users.ts`), que
 *    es quien lo decide de verdad.
 *
 * 2. **Por el dato.** Desde el 3 de agosto el servidor le manda además a
 *    cualquier publicador, de los demás hermanos, SOLO en qué meses
 *    participaron: ni horas, ni cursos, ni comentarios. Con eso la misma regla
 *    se aplica igual en su móvil.
 *
 * El segundo camino se comprueba mirando el dato y no el rol, y eso es a
 * propósito: mientras el servidor nuevo no esté desplegado —o mientras no
 * llegue el primer ciclo de sincronización— el móvil sigue teniendo solo los
 * informes propios, y ahí «¿ha participado Fulano?» no es «no», es «no lo sé».
 * Contestando que no se escondía a la congregación entera de Grupos de
 * predicación y quedaban a la vista dos o tres personas: justo el fallo del 3
 * de agosto. Cuando no se sabe, se enseña.
 *
 * Se mira si el índice conoce a ALGUIEN de fuera del círculo propio —uno mismo
 * y aquellos por los que informa—, que es la diferencia exacta entre el envío
 * viejo y el nuevo. No es un umbral a ojo.
 */
export const congregationReportsAvailableState = atom((get) => {
  const isElder = get(isElderState);
  const userRole = get(congRoleState);

  const porRol =
    isElder ||
    userRole.includes('group_overseers') ||
    userRole.includes('language_group_overseers');

  if (porRol) return true;

  const propio = get(userLocalUIDState);
  const delegados = get(delegatedFieldServiceReportsState);

  const circulo = new Set<string>([propio]);
  for (const record of delegados ?? []) {
    const uid = record?.report_data?.person_uid;
    if (uid) circulo.add(String(uid));
  }

  const index = get(ministryMonthsState);

  for (const uid of index.keys()) {
    if (!circulo.has(uid)) return true;
  }

  return false;
});

/**
 * Los años de servicio que hay que ofrecer para mirar informes.
 *
 * La ventana de conservación (año en curso y anterior) siempre, porque es
 * donde se escribe. Y además cualquier año más antiguo que TODAVÍA conserve
 * algún informe: a un publicador que se quedó inactivo se le guarda el año en
 * que lo hizo, y ese puede quedar fuera de la ventana. Así no se esconde nada
 * y no sobra nada.
 *
 * Antes se pedían cuatro años a secas y salían 2023 y 2024 vacíos, con la
 * purga diaria habiéndoselos llevado ya.
 */
export const serviceYearsWithReportsState = atom((get) => {
  const reports = get(congFieldServiceReportsState);

  const years = new Set(retentionServiceYears());

  for (const report of reports) {
    const month = report.report_data?.report_date;

    if (month) years.add(serviceYearOfMonth(month));
  }

  return [...years].sort();
});

export const selectedMonthFieldServiceReportState = atom<string>();

export const personFilterFieldServiceReportState =
  atom<PersonFilterOption>('active');

export const reportStatusFilterFieldServiceReportState =
  atom<ReportStatusFilterOption>('');

export const selectedPublisherReportState = atom<string>();

export const personSearchFieldServiceReportState = atom<string>('');

export const publisherCurrentReportState = atom(
  structuredClone(congFieldServiceReportSchema)
);
