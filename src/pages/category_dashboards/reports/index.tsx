import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import { Users, FileText, BarChart2 } from 'lucide-react';

const ReportsDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const { isElder, isAttendanceEditor, isGroupOverseer, isSecretary, isAdmin } = useCurrentUser();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_reports', 'Informes')} />
      <div className="section-label">
        <div className="t">{t('tr_reports', 'Informes')}</div>
      </div>
      <div className="tile-grid">
        
        {/* Registro de asistencia */}
        {(isAttendanceEditor || isElder || isSecretary || isGroupOverseer) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/reports/meeting-attendance')}>
            <div className="ti">
              <Users size={20} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_meetingAttendanceRecord', 'Registro de asistencia')}</div>
              <div className="tile-meta">Asistencia a las reuniones</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Registros de publicadores */}
        {(isElder || isSecretary) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/publisher-records')}>
            <div className="ti">
              <FileText size={20} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_publishersRecords', 'Registros de publicadores')}</div>
              <div className="tile-meta">Informes de la congregación</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Informes a la sucursal */}
        {(isAdmin || isSecretary) && (
          <div className="tile-item c-slate active-press full-width" onClick={() => handleTileClick('/reports/branch-office')}>
            <div className="ti">
              <BarChart2 size={20} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_branchOfficeReport', 'Informes a la sucursal')}</div>
              <div className="tile-meta">Envío de S-1 y más</div>
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

export default ReportsDashboard;
