import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconMinistryReport,
  IconStatsYear,
  IconCart,
  IconMapOverview,
} from '@icons/index';

const MinistryDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const { isPublisher, isServiceCommittee } = useCurrentUser();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_ministry', 'Predicación')} />
      <div className="section-label">
        <div className="t">{t('tr_ministry', 'Predicación')}</div>
      </div>
      <div className="tile-grid">
        {/* Territorios */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/congregation/territories')}>
          <div className="ti">
            <IconMapOverview color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Territorios</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Exhibidores */}
        {(isServiceCommittee) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/exhibitors')}>
            <div className="ti">
              <IconCart color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Exhibidores</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Informe */}
        {(isPublisher) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/ministry-report')}>
            <div className="ti">
              <IconMinistryReport color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_report', 'Informe')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Año de servicio */}
        {(isPublisher) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/service-year')}>
            <div className="ti">
              <IconStatsYear color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_serviceYear', 'Año de servicio')}</div>
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

export default MinistryDashboard;
