import { useAtomValue } from 'jotai';
import InfoTip from '@components/info_tip';
import { personCurrentDetailsState } from '@states/persons';
import { settingsState } from '@states/settings';
import { personIsInactive } from '@services/app/persons';

/**
 * Nota de visibilidad bajo el selector de grupo del perfil: cuando la
 * persona está inactiva, aclara si su grupo la ve o no en "Grupos de
 * predicación" (según la concesión individual y el ajuste de congregación
 * de visibilidad para ancianos). Sustituye a la antigua tarjeta duplicada
 * "Grupo de predicación" de la columna derecha.
 */
const GroupVisibilityNote = ({ group }: { group: string }) => {
  const person = useAtomValue(personCurrentDetailsState);
  const settings = useAtomValue(settingsState);

  if (!group) return null;

  const pd = person.person_data;

  const isPublisherFlagged =
    pd.publisher_baptized.active.value || pd.publisher_unbaptized.active.value;

  if (!isPublisherFlagged || !personIsInactive(person)) return null;

  const hasConcession = pd.grupo_visible_inactivo?.value ?? false;
  const eldersSeeInactive =
    settings.cong_settings.groups_inactive_visible_to_elders?.value ?? false;

  if (hasConcession) {
    return (
      <InfoTip
        isBig={false}
        color="success"
        text="Está inactivo, pero con la concesión activada: sigue apareciendo en su grupo para toda la congregación."
      />
    );
  }

  return (
    <InfoTip
      isBig={false}
      color="warning"
      text={
        eldersSeeInactive
          ? 'Al estar inactivo, en Grupos de predicación solo los ancianos lo ven en su grupo. El grupo se usa igualmente para la organización interna (contactos de emergencia y superintendente de grupo).'
          : 'Al estar inactivo no aparece en Grupos de predicación. El grupo se usa igualmente para la organización interna (contactos de emergencia y superintendente de grupo).'
      }
    />
  );
};

export default GroupVisibilityNote;
