import { Box } from '@mui/material';
import { BottomMenuProps } from './index.types';
import { useAppTranslation, useViewportInset } from '@hooks/index';

const BottomMenu = (props: BottomMenuProps) => {
  const { t } = useAppTranslation();
  // env(safe-area-inset-bottom) por sí solo no compensa la barra de
  // herramientas dinámica de Safari/Chrome en iOS al hacer scroll — por eso
  // la barra "saltaba" o quedaba tapada un instante en los extremos del
  // scroll. bottomInset mide el viewport visual real y corrige eso.
  // Con el teclado abierto, en vez de perseguirlo con precisión píxel a
  // píxel (frágil), se oculta — patrón estándar en apps nativas.
  const { bottomInset, keyboardOpen } = useViewportInset();
  // Mientras el teclado está abierto la barra se oculta, así que su posición
  // exacta no importa — evita sumar la altura del teclado al `bottom` y que
  // se vea "saltar" de más antes de desaparecer en la transición.
  const inset = keyboardOpen ? 0 : bottomInset;

  return (
    <>
      {/* Fade gradient behind the bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background:
            'linear-gradient(180deg, rgba(var(--accent-100-base), 0) 0%, rgba(var(--accent-100-base), 0.9) 100%)',
          zIndex: (theme) => theme.zIndex.drawer,
          pointerEvents: 'none',
          opacity: keyboardOpen ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      />

      {/* Action pill bar */}
      <Box
        component="nav"
        className="tabbar"
        aria-label={t('tr_bottomActionsMenu')}
        sx={{
          position: 'fixed',
          bottom: `calc(16px + env(safe-area-inset-bottom, 0px) + ${inset}px)`,
          left: '50%',
          transform: keyboardOpen
            ? 'translate(-50%, 16px)'
            : 'translateX(-50%)',
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? 'none' : 'auto',
          transition: 'opacity 0.18s ease, transform 0.18s ease, bottom 0.1s ease-out',
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
