import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import {
  schedulesGetData,
  schedulesS89AssignmentsForWeek,
} from '@services/app/schedules';
import { pendingS89Slips } from '@services/app/pending_s89';
import { buildWeekRangeLabel } from '@services/app/week_range';
import { formatDate, getWeekDate } from '@utils/date';
import { monthNamesState } from '@states/app';
import { personsState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { useAppTranslation } from '@hooks/index';

/**
 * Cómo se llama cada parte en la lista de pendientes.
 *
 * Los números son los de la propia hoja S-89 (la lectura de la Biblia es la
 * parte 3), así que coinciden con lo que el hermano tiene en la mano.
 */
const NOMBRE_PARTE: Record<string, string> = {
  MM_TGWBibleReading: 'Lectura de la Biblia',
  MM_AYFPart1: 'Parte 4',
  MM_AYFPart2: 'Parte 5',
  MM_AYFPart3: 'Parte 6',
  MM_AYFPart4: 'Parte 7',
};

const usePendingSlips = () => {
  const { t } = useAppTranslation();

  const schedules = useAtomValue(schedulesState);
  const persons = useAtomValue(personsState);
  const dataView = useAtomValue(userDataViewState);
  const monthNames = useAtomValue(monthNamesState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const pending = useMemo(() => {
    const fromWeek = formatDate(getWeekDate(), 'yyyy/MM/dd');

    const slips = pendingS89Slips({
      schedules,
      dataView,
      fromWeek,
      assignmentsForWeek: schedulesS89AssignmentsForWeek,
      getAssignment: (
        schedule: SchedWeekType,
        assignment: AssignmentFieldType,
        view: string
      ) =>
        schedulesGetData(
          schedule,
          ASSIGNMENT_PATH[assignment],
          view
        ) as AssignmentCongregation,
    });

    return slips.map((slip) => {
      const person = persons.find(
        (record) => record.person_uid === slip.person
      );

      const clave = slip.assignment
        .replace(/_Student/, '')
        .replace(/_[AB]$/, '');

      return {
        ...slip,
        // Si la persona ya no existe, el nombre desnormalizado del propio
        // programa evita que la fila quede en blanco y no se sepa a quién
        // había que darle la hojita.
        name: person
          ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
          : t('tr_deleted', 'Eliminado'),
        part: NOMBRE_PARTE[clave] ?? clave,
        auxClass: slip.assignment.endsWith('_B'),
        weekLabel: buildWeekRangeLabel(slip.weekOf, monthNames, t),
      };
    });
  }, [
    schedules,
    dataView,
    persons,
    displayNameEnabled,
    fullnameOption,
    monthNames,
    t,
  ]);

  // Agrupadas por semana: sin esto la fecha se repetía en cada fila y cuatro
  // filas seguidas decían lo mismo. Además así se lee como se trabaja — "esta
  // semana debo cuatro" — en vez de como una lista plana.
  const porSemana = useMemo(() => {
    const grupos: {
      weekOf: string;
      weekLabel: string;
      slips: typeof pending;
    }[] = [];

    for (const slip of pending) {
      const ultimo = grupos.at(-1);

      if (ultimo?.weekOf === slip.weekOf) {
        ultimo.slips.push(slip);
        continue;
      }

      grupos.push({
        weekOf: slip.weekOf,
        weekLabel: slip.weekLabel,
        slips: [slip],
      });
    }

    return grupos;
  }, [pending]);

  return { pending, porSemana };
};

export default usePendingSlips;
