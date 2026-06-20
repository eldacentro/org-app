import { useEffect, useState } from 'react';

const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Mide en tiempo real cuánto del viewport "de layout" queda cubierto por
 * encima del borde inferior del viewport "visual" (window.visualViewport),
 * usando la única API que refleja con precisión tanto el teclado virtual
 * como la barra de herramientas dinámica de Safari/Chrome en iOS.
 *
 * Por qué hace falta esto: un `position: fixed; bottom: 0` puro asume que el
 * viewport no cambia de tamaño salvo por el teclado, pero en iOS la barra de
 * direcciones/herramientas también se expande y contrae al hacer scroll,
 * cambiando env(safe-area-inset-bottom) de forma que CSS por sí solo no
 * puede compensar a tiempo — por eso una barra fija "salta" o queda tapada
 * un instante en los bordes del scroll, sin que el usuario haya tocado el
 * teclado para nada.
 *
 * `bottomInset`: píxeles a sumar a un elemento `position: fixed; bottom: 0`
 *   para que su posición coincida siempre con el borde real visible (cubre
 *   tanto el caso "barra de Safari visible" como el caso "teclado abierto").
 * `keyboardOpen`: true cuando el cambio de tamaño es demasiado grande para
 *   ser la barra del navegador — heurística para ocultar elementos
 *   flotantes en vez de intentar perseguir al teclado con precisión píxel
 *   a píxel (frágil entre versiones/dispositivos).
 */
const useViewportInset = () => {
  const [bottomInset, setBottomInset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      setBottomInset(inset);
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

  return { bottomInset, keyboardOpen };
};

export default useViewportInset;
