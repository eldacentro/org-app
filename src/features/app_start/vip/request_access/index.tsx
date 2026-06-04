import { Box, Stack } from '@mui/material';
import { IconAccount, IconClock, IconRefresh, IconLogout } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useRequestAccess from './useRequestAccess';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import TextField from '@components/textfield';
import Typography from '@components/typography';

const RequestAccess = () => {
  const { t } = useAppTranslation();

  const {
    firstname,
    lastname,
    setFirstname,
    setLastname,
    handleRequestAccess,
    handleRefresh,
    handleSignOut,
    isProcessing,
    isRefreshing,
    requestSent,
    loadError,
    submitError,
    country,
    congregation,
  } = useRequestAccess();

  if (requestSent) {
    return (
      <Stack spacing="24px" alignItems="center" sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--accent-150)',
            color: 'var(--accent-main)',
            animation: 'requestPulse 2s ease-in-out infinite',
            '@keyframes requestPulse': {
              '0%, 100%': {
                boxShadow: '0 0 0 0 var(--accent-200)',
              },
              '50%': {
                boxShadow: '0 0 0 12px rgba(0, 0, 0, 0)',
              },
            },
          }}
        >
          <IconClock width={36} height={36} color="var(--accent-main)" />
        </Box>

        <Stack spacing="8px" alignItems="center">
          <Typography className="h2" sx={{ fontWeight: 700, color: 'var(--black)' }}>
            {t('tr_requestSentTitle')}
          </Typography>
          <Typography
            className="body-regular"
            sx={{ color: 'var(--grey-400)', maxWidth: '360px' }}
          >
            {t('tr_requestSentReassuring')}
          </Typography>
        </Stack>

        <Stack spacing="12px" sx={{ width: '100%', maxWidth: '320px' }}>
          <Button
            variant="main"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={
              isRefreshing ? (
                <IconLoading width={22} height={22} color="var(--always-white)" />
              ) : (
                <IconRefresh width={22} height={22} color="var(--always-white)" />
              )
            }
          >
            {t('tr_update')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSignOut}
            startIcon={<IconLogout width={22} height={22} color="var(--accent-main)" />}
          >
            {t('tr_logOut')}
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing="24px" sx={{ containerType: 'inline-size' }}>
      {loadError && (
        <Box
          sx={{
            padding: '16px',
            borderRadius: 'var(--radius-l)',
            background: 'var(--red-100)',
            border: '1px solid var(--red-300)',
          }}
        >
          <Typography className="body-regular" sx={{ color: 'var(--red-900)', fontWeight: 600 }}>
            {t('tr_requestErrorConnect')}
          </Typography>
          <Typography className="body-small-regular" sx={{ color: 'var(--red-800)', marginTop: '4px' }}>
            {loadError}
          </Typography>
        </Box>
      )}

      {submitError && (
        <Box
          sx={{
            padding: '16px',
            borderRadius: 'var(--radius-l)',
            background: 'var(--red-100)',
            border: '1px solid var(--red-300)',
          }}
        >
          <Typography className="body-regular" sx={{ color: 'var(--red-900)', fontWeight: 600 }}>
            {t('tr_requestErrorSubmit')}
          </Typography>
          <Typography className="body-small-regular" sx={{ color: 'var(--red-800)', marginTop: '4px' }}>
            {submitError}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexDirection: { '@': 'column', '@400': 'row' },
        }}
      >
        <TextField
          label={t('tr_firstname')}
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
          startIcon={<IconAccount color="var(--black)" />}
        />
        <TextField
          label={t('tr_lastname')}
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />
      </Box>

      {!country || !congregation ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
          }}
        >
          <IconLoading width={24} height={24} color="var(--accent-main)" />
          <Typography className="body-regular" sx={{ color: 'var(--grey-350)' }}>
            {t('tr_requestConnecting')}
          </Typography>
        </Box>
      ) : (
        <Button
          disabled={isProcessing}
          onClick={handleRequestAccess}
          startIcon={
            isProcessing && (
              <IconLoading width={22} height={22} color="var(--always-white)" />
            )
          }
        >
          {t('tr_requestAccess')}
        </Button>
      )}
    </Stack>
  );
};

export default RequestAccess;
