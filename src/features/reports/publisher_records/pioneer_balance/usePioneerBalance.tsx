import {
  monthlyCreditedTotal,
  rawCreditHours,
} from '@services/app/credit_hours';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { currentServiceYear } from '@utils/date';
import { buildPersonFullname } from '@utils/common';
import { personsActiveState } from '@states/persons';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { fullnameOptionState } from '@states/settings';
import usePerson from '@features/persons/hooks/usePerson';

export type PioneerBalanceItem = {
  person_uid: string;
  name: string;
  balance: number;
};

const usePioneerBalance = () => {
  const { personIsEnrollmentActive, personIsEnrollmentYearActive } =
    usePerson();

  const persons = useAtomValue(personsActiveState);
  const congReports = useAtomValue(congFieldServiceReportsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const year = useMemo(() => currentServiceYear(), []);

  const start_month = useMemo(() => `${+year - 1}/09`, [year]);
  const end_month = useMemo(() => `${year}/08`, [year]);

  const pioneers = useMemo(() => {
    // Mismo cálculo de saldo que cada precursor regular ve en su propia
    // página de Predicación (usePioneerStats): por cada mes con informe en
    // que estuvo de precursor, horas (predicación + crédito) menos la meta
    // de 50 — solo que aquí se calcula desde los informes de congregación,
    // que es lo que los ancianos tienen de los demás.
    const result: PioneerBalanceItem[] = [];

    for (const person of persons) {
      const isFR = personIsEnrollmentYearActive(person, 'FR', year);

      if (!isFR) continue;

      const reports = congReports.filter(
        (record) =>
          record.report_data.person_uid === person.person_uid &&
          record.report_data.report_date >= start_month &&
          record.report_data.report_date <= end_month
      );

      let balance = 0;

      for (const report of reports) {
        const isFRMonth = personIsEnrollmentActive(
          person,
          'FR',
          report.report_data.report_date
        );

        if (!isFRMonth) continue;

        // CON EL TOPE DEL MES: la predicación cuenta entera y el crédito solo
        // lo que quepa hasta 55. Este balance es el que mira el comité de
        // servicio, así que sumar el crédito en bruto le daba de más. Ver
        // `credit_hours.ts`.
        const totalHours = monthlyCreditedTotal(
          report.report_data.hours.field_service,
          rawCreditHours(report.report_data.hours.credit)
        );

        balance += totalHours - 50;
      }

      result.push({
        person_uid: person.person_uid,
        name: buildPersonFullname(
          person.person_data.person_lastname.value,
          person.person_data.person_firstname.value,
          fullnameOption
        ),
        balance,
      });
    }

    // Los que van por debajo primero — es lo que el comité de servicio
    // necesita detectar de un vistazo.
    return result.sort((a, b) => a.balance - b.balance);
  }, [
    persons,
    congReports,
    year,
    start_month,
    end_month,
    fullnameOption,
    personIsEnrollmentActive,
    personIsEnrollmentYearActive,
  ]);

  return { pioneers, year };
};

export default usePioneerBalance;
