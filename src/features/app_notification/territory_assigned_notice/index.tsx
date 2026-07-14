import { Box, Stack } from '@mui/material';
import { TerritoryAssignedNotificationType } from '@definition/notification';
import Button from '@components/button';

import { useNavigate } from 'react-router';
import { markNoticeRead } from '@services/firebase/territories';
import { useAtomValue } from 'jotai';
import { congIDState } from '@states/settings';
import useAppNotification from '@features/app_notification/useAppNotification';

const TerritoryAssignedNotice = ({
  notification,
}: {
  notification: TerritoryAssignedNotificationType;
}) => {
  const navigate = useNavigate();
  const congId = useAtomValue(congIDState);
  const { handleCloseNotification } = useAppNotification();
  const notice = notification.notice;

  const handleVerTerritorio = async () => {
    // Si la notice tiene el ID, la marcamos como leída en Firebase
    if (notice.id) {
      try {
        await markNoticeRead(congId, notice.id);
      } catch (e) {
        console.error('Failed to mark notice as read', e);
      }
    }
    
    // Navegar a la página de territorios con el parámetro view
    if (notice.territoryId) {
      handleCloseNotification();
      navigate(`/congregation/territories?view=${notice.territoryId}`);
    }
  };

  return (
    <Box
      sx={{
        mt: '12px',
        p: '16px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--white)',
        boxShadow: 'var(--small-card-shadow)',
      }}
    >
      <Stack direction="row" justifyContent="flex-start">
        <Button
          variant="main"
          onClick={handleVerTerritorio}
          sx={{
            height: '38px',
            minHeight: '38px',
            px: '20px',
            borderRadius: 'var(--radius-l)',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '0.01em',
            boxShadow: 'var(--btn-shadow)',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 'var(--hover-shadow)',
            }
          }}
        >
          Ver Territorio
        </Button>
      </Stack>
    </Box>
  );
};

export default TerritoryAssignedNotice;
