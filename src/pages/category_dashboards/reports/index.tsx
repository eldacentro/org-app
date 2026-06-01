import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconGroups,
  IconPublisherRecordCard,
  IconReportToBranch,
} from '@icons/index';

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
              <IconGroups color="var(--brand)" width={22} height={22} />
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
              <IconPublisherRecordCard color="var(--brand)" width={22} height={22} />
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
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/reports/branch-office')}>
            <div className="ti">
              <IconReportToBranch color="var(--brand)" width={22} height={22} />
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
