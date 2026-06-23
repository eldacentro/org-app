import SwitchWithLabel from '@components/switch_with_label';
import useCurrentUser from '@hooks/useCurrentUser';
import useTerritoriesEnabled from './useTerritoriesEnabled';

const TerritoriesEnabled = () => {
  const { isServiceCommittee } = useCurrentUser();

  const { territoriesEnabledPublishers, handleTerritoriesEnabledPublishersToggle } =
    useTerritoriesEnabled();

  return (
    <SwitchWithLabel
      label="Habilitar Territorios (Temporal)"
      helper="Activa esta opción para que los publicadores puedan ver y acceder a la página de Territorios."
      checked={territoriesEnabledPublishers}
      onChange={handleTerritoriesEnabledPublishersToggle}
      readOnly={!isServiceCommittee}
    />
  );
};

export default TerritoriesEnabled;
