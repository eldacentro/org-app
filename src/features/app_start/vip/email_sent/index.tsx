import { Box, Stack } from '@mui/material';
import { IconError } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useEmailSent from './useEmailSent';
import Divider from '@components/divider';
import InfoMessage from '@components/info-message';
import OTPInput from '@components/otp_input';
import PageHeader from '@features/app_start/shared/page_header';
import Typography from '@components/typography';

const EmailSent = () => {
  const { t } = useAppTranslation();

  const {
    hideMessage,
    message,
    title,
    variant,
    code,
    handleCodeChange,
    hasError,
    handleReturnChooser,
  } = useEmailSent();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <PageHeader
        title={t('tr_emailAuthSentHeader')}
        description={t('tr_emailAuthSent')}
        onClick={handleReturnChooser}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        <Stack spacing="24px">
          <Divider color="var(--accent-200)" />

          <Typography color="var(--grey-400)">
            {t('tr_loginEmailCode')}
          </Typography>

          <OTPInput
            value={code}
            onChange={handleCodeChange}
            hasError={hasError}
          />
        </Stack>

        <Box id="onboarding-error" sx={{ display: 'none' }}>
          <InfoMessage
            variant={variant}
            messageIcon={<IconError />}
            messageHeader={title}
            message={message}
            onClose={hideMessage}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default EmailSent;