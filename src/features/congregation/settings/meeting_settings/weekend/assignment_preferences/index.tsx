import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { AssignmentPreferencesProps } from './index.types';
import useAssignmentPreferences from './useAssignmentPreferences';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * Aquí había un segundo interruptor, "Designar un sustituto para oradores
 * visitantes", que no hacía NADA: ninguna pantalla leía su valor y
 * `WM_SubstituteSpeaker` no se escribe en ningún sitio, así que no había dónde
 * apuntar al sustituto. Un interruptor que se enciende y no cambia nada es
 * peor que no tenerlo. Fuera.
 *
 * Lo que sí sigue existiendo, y es otra cosa, son los sustitutos del conductor
 * del Estudio de La Atalaya (ver `study_conductor`).
 */
const AssignmentPreferences = ({
  quickSettings,
}: AssignmentPreferencesProps) => {
  const { t } = useAppTranslation();

  const { isWeekendEditor } = useCurrentUser();

  const { autoAssignOpeningPrayer, handleAutoOpeningPrayerToggle } =
    useAssignmentPreferences();

  return (
    <>
      {(!quickSettings || (quickSettings && isWeekendEditor)) && (
        <SwitchWithLabel
          label={t('tr_autoAssignOpeningPrayer')}
          checked={autoAssignOpeningPrayer}
          onChange={handleAutoOpeningPrayerToggle}
          readOnly={!isWeekendEditor}
        />
      )}
    </>
  );
};

export default AssignmentPreferences;
