import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import SwitchWithLabel from '@components/switch_with_label';
import VisibilityOffConfirm from './visibility_off';
import useVisibilityToggle from './useVisibilityToggle';

const VisibilityToggle = () => {
  const { t } = useAppTranslation();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const {
    handleToggleVisibility,
    isVisible,
    handleCloseConfirm,
    openConfirm,
    handleVisibilityOff,
  } = useVisibilityToggle();

  return (
    <Box
      sx={{
        borderBottom: '1px solid var(--line)',
        paddingBottom: '16px',
      }}
    >
      {openConfirm && (
        <VisibilityOffConfirm
          open={openConfirm}
          onClose={handleCloseConfirm}
          onConfirm={handleVisibilityOff}
        />
      )}

      <SwitchWithLabel
        label={t('tr_discoverableSetting')}
        helper={t('tr_discoverableSettingDesc')}
        checked={isVisible}
        onChange={handleToggleVisibility}
        readOnly={!isPublicTalkCoordinator}
      />
    </Box>
  );
};

export default VisibilityToggle;
