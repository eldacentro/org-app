import SwitchWithLabel from '@components/switch_with_label';
import useCurrentUser from '@hooks/useCurrentUser';
import useGroupsInactiveVisibility from './useGroupsInactiveVisibility';

/**
 * Ajuste de congregación: si los ancianos ven en "Grupos de predicación" a
 * los miembros ocultos para los publicadores (inactivos sin concesión).
 * Desactivado, los ancianos ven exactamente la vista pública — así saben
 * qué ve el resto de la congregación. Solo afecta a esa página.
 */
const GroupsInactiveVisibility = () => {
  const { isAdmin } = useCurrentUser();

  const { inactiveVisible, handleToggle } = useGroupsInactiveVisibility();

  return (
    <SwitchWithLabel
      label="Los ancianos ven a los miembros inactivos"
      helper="Activado, los ancianos ven en los grupos también a los inactivos sin concesión. Desactivado, ven la misma vista que los publicadores."
      checked={inactiveVisible}
      onChange={handleToggle}
      readOnly={!isAdmin}
    />
  );
};

export default GroupsInactiveVisibility;
