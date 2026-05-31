import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import PageHeader from '@features/app_start/shared/page_header';
import RequestAccess from '../request_access';

const UserAccountCreated = () => {
  const { t } = useAppTranslation();

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
          title={t('tr_registrationSuccess')}
          description={t('tr_accountCreatedJoin')}
        />

        <RequestAccess />
      </Stack>
    </Box>
  );
};

export default UserAccountCreated;
