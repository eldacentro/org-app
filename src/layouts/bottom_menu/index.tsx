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
    // Este wrapper es quien resuelve lo de la barra de herramientas dinámica
    // de Safari/Chrome en iOS — antes se intentaba compensar con JS
    // (window.visualViewport), pero el cálculo llegaba un frame tarde
    // respecto a la animación nativa del navegador y la barra igual
    // "saltaba" al hacer scroll. `100dvh` (dynamic viewport height) lo
    // recalcula el propio navegador sin lag, así que un hijo `position:
    // absolute; bottom: 0` dentro de este wrapper queda siempre pegado al
    // borde real visible, sin JS de por medio.
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: (theme) => theme.zIndex.drawer,
      }}
    >
      {/* Fade gradient behind the bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background:
            'linear-gradient(180deg, rgba(var(--accent-100-base), 0) 0%, rgba(var(--accent-100-base), 0.9) 100%)',
          opacity: keyboardOpen ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      />

      {/* Action pill bar */}
      <Box
        component="nav"
        aria-label={t('tr_bottomActionsMenu')}
        sx={{
          position: 'absolute',
          bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
          left: '50%',
          transform: keyboardOpen
            ? 'translate(-50%, 16px)'
            : 'translateX(-50%)',
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? 'none' : 'auto',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          zIndex: 1,

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
    </Box>
  );
};

export default BottomMenu;
