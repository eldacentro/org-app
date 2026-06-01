import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import { User, Settings2, UserCheck } from 'lucide-react';

const SettingsDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const { isAdmin, isElder } = useCurrentUser();

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
            <User size={20} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_myProfile', 'Mi cuenta')}</div>
            <div className="tile-meta">Tus ajustes personales</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Ajustes de congregación */}
        {(isAdmin || isElder) && (
          <div className="tile-item c-slate active-press full-width" onClick={() => handleTileClick('/congregation-settings')}>
            <div className="ti">
              <Settings2 size={20} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_congregationSettings', 'Ajustes de congregación')}</div>
              <div className="tile-meta">Configuración general</div>
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
              <UserCheck size={20} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_manageAccess', 'Cuentas de usuario')}</div>
              <div className="tile-meta">Administrar accesos</div>
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
