import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { buildPersonFullname } from '@utils/common';
import { personsActiveState } from '@states/persons';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { fullnameOptionState } from '@states/settings';
import usePerson from '@features/persons/hooks/usePerson';
import { saldoDePrecursores } from '@services/app/saldo_precursores';

/**
 * El saldo de los precursores regulares del AÑO QUE SE ESTÁ MIRANDO.
 *
 * El año llega de la página, que es la que sabe qué pestaña está elegida. Aquí
 * antes se ponía el año de servicio en curso a pelo, y desde septiembre de
 * 2026 eso es 2027: el secretario elegía 2026 y el saldo seguía en un año sin
 * informes. El cálculo vive en `services/app/saldo_precursores`, con pruebas.
 */
const usePioneerBalance = (year: string) => {
  const { personIsEnrollmentActive } = usePerson();

  const persons = useAtomValue(personsActiveState);
  const congReports = useAtomValue(congFieldServiceReportsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const pioneers = useMemo(
    () =>
      saldoDePrecursores({
        persons,
        reports: congReports,
        year,
        estabaDePrecursor: (person, month) =>
          personIsEnrollmentActive(person, 'FR', month),
        nombre: (person) =>
          buildPersonFullname(
            person.person_data.person_lastname.value,
            person.person_data.person_firstname.value,
            fullnameOption
          ),
      }),
    [persons, congReports, year, fullnameOption, personIsEnrollmentActive]
  );

  return { pioneers };
};

export default usePioneerBalance;
