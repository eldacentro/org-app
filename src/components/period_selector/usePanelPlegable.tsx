import { useEffect, useState } from 'react';
import { useBreakpoints } from '@hooks/index';

/**
 * ABIERTO EN ESCRITORIO, PLEGADO EN CUANTO ELIGES EN EL MÓVIL.
 *
 * En escritorio el panel es una columna al lado y se queda abierto. En una
 * pantalla estrecha ocupa toda la ventana, así que al elegir semana o mes se
 * pliega solo y deja ver lo que has elegido — si no, te quedas mirando la lista
 * de la que acabas de escoger.
 *
 * Estaba escrito igual en los dos paneles de semana, el de Reuniones y el de
 * Departamentos. Como cada uno tenía su copia, cualquier retoque aquí había que
 * acordarse de hacerlo dos veces.
 *
 * @param valorElegido  Lo que hay elegido ahora mismo. Vacío = nada elegido.
 */
const usePanelPlegable = (valorElegido: string) => {
  const { desktopUp } = useBreakpoints();

  const [expanded, setExpanded] = useState(true);

  const handleToggleExpand = () => setExpanded((prev) => !prev);

  useEffect(() => {
    if (!desktopUp && valorElegido.length > 0) {
      setExpanded(false);
    }
  }, [valorElegido, desktopUp]);

  return { expanded, handleToggleExpand, desktopUp };
};

export default usePanelPlegable;
