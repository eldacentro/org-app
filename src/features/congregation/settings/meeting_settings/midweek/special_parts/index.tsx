import { useCurrentUser } from '@hooks/index';
import useSpecialParts from './useSpecialParts';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * «Logros de la organización» y el «Informe del Cuerpo Gobernante».
 *
 * La aplicación reconoce esas dos partes por su título y no pide hermano,
 * porque en muchas congregaciones son un vídeo o un informe que presenta quien
 * preside. Pero no en todas: donde se llevan como análisis con el auditorio hay
 * que poner a alguien, y sin este interruptor no había manera — la casilla ni
 * siquiera salía.
 *
 * Apagado por defecto, que es como se ha comportado siempre.
 */
const SpecialParts = () => {
  const { isMidweekEditor } = useCurrentUser();

  const { assigned, handleToggle } = useSpecialParts();

  return (
    <SwitchWithLabel
      label="Asignar a alguien en «Logros de la organización» y en el «Informe del Cuerpo Gobernante»"
      helper="Normalmente son un vídeo y los presenta quien preside, así que la aplicación no pide hermano. Enciéndelo si en tu congregación se llevan como análisis con el auditorio."
      checked={assigned}
      onChange={handleToggle}
      readOnly={!isMidweekEditor}
    />
  );
};

export default SpecialParts;
