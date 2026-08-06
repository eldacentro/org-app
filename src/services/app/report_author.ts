import { FieldServiceGroupType } from '@definition/field_service_groups';

/**
 * Con qué cargo metió alguien un informe.
 *
 * No se guarda el cargo, se deduce — y se puede deducir porque quién puede
 * editar el informe de quién ya está acotado (ver `useReportEditScope` y, en el
 * servidor, `mergeGroupReports`):
 *
 * - Si el autor ES el publicador, lo mandó él.
 * - Si lleva el grupo del publicador, fue como responsable o como auxiliar,
 *   según cómo figure en ese grupo.
 * - Y si no es ninguna de las dos, solo pudo hacerlo alguien con permiso sobre
 *   toda la congregación: la secretaría.
 *
 * Guardar el cargo en el informe habría sido más directo, pero sería una foto
 * del día en que se guardó: el que era auxiliar de grupo en enero puede ser
 * responsable en junio, y la etiqueta seguiría diciendo lo de antes.
 * Deducirlo dice siempre la verdad de hoy.
 */
export type ReportAuthorRole =
  | 'publisher'
  | 'group_overseer'
  | 'group_assistant'
  | 'secretary';

export const reportAuthorRole = ({
  authorUid,
  publisherUid,
  groups,
}: {
  authorUid: string;
  publisherUid: string;
  groups: FieldServiceGroupType[];
}): ReportAuthorRole => {
  if (authorUid === publisherUid) return 'publisher';

  const grupoDelPublicador = groups.find((group) =>
    group.group_data.members.some(
      (member) => member.person_uid === publisherUid
    )
  );

  const enEseGrupo = grupoDelPublicador?.group_data.members.find(
    (member) => member.person_uid === authorUid
  );

  if (enEseGrupo?.isOverseer) return 'group_overseer';
  if (enEseGrupo?.isAssistant) return 'group_assistant';

  return 'secretary';
};
