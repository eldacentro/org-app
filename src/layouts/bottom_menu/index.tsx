import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { BottomMenuProps } from './index.types';
import {
  useAppTranslation,
  useStaticSafeAreaInsetBottom,
  useViewportInset,
} from '@hooks/index';

const BAR_MARGIN = 16;
// Un cambio de tamaño real (rotar el teléfono, plegar una tablet) mueve
// window.innerHeight muchísimo más que esto. Por debajo del umbral, lo
// tratamos como ruido — ver el comentario en el useEffect de abajo.
const RESIZE_THRESHOLD_PX = 150;

const BottomMenu = (props: BottomMenuProps) => {
  const { t } = useAppTranslation();
  // Con el teclado abierto la barra se oculta en vez de perseguirlo con
  // precisión píxel a píxel (frágil entre navegadores/versiones) — patrón
  // estándar en apps nativas.
  const { keyboardOpen } = useViewportInset();
  // Congelado al montar — ver el comentario del hook.
  const safeAreaInsetBottom = useStaticSafeAreaInsetBottom();

  // Anclamos desde ARRIBA (`top`), no desde abajo. En iOS, `position: fixed`
  // anclado con `bottom` resulta inestable en la PWA instalada: WebKit sigue
  // corriendo el mismo cálculo de "¿hay barra de Safari que mostrar/
  // ocultar?" según la dirección del scroll aunque en standalone no exista
  // ninguna barra, así que el borde inferior de referencia se mueve solo y
  // cualquier elemento anclado con `bottom` (con o sin env(), con valor fijo
  // o no) se desplaza con él. El borde SUPERIOR del viewport no tiene ese
  // problema, así que calculamos la posición congelando `window.innerHeight`
  // una vez al montar y anclamos con `top` en vez de `bottom`.
  const [windowHeight, setWindowHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    setWindowHeight(window.innerHeight);

    // Solo escuchamos 'resize' (rotación de pantalla, cambio real de
    // tamaño) — deliberadamente NO 'scroll' ni visualViewport, que es
    // justo la fuente del falso recálculo que estamos evitando. Pero
    // incluso 'resize' no es 100% confiable en standalone: iOS puede
    // disparar uno espurio, con un innerHeight apenas distinto, como
    // residuo del mismo mecanismo fantasma de la barra de Safari — eso
    // deshacía este arreglo. Por eso solo aceptamos el nuevo valor si el
    // cambio es grande (un giro de pantalla real), no un par de píxeles.
    const handleResize = () => {
      const next = window.innerHeight;
      setWindowHeight((prev) =>
        Math.abs(next - prev) > RESIZE_THRESHOLD_PX ? next : prev
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // La altura de la barra depende de sus botones (varía por breakpoint/
  // contenido), así que se mide después de montar en vez de asumirla.
  const barRef = useRef<HTMLElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const barTop =
    windowHeight - barHeight - BAR_MARGIN - safeAreaInsetBottom;

  return (
    <>
      {/* Action pill bar */}
      <Box
        ref={barRef}
        component="nav"
        aria-label={t('tr_bottomActionsMenu')}
        sx={{
          position: 'fixed',
          top: barHeight ? `${barTop}px` : undefined,
          // Antes de la primera medición (barHeight === 0), nos apoyamos en
          // `bottom` solo para que no aparezca pegada arriba un instante —
          // se corrige en el primer paint útil, así que no se nota.
          bottom: barHeight ? undefined : `${BAR_MARGIN + safeAreaInsetBottom}px`,
          left: '50%',
          transform: keyboardOpen
            ? 'translate(-50%, 16px)'
            : 'translateX(-50%)',
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? 'none' : 'auto',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,

          /* Glass */
          backgroundColor: 'rgba(var(--accent-150-base), 0.78)',
          backdropFilter: 'blur(22px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.6)',

          border: '1px solid rgba(var(--accent-200-base), 0.7)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',

          padding: '5px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',

          width: 'fit-content',
          maxWidth: 'calc(100vw - 32px)',
          overflow: 'hidden',
        }}
      >
        {props.buttons}
      </Box>
    </>
  );
};

export default BottomMenu;
