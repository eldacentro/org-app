import { Box, Stack } from '@mui/material';
import PageHeader from '@features/app_start/shared/page_header';
import RequestAccess from '../request_access';

const UserAccountCreated = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: '100%',
        gap: '24px',
      }}
    >
      <Stack spacing="32px">
        <PageHeader
          title="Completa tu perfil"
          description="Por favor, introduce tu nombre y apellidos para solicitar acceso a la congregación Elda - Centro."
        />

        <RequestAccess />
      </Stack>
    </Box>
  );
};

export default UserAccountCreated;
