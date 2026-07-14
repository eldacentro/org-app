import { Box, Fade } from '@mui/material';
import { IconCongregationAccess, IconError } from '@icons/index';
import IconLoading from '@components/icon_loading';
import { useAppTranslation } from '@hooks/index';
import useCongregationAccessCode from './useCongregationAccessCode';
import PageHeader from '@features/app_start/shared/page_header';
import Button from '@components/button';
import InfoMessage from '@components/info-message';
import SwitchWithLabel from '@components/switch_with_label';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import WaitingLoader from '@components/waiting_loader';

const CongregationAccessCode = () => {
  const { t } = useAppTranslation();

  const {
    isLoading,
    isProcessing,
    hideMessage,
    message,
    title,
    variant,
    isVisible,
    setTmpAccessCode,
    tmpAccessCode,
    btnActionDisabled,
    handleValidateAccessCode,
    rememberKeys,
    setRememberKeys,
  } = useCongregationAccessCode();

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
      {isLoading && <WaitingLoader type="lottie" variant="standard" />}
      {!isLoading && (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
            }}
          >
            <PageHeader
              title={t('tr_congregationAccessCode')}
              description={t('tr_congregationAccessCodeLostDesc')}
            />

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                alignItems: 'flex-start',
                alignSelf: 'stretch',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  width: '100%',
                }}
              >
                <TextField
                  type="password"
                  label={t('tr_congregationAccessCodeAsk')}
                  variant="outlined"
                  autoComplete="off"
                  value={tmpAccessCode}
                  onChange={(e) => setTmpAccessCode(e.target.value)}
                  startIcon={<IconCongregationAccess />}
                  resetHelperPadding={true}
                />
              </Box>

              <Button
                variant="main"
                sx={{ width: '100%' }}
                onClick={handleValidateAccessCode}
                startIcon={
                  isProcessing ? (
                    <IconLoading
                      width={22}
                      height={22}
                      color="var(--always-white)"
                    />
                  ) : null
                }
                disabled={btnActionDisabled || isProcessing}
              >
                {t('tr_encryptionCodeValidate')}
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '100%',
                }}
              >
                <SwitchWithLabel
                  label={t('tr_eldaRememberKeysOnDevice')}
                  checked={rememberKeys}
                  onChange={setRememberKeys}
                />
                <Typography
                  className="label-small-regular"
                  color="var(--accent-400)"
                >
                  {t('tr_eldaRememberKeysDisclaimer')}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Fade in={isVisible} unmountOnExit timeout={150}>
            <Box>
              <InfoMessage
                variant={variant}
                messageIcon={<IconError />}
                messageHeader={title}
                message={message}
                onClose={hideMessage}
              />
            </Box>
          </Fade>
        </>
      )}
    </Box>
  );
};

export default CongregationAccessCode;
