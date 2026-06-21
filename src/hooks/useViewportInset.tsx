import { useEffect, useState } from 'react';

const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Detecta si el teclado virtual está abierto, vía window.visualViewport.
 *
 * Nota histórica: esto antes también calculaba un `bottomInset` en JS para
 * compensar la barra de herramientas dinámica de Safari/Chrome en iOS al
 * hacer scroll (un `position: fixed; bottom: 0` puro no la sigue a tiempo).
 * Ese cálculo tenía lag frente a la animación nativa del navegador — el
 * propio JS llegaba un frame tarde, así que la barra igual "saltaba". La
 * solución de verdad es 100% CSS: dimensionar el contenedor del elemento
 * fijo con `100dvh` (dynamic viewport height), que el navegador recalcula
 * de forma nativa y sin lag al mostrar/ocultar su barra — ver BottomMenu.
 * Por eso este hook ya solo necesita resolver el teclado, que sí requiere
 * JS porque su comportamiento varía demasiado entre navegadores/versiones
 * como para fiarse de un único valor de CSS.
 */
const useViewportInset = () => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      setKeyboardOpen(inset > KEYBOARD_THRESHOLD_PX);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return { keyboardOpen };
};

export default useViewportInset;
