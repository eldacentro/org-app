import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { branchSelectedMonthState } from '@states/branch_reports';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { personsState } from '@states/persons';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import {
  buildS1CategoryOf,
  collectS1Reports,
  S1Data,
  s1Totals,
} from '@services/app/late_reports';
import usePerson from '@features/persons/hooks/usePerson';
import usePersons from '@features/persons/hooks/usePersons';
import useMeetingAttendance from '@features/reports/meeting_attendance/hooks/useMeetingAttendance';

/**
 * El S-1 del mes elegido calculado con los datos de AHORA.
 *
 * Lo usan las tres piezas que tienen que decir lo mismo: «Generar» (que lo
 * guarda), la pantalla (que avisa si lo guardado se ha quedado viejo) y
 * «Enviado» (que marca como enviados justo los atrasados que se sumaron). Antes
 * cada una tenía su propio filtro, y no coincidían: al enviar se marcaban
 * atrasados que el S-1 no había sumado.
 */
const useS1Live = () => {
  const { personIsEnrollmentActive } = usePerson();

  const { getPublishersActive } = usePersons();

  const month = useAtomValue(branchSelectedMonthState);
  const congReports = useAtomValue(congFieldServiceReportsState);
  const persons = useAtomValue(personsState);

  const { weekend } = useMeetingAttendance(month);

  // Qué era cada persona en un mes concreto. Se le pregunta por el mes del
  // INFORME, no por el del S-1: ver `collectS1Reports`.
  const categoryOf = useMemo(
    () => buildS1CategoryOf(personIsEnrollmentActive),
    [personIsEnrollmentActive]
  );

  /**
   * `reports` permite calcularlo con datos recién leídos de la base, cuando el
   * estado de la app todavía no se ha enterado de un cambio que se acaba de
   * guardar.
   */
  const compute = (reports: CongFieldServiceReportType[] = congReports) => {
    const result = collectS1Reports({ month, reports, persons, categoryOf });

    const data: S1Data = {
      publishers_active: getPublishersActive(month).length,
      weekend_meeting_average: weekend.average,
      ...s1Totals(result),
    };

    return { result, data };
  };

  return { month, congReports, persons, categoryOf, compute };
};

export default useS1Live;
