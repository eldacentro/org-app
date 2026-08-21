import { useCurrentUser } from '@hooks/index';
import useChairmanNotes from './useChairmanNotes';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * Las notas que apunta quien preside mientras sigue la reunión.
 *
 * Apagado —que es como viene— se quedan en su teléfono y no salen de ahí. Es lo
 * prudente por defecto: una nota escrita a toda prisa de pie en la plataforma no
 * es un informe sobre nadie, y quien la escribe tiene que poder contar con que
 * no la va a leer nadie más.
 *
 * Encendido viajan cifradas con la llave maestra, así que solo pueden abrirlas
 * los ancianos aunque el documento lo pueda descargar cualquiera de la
 * congregación.
 *
 * Los TIEMPOS no dependen de esto: esos se ven siempre, porque son la misma
 * información que tiene delante cualquiera que esté mirando la plataforma.
 */
const ChairmanNotes = () => {
  const { isMidweekEditor } = useCurrentUser();

  const { shared, handleToggle } = useChairmanNotes();

  return (
    <SwitchWithLabel
      label="Compartir las notas de quien preside con los demás ancianos"
      helper="Al seguir la reunión en directo se pueden apuntar cosas de cada parte. Apagado, esas notas se quedan solo en su teléfono. Encendido, las ven los demás ancianos (y nadie más: viajan cifradas)."
      checked={shared}
      onChange={handleToggle}
      readOnly={!isMidweekEditor}
    />
  );
};

export default ChairmanNotes;
