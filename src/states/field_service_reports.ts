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
