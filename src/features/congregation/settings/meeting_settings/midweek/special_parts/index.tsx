import { useCurrentUser } from '@hooks/index';
import useSpecialParts from './useSpecialParts';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * «Logros de la organización» y el «Informe del Cuerpo Gobernante».
 *
 * La aplicación reconoce esas dos partes por su título y no pide hermano,
 * porque casi siempre son un vídeo o un informe que presenta quien preside.
 *
 * Pero no siempre: hay meses en que el material las trae con la indicación
 * «Análisis con el auditorio», y entonces alguien tiene que dirigirlas. Sin este
 * interruptor no había manera de asignarlo — la casilla ni siquiera salía en
 * pantalla.
 *
 * El texto habla del MATERIAL y no de «si en tu congregación», que era lo que
 * decía antes: no es una costumbre de la casa, es lo que pone el programa de esa
 * semana.
 *
 * Apagado por defecto, que es como se ha comportado siempre.
 */
const SpecialParts = () => {
  const { isMidweekEditor } = useCurrentUser();

  const { assigned, handleToggle } = useSpecialParts();

  return (
    <SwitchWithLabel
      label="Asignar a alguien en «Logros de la organización» y en el «Informe del Cuerpo Gobernante»"
      helper="Suelen ser un vídeo, y por eso la aplicación no pide hermano. Pero hay meses en que el material las trae como «Análisis con el auditorio»: entonces alguien tiene que dirigirlas, y con esto aparece el campo para ponerlo."
      checked={assigned}
      onChange={handleToggle}
      readOnly={!isMidweekEditor}
    />
  );
};

export default SpecialParts;
