import { ListItem } from '@mui/material';
import {
  IconSettings,
  IconManageAccess,
  IconJwOrg,
  IconImportFile,
  IconSynced,
} from '@icons/index';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import useCongregation from '../congregation/useCongregation';
import useMeetingMaterials from '../meeting_materials/useMeetingMaterials';
import DashboardCard from '@features/dashboard/card';
import DashboardMenu from '@features/dashboard/menu';

const ConfiguracionCard = () => {
  const { t } = useAppTranslation();

  const {
    isAdmin,
    isElder,
    isGroup,
    isLanguageGroupOverseer,
    isMeetingEditor,
  } = useCurrentUser();

  const {
    secondaryText,
    handleManualSync,
    isConnected,
    isUserAdmin,
    requests_count,
  } = useCongregation();

  const { handleOpenJWImport, isNavigatorOnline, handleOpenEPUBFile } =
    useMeetingMaterials();

  // Determine if we should show congregation/group settings
  const showSettings = (!isGroup && (isAdmin || isElder)) || (isGroup && isLanguageGroupOverseer);

  // Determine if we should show the card at all
  const showCard = showSettings || isConnected || (isConnected && isUserAdmin) || isMeetingEditor;

  if (!showCard) return null;

  return (
    <DashboardCard header={t('tr_settings', 'Configuración')}>
      {/* 1. Ajustes de congregación / grupo */}
      {showSettings && (
        <ListItem disablePadding>
          <DashboardMenu
            path={isGroup ? '/group-settings' : '/congregation-settings'}
            icon={<IconSettings color="var(--black)" />}
            primaryText={isGroup ? t('tr_groupSettings') : t('tr_congregationSettings')}
          />
        </ListItem>
      )}

      {/* 2. Administrar acceso */}
      {isConnected && isUserAdmin && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconManageAccess color="var(--black)" />}
            primaryText={t('tr_manageAccess')}
            badgeText={requests_count}
            path="/manage-access"
          />
        </ListItem>
      )}

      {/* 3. Importar desde jw.org */}
      {isMeetingEditor && isNavigatorOnline && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconJwOrg color="var(--black)" />}
            primaryText={t('tr_sourceImportJw')}
            onClick={handleOpenJWImport}
          />
        </ListItem>
      )}

      {/* 4. Importar desde archivo .epub */}
      {isMeetingEditor && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconImportFile color="var(--black)" />}
            primaryText={t('tr_sourceImportEPUB')}
            onClick={handleOpenEPUBFile}
          />
        </ListItem>
      )}

      {/* 5. Sincronizar datos */}
      {isConnected && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={
              <IconSynced
                color="var(--black)"
                className="organized-sync-icon"
              />
            }
            primaryText={t('tr_syncAppData')}
            secondaryText={secondaryText}
            onClick={handleManualSync}
          />
        </ListItem>
      )}
    </DashboardCard>
  );
};

export default ConfiguracionCard;
