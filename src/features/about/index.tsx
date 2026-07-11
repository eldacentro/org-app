import { ReactNode } from 'react';
import { Box } from '@mui/material';
import {
  IconClose,
  IconCloudDownload,
  IconInfo,
  IconLogo,
  IconRestart,
} from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import { AboutProps } from './index.types';
import useAbout from './useAbout';
import Dialog from '@components/dialog';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';

const About = (props: AboutProps) => {
  const {
    currentYear,
    handleClose,
    isOpen,
    handleForceReload,
    handleFullReDownload,
    isConnected,
    ConfirmDialogNode,
  } = useAbout(props);

  const { t } = useAppTranslation();

  // Fila de mantenimiento: icono + (título + explicación), toda la fila
  // pulsable. Mismo lenguaje visual que los elementos de menú de la app.
  const MaintenanceRow = ({
    icon,
    title,
    description,
    onClick,
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    onClick: () => void;
  }) => (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) =>
        e.key === 'Enter' || e.key === ' ' ? onClick() : null
      }
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--accent-100)',
        cursor: 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': {
          backgroundColor: 'var(--accent-150)',
          borderColor: 'var(--accent-300)',
        },
        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '24px',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Typography className="body-small-semibold">{title}</Typography>
        <Typography className="label-small-regular" color="var(--grey-350)">
          {description}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      {ConfirmDialogNode}
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
          gap: '16px',
          width: '100%',
        }}
      >
        <IconLogo width={40} height={40} color="var(--brand)" />
        <Box>
          <Typography className="h3">Elda Centro</Typography>
          <Typography className="body-regular" color="var(--grey-350)">
            {import.meta.env.PACKAGE_VERSION} (#{__BUILD_NUMBER__}) ·{' '}
            {__BUILD_SHA__}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        <MaintenanceRow
          icon={<IconRestart color="var(--black)" width={22} height={22} />}
          title={t('tr_forceRefreshTitle')}
          description={t('tr_forceRefreshDesc')}
          onClick={handleForceReload}
        />

        {isConnected && (
          <MaintenanceRow
            icon={
              <IconCloudDownload
                color="var(--black)"
                width={22}
                height={22}
              />
            }
            title={t('tr_reDownloadDataTitle')}
            description={t('tr_reDownloadDataDesc')}
            onClick={handleFullReDownload}
          />
        )}
      </Box>

      <Typography className="body-small-regular" color="var(--grey-350)">
        © {currentYear} Congregación Elda Centro
      </Typography>
    </Dialog>
  );
};

export default About;
