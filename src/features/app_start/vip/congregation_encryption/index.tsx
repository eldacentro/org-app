import { Box, Typography } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import CongregationMasterKey from './congregation_master_key';
import CongregationAccessCode from './congregation_access_code';
import useCongregationEncryption from './useCongregationEncryption';
import WaitingLoader from '@components/waiting_loader';

const CongregationEncryption = () => {
  const { t } = useAppTranslation();

  const { setupMasterKey, setupAccessCode, checkingSavedKeys, autoEntering } =
    useCongregationEncryption();

  if (checkingSavedKeys || autoEntering) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          height: '100%',
          width: '100%',
        }}
      >
        <WaitingLoader type="lottie" variant="standard" />
        {autoEntering && (
          <Typography color="var(--accent-400)" sx={{ textAlign: 'center' }}>
            {t('tr_eldaEnteringWithSavedKeys')}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <>
      {setupMasterKey && <CongregationMasterKey />}
      {!setupMasterKey && setupAccessCode && <CongregationAccessCode />}
    </>
  );
};

export default CongregationEncryption;
