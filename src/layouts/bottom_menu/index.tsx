import { Box } from '@mui/material';
import { BottomMenuProps } from './index.types';
import { useAppTranslation, useViewportInset } from '@hooks/index';

const BottomMenu = (props: BottomMenuProps) => {
  const { t } = useAppTranslation();
  // Con el teclado abierto la barra se oculta en vez de perseguirlo con
  // precisión píxel a píxel (frágil entre navegadores/versiones) — patrón
  // estándar en apps nativas.
  const { keyboardOpen } = useViewportInset();

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
          // Capa GPU propia y estable — sin esto, WebKit puede re-componer
          // (y desplazar visualmente un instante) elementos `fixed` con
          // backdrop-filter cada vez que el scroll dispara un repintado,
          // que es justo el "salto" reportado en iOS.
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />

      {/* Action pill bar */}
      <Box
        component="nav"
        aria-label={t('tr_bottomActionsMenu')}
        sx={{
          position: 'fixed',
          bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
          left: '50%',
          transform: keyboardOpen
            ? 'translate3d(-50%, 16px, 0)'
            : 'translate3d(-50%, 0, 0)',
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? 'none' : 'auto',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          willChange: 'transform',

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
