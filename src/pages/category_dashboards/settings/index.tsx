import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconAccount,
  IconSettings,
  IconManageAccess,
  IconJwOrg,
  IconImportFile,
  IconSynced,
} from '@icons/index';
import useCongregation from '@pages/dashboard/congregation/useCongregation';
import useMeetingMaterials from '@pages/dashboard/meeting_materials/useMeetingMaterials';

const SettingsDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const {
    isAdmin,
    isElder,
    isMeetingEditor,
  } = useCurrentUser();

  const {
    secondaryText,
    handleManualSync,
    isConnected,
  } = useCongregation();

  const { handleOpenJWImport, isNavigatorOnline, handleOpenEPUBFile, fileInputRef, handleFileSelected } =
    useMeetingMaterials();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_settings', 'Configuración')} />
      <div className="section-label">
        <div className="t">{t('tr_settings', 'Configuración')}</div>
      </div>
      <div className="tile-grid">
        
        {/* Mi cuenta */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/user-profile')}>
          <div className="ti">
            <IconAccount color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_myProfile', 'Mi cuenta')}</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Ajustes de congregación */}
        {(isAdmin || isElder) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/congregation-settings')}>
            <div className="ti">
              <IconSettings color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_congregationSettings', 'Ajustes de congregación')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Cuentas de usuario */}
        {(isAdmin) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/manage-access')}>
            <div className="ti">
              <IconManageAccess color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_manageAccess', 'Cuentas de usuario')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Importar desde jw.org */}
        {isMeetingEditor && isNavigatorOnline && (
          <div className="tile-item c-blue active-press full-width" onClick={handleOpenJWImport}>
            <div className="ti">
              <IconJwOrg color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_sourceImportJw', 'Importar desde jw.org')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Importar desde archivo .jwpub */}
        {isMeetingEditor && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,.jwpub"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        )}
        {isMeetingEditor && (
          <div className="tile-item c-blue active-press full-width" onClick={handleOpenEPUBFile}>
            <div className="ti">
              <IconImportFile color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_sourceImportEPUB', 'Importar desde archivo .epub')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Sincronizar datos */}
        {isConnected && (
          <div className="tile-item c-blue active-press full-width" onClick={handleManualSync}>
            <div className="ti">
              <IconSynced color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_syncAppData', 'Sincronizar datos')}</div>
              <div className="tile-meta">{secondaryText || 'Sincronizar información'}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

      </div>
    </Box>
  );
};

export default SettingsDashboard;
