import { Box } from '@mui/material';
import { IconClose, IconInfo, IconLogo, IconRestart } from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import { AboutProps } from './index.types';
import useAbout from './useAbout';
import Dialog from '@components/dialog';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';
import Tooltip from '@components/tooltip';

const About = (props: AboutProps) => {
  const {
    currentYear,
    handleClose,
    isOpen,
    handleForceReload,
  } = useAbout(props);

  const { t } = useAppTranslation();

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          width: '100%',
        }}
      >
        <IconInfo color="var(--black)" />
        <Box
          sx={{
            display: 'flex',
            padding: 'var(--radius-none)',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flex: '1 0 0',
          }}
        >
          <Typography className="h2">{t('tr_about')}</Typography>
          <IconButton onClick={handleClose}>
            <IconClose color="var(--black)" />
          </IconButton>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            padding: 'var(--radius-none)',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <IconLogo width={40} height={40} />
          <Box>
            <Typography className="h3">Elda Centro</Typography>
            <Typography className="body-regular" color="var(--grey-350)">
              {import.meta.env.PACKAGE_VERSION}
            </Typography>
          </Box>
        </Box>
        <Tooltip title={t('tr_forceRefreshButtonTooltip')} delaySpeed="slow">
          <IconButton onClick={handleForceReload}>
            <IconRestart color="var(--black)" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography className="body-small-regular" color="var(--grey-350)">
        © {currentYear} Congregación Elda Centro
      </Typography>
    </Dialog>
  );
};

export default About;
