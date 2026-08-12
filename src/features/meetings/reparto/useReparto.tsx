import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentCode } from '@definition/assignment';
import { assignmentsHistoryState } from '@states/schedules';
import { personsByViewState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { applyAssignmentFilters } from '@services/app/persons';
import { buildPersonFullname } from '@utils/common';
import { construirReparto, tituloDeAsignacion } from '@services/app/reparto';

/**
 * Los rótulos de las partes cuyo título cambia cada semana.
 *
 * El resto se saca del propio historial (ver `tituloDeAsignacion`), pero las
 * partes de estudiante se llaman como la parte de ESA semana —«Empiece
 * conversaciones (4 min.)»— y el más repetido no vale como nombre de la
 * asignación.
 */
const ROTULOS: Partial<Record<AssignmentCode, string>> = {
  [AssignmentCode.MM_StartingConversation]: 'Empiece conversaciones',
  [AssignmentCode.MM_FollowingUp]: 'Haga revisitas',
  [AssignmentCode.MM_MakingDisciples]: 'Haga discípulos',
  [AssignmentCode.MM_ExplainingBeliefs]: 'Explique sus creencias',
  [AssignmentCode.MM_Talk]: 'Discurso (estudiante)',
  [AssignmentCode.MM_Discussion]: 'Análisis',
  [AssignmentCode.MM_LCPart]: 'Nuestra vida cristiana',
  [AssignmentCode.MM_AssistantOnly]: 'Ayudante',
};

/**
 * Las que no se reparten entre hermanos y solo ensuciarían la lista: vídeos,
 * la Conmemoración, el crédito de horas y el cajón de sastre.
 */
const FUERA = new Set<AssignmentCode>([
  AssignmentCode.MM_Other,
  AssignmentCode.MM_Memorial,
  AssignmentCode.MM_MemorialVideo,
  AssignmentCode.MM_InitialCallVideo,
  AssignmentCode.MM_ReturnVisitVideo,
  AssignmentCode.MINISTRY_HOURS_CREDIT,
]);

const useReparto = () => {
  const history = useAtomValue(assignmentsHistoryState);
  const persons = useAtomValue(personsByViewState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const asignaciones = useMemo(() => {
    // Qué asignaciones se reparten de verdad en esta congregación: las que
    // aparecen en el historial. Una lista escrita a mano enseñaría filas
    // vacías de cosas que aquí no se usan.
    const codigos = [
      ...new Set(history.map((record) => record.assignment.code)),
    ].filter((code) => code !== undefined && !FUERA.has(code));

    const ruedas = codigos
      .map((code) =>
        construirReparto({
          code,
          titulo: tituloDeAsignacion(history, code, ROTULOS),
          elegibles: applyAssignmentFilters(persons, [code]),
          history,
        })
      )
      .filter((reparto) => reparto.personas.length > 0)
      .sort((a, b) => a.titulo.localeCompare(b.titulo));

    return ruedas;
  }, [history, persons]);

  const nombreDe = useMemo(() => {
    const porUid = new Map(persons.map((p) => [p.person_uid, p]));

    return (uid: string) => {
      const person = porUid.get(uid);

      if (!person) return '';

      return buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      );
    };
  }, [persons, fullnameOption]);

  return { asignaciones, nombreDe };
};

export default useReparto;
