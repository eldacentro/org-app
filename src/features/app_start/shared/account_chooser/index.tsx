import { Box } from '@mui/material';
import { IconGoogle } from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import useAccountChooser from './useAccountChooser';
import AccountType from './account_type';
import Markup from '@components/text_markup';
import Typography from '@components/typography';

const AccountChooser = () => {
  const { t } = useAppTranslation();

  const { handleChooseGoogle } = useAccountChooser();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '24px',
      }}
    >
      <Box>
        <Typography
          className="h1"
          color="var(--black)"
          sx={{ marginBottom: '16px' }}
        >
          {t('tr_welcomeApp')}
        </Typography>
        <Typography
          className="body-regular"
          color="var(--grey-400)"
          sx={{ marginBottom: '32px' }}
        >
          {t('tr_selectAccount')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AccountType
            startIcon={
              <IconGoogle
                width={32}
                height={32}
              />
            }
            text={t('tr_oauthGoogle')}
            onClick={handleChooseGoogle}
          />
        </Box>
      </Box>

      <Markup
        content={t('tr_oauthAccept')}
        className="body-small-regular"
        color="var(--grey-400)"
      />
    </Box>
  );
};

export default AccountChooser;
