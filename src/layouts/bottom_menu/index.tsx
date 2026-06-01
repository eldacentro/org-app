import { Box } from '@mui/material';
import { BottomMenuProps } from './index.types';
import { useAppTranslation } from '@hooks/index';

const BottomMenu = (props: BottomMenuProps) => {
  const { t } = useAppTranslation();
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
        }}
      />

      {/* Action pill bar */}
      <Box
        component="nav"
        className="tabbar"
        aria-label={t('tr_bottomActionsMenu')}
        sx={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
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
