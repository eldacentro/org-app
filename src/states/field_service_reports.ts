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
