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
import IconLoading from '@components/icon_loading';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';
import { formatBuildDate } from '@utils/build_info';

const About = (props: AboutProps) => {
  const {
    currentYear,
    handleClose,
    isOpen,
    handleForceReload,
    instantSyncText,
    updateStatus,
    handleFullReDownload,
    isConnected,
    ConfirmDialogNode,
  } = useAbout(props);

  const { t } = useAppTranslation();

  const buildDateLabel = formatBuildDate(Number(__BUILD_NUMBER__) || null);

  // Qué se lee debajo del título mientras se busca la actualización. Decir en
  // qué punto va —y cómo acabó— es lo que faltaba: la comprobación tarda, y en
  // silencio parecía que el botón no hacía nada.
  const updateMessage = {
    idle: { text: t('tr_forceRefreshDesc'), color: undefined },
    checking: { text: 'Buscando una versión nueva…', color: undefined },
    updating: {
      text: 'Versión nueva encontrada. Instalando y recargando…',
      color: 'var(--green-main)',
    },
    'up-to-date': {
      text: 'Ya tienes la última versión. Recargando…',
      color: 'var(--green-main)',
    },
    unavailable: {
      text: 'No se ha podido comprobar. Revisa la conexión y vuelve a intentarlo.',
      color: 'var(--orange-main)',
    },
    reloading: { text: 'Recargando la aplicación…', color: undefined },
  }[updateStatus];

  // Fila de mantenimiento: icono + (título + explicación), toda la fila
  // pulsable. Mismo lenguaje visual que los elementos de menú de la app.
  const MaintenanceRow = ({
    icon,
    title,
    description,
    descriptionColor,
    onClick,
    busy,
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    descriptionColor?: string;
    onClick: () => void;
    busy?: boolean;
  }) => (
    <Box
      role="button"
      tabIndex={0}
      aria-busy={busy}
      onClick={busy ? undefined : onClick}
      onKeyDown={(e) =>
        !busy && (e.key === 'Enter' || e.key === ' ') ? onClick() : null
      }
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: 'var(--shape-sm)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--accent-100)',
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.7 : 1,
        transition:
          'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), opacity var(--motion-fast) var(--ease-standard)',
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
        <Typography
          className="label-small-regular"
          color={descriptionColor ?? 'var(--grey-350)'}
        >
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
          <IconButton aria-label="Cerrar" onClick={handleClose}>
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
            {/* La fecha del build en vez del número: es lo que de verdad
                entiende cualquiera cuando hay que comprobar si un dispositivo
                está al día ("la tuya es del 12 de julio"). */}
            {import.meta.env.PACKAGE_VERSION}
            {buildDateLabel ? ` · ${buildDateLabel}` : ''} · {__BUILD_SHA__}
          </Typography>
          {/* Sincronización al momento: sin esta línea no había forma de saber
              si el aviso seguía llegando, y perderlo solo se nota en que la
              app "va lenta". */}
          <Typography className="label-small-regular" color="var(--grey-350)">
            Sincronización al momento · {instantSyncText}
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
          icon={
            updateStatus === 'checking' || updateStatus === 'updating' ? (
              <IconLoading color="var(--black)" width={22} height={22} />
            ) : (
              <IconRestart color="var(--black)" width={22} height={22} />
            )
          }
          title={t('tr_forceRefreshTitle')}
          description={updateMessage.text}
          descriptionColor={updateMessage.color}
          busy={updateStatus === 'checking' || updateStatus === 'updating'}
          onClick={handleForceReload}
        />

        {isConnected && (
          <MaintenanceRow
            icon={
              <IconCloudDownload color="var(--black)" width={22} height={22} />
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
