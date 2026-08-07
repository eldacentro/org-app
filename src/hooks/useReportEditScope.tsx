import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { userLocalUIDState } from '@states/settings';
import useCurrentUser from './useCurrentUser';

/**
 * Quién puede EDITAR el informe de quién.
 *
 * Ver los informes y poder tocarlos son dos cosas distintas, y hasta ahora eran
 * la misma: cualquier anciano podía editar el de cualquiera. La regla de la
 * congregación es otra:
 *
 * - El secretario (y el coordinador y los administradores, que ya cuentan como
 *   secretario) editan todos.
 * - Los demás ancianos VEN todos, pero solo editan los de su grupo.
 * - Quien lleva un grupo sin ser anciano —el auxiliar, siervo ministerial— ve y
 *   edita solo los de su grupo.
 *
 * «SU GRUPO» ES EL QUE LLEVA, no aquel al que pertenece: donde figura como
 * responsable o como auxiliar. Es la misma definición que usa el servidor para
 * decidir qué le acepta, y tienen que ser la misma o una de las dos mentiría.
 *
 * Y ESTO ES SOLO LA CORTESÍA. Lo que de verdad impide escribir lo que no toca
 * está en el servidor (`mergeGroupReports`), que es el único sitio que un
 * cliente modificado no puede saltarse. Aquí se hace para que nadie edite algo
 * creyendo que ha quedado guardado cuando el servidor lo va a descartar — que
 * es peor que no dejar editar.
 */
const useReportEditScope = () => {
  const { isSecretary, isLanguageGroupOverseer } = useCurrentUser();

  // Quien lleva un grupo de idioma trabaja en su propia vista de datos, que ya
  // le acota a su gente por otro camino. Se queda como estaba: acotarlo además
  // por grupo de predicación le dejaría sin poder editar nada.
  const fullEditor = isSecretary || isLanguageGroupOverseer;

  // La lista CRUDA, no la de pantalla. `fieldWithLanguageGroupsState` quita a
  // los publicadores inactivos y archivados cuando quien mira no es anciano —
  // y entonces un auxiliar de grupo no podría editar el informe de alguien de
  // su grupo que lleva meses sin informar, que es justo cuando hace falta.
  // Peor: si él mismo cayera de ese filtro, se quedaría sin poder editar nada.
  const groups = useAtomValue(fieldServiceGroupsState);
  const userUID = useAtomValue(userLocalUIDState);

  const myGroupUids = useMemo(() => {
    const result = new Set<string>();

    if (!userUID) return result;

    for (const group of groups) {
      if (group.group_data._deleted) continue;

      const members = group.group_data.members ?? [];

      const leads = members.some(
        (member) =>
          member.person_uid === userUID &&
          (member.isOverseer || member.isAssistant)
      );

      if (!leads) continue;

      for (const member of members) {
        if (member.person_uid) result.add(member.person_uid);
      }
    }

    return result;
  }, [groups, userUID]);

  const canEditReportOf = useCallback(
    (person_uid: string) => {
      if (fullEditor) return true;

      return myGroupUids.has(person_uid);
    },
    [fullEditor, myGroupUids]
  );

  return { canEditReportOf, isFullReportEditor: fullEditor, myGroupUids };
};

export default useReportEditScope;
