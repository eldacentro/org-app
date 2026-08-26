import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import { schedulesGetData } from '@services/app/schedules';
import { partesPorCambiar } from '@services/app/por_cambiar';
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
 * Cómo se llama cada parte en la lista.
 *
 * A mano y no sacado del programa: aquí hace falta el nombre corto que se dice
 * hablando («Parte 4», «Lectura de la Biblia»), no el título del punto de esa
 * semana concreta, que cambia cada semana y no ayuda a reconocer de qué se
 * trata cuando lo que buscas es a quién tienes que sustituir.
 *
 * La clave lleva ya quitados el sufijo de sala (_A/_B) y el de papel
 * (_Student/_Assistant): la sala se dice aparte y el papel también.
 */
const NOMBRE_PARTE: Record<string, string> = {
  MM_Chairman: 'Presidente',
  MM_OpeningPrayer: 'Oración de apertura',
  MM_TGWTalk: 'Tesoros de la Biblia',
  MM_TGWGems: 'Busquemos perlas escondidas',
  MM_TGWBibleReading: 'Lectura de la Biblia',
  MM_AYFPart1: 'Parte 4',
  MM_AYFPart2: 'Parte 5',
  MM_AYFPart3: 'Parte 6',
  MM_AYFPart4: 'Parte 7',
  MM_LCPart1: 'Nuestra vida cristiana (1)',
  MM_LCPart2: 'Nuestra vida cristiana (2)',
  MM_LCPart3: 'Nuestra vida cristiana (3)',
  MM_LCCBSConductor: 'Estudio bíblico — conductor',
  MM_LCCBSReader: 'Estudio bíblico — lector',
  MM_ClosingPrayer: 'Oración final',
  MM_CircuitOverseer: 'Discurso del superintendente',
};

/**
 * Todas las partes de entre semana, para poder mirarlas una a una.
 *
 * Se sacan de `ASSIGNMENT_PATH` en vez de escribirse aquí: así, el día que se
 * añada una parte nueva al programa, esta lista la ve sin que nadie se acuerde
 * de venir a apuntarla.
 */
const PARTES_ENTRE_SEMANA = Object.keys(ASSIGNMENT_PATH).filter((clave) =>
  String(ASSIGNMENT_PATH[clave] ?? '').startsWith('midweek_meeting')
) as AssignmentFieldType[];

const usePorCambiar = () => {
  const { t } = useAppTranslation();

  const schedules = useAtomValue(schedulesState);
  const persons = useAtomValue(personsState);
  const dataView = useAtomValue(userDataViewState);
  const monthNames = useAtomValue(monthNamesState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const partes = useMemo(() => {
    // Desde el lunes de esta semana: la reunión de esta semana todavía no ha
    // pasado, así que es justo la más urgente de todas.
    const fromWeek = formatDate(getWeekDate(), 'yyyy/MM/dd');

    const encontradas = partesPorCambiar({
      schedules,
      dataView,
      fromWeek,
      assignmentsForWeek: () => PARTES_ENTRE_SEMANA,
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

    return encontradas.map((parte) => {
      const clave = String(parte.assignment)
        .replace(/_(Student|Assistant)/, '')
        .replace(/_[AB]$/, '');

      const person = persons.find(
        (record) => record.person_uid === parte.person
      );

      return {
        ...parte,
        // Si la persona ya no existe, el nombre que quedó copiado en el propio
        // programa evita que la fila salga en blanco y no se sepa a quién había
        // que cambiar.
        nombre: person
          ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
          : parte.name || t('tr_deleted', 'Eliminado'),
        parte: NOMBRE_PARTE[clave] ?? clave,
        ayudante: String(parte.assignment).includes('_Assistant'),
        salaB: String(parte.assignment).endsWith('_B'),
        semana: buildWeekRangeLabel(parte.weekOf, monthNames, t),
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

  return { partes };
};

export default usePorCambiar;
