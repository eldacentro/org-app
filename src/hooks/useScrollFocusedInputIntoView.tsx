import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = 'input, textarea, [contenteditable="true"]';

/**
 * Cuando se enfoca un campo de texto y el teclado virtual lo deja parcial o
 * totalmente tapado, lo desplaza a la vista. Usa visualViewport (no
 * window.innerHeight) porque es lo único que refleja el área realmente
 * visible una vez el teclado está abierto.
 *
 * Sin esto, en formularios dentro de modales/hojas inferiores el usuario a
 * veces tiene que desplazarse manualmente para ver lo que está escribiendo —
 * el desplazamiento automático nativo del navegador no siempre alcanza un
 * campo dentro de un contenedor con su propio scroll.
 *
 * Solo actúa si el campo NO está ya visible — nunca fuerza un salto en un
 * campo que el usuario ya puede ver.
 */
const useScrollFocusedInputIntoView = () => {
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(FOCUSABLE_SELECTOR)) return;

      // Esperar a que el teclado termine de animarse y visualViewport se
      // estabilice antes de medir.
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const vv = window.visualViewport;
        const visibleBottom = vv ? vv.height + vv.offsetTop : window.innerHeight;
        const visibleTop = vv ? vv.offsetTop : 0;

        const margin = 12;
        const hidden = rect.bottom > visibleBottom - margin || rect.top < visibleTop + margin;

        if (hidden) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 300);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);
};

export default useScrollFocusedInputIntoView;
