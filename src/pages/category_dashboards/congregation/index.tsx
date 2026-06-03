import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconPerson,
  IconGroups,
  IconPioneerForm,
  IconNextEvents,
} from '@icons/index';

const CongregationDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const { isElder, isPersonViewer } = useCurrentUser();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_congregation', 'Congregación')} />
      <div className="section-label">
        <div className="t">{t('tr_congregation', 'Congregación')}</div>
      </div>
      <div className="tile-grid">
        
        {/* Personas */}
        {(isPersonViewer || isElder) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/persons')}>
            <div className="ti">
              <IconPerson color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_persons', 'Personas')}</div>
              <div className="tile-meta">Registro y perfiles</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Grupos de predicación */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/field-service-groups')}>
          <div className="ti">
            <IconGroups color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_fieldServiceGroups', 'Grupos de predicación')}</div>
            <div className="tile-meta">Tus grupos asignados</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Responsabilidades */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/congregation/responsabilidades')}>
          <div className="ti">
            <IconGroups color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Responsabilidades</div>
            <div className="tile-meta">Cargos y departamentos</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Solicitudes de precursor */}
        {(isElder) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/pioneer-applications')}>
            <div className="ti">
              <IconPioneerForm color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_pioneerApplications', 'Solicitudes de precursor')}</div>
              <div className="tile-meta">Revisión de solicitudes</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Próximos eventos */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/activities/upcoming-events')}>
          <div className="ti">
            <IconNextEvents color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Próximos eventos</div>
            <div className="tile-meta">Calendario de actividades</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

      </div>
    </Box>
  );
};

export default CongregationDashboard;
