import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { useSetAtom } from 'jotai';
import { isMyAssignmentOpenState } from '@states/app';
import PageTitle from '@components/page_title';
import { ClipboardCheck, Calendar, BookOpen, Users, Building2 } from 'lucide-react';

const MeetingsDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const setIsMyAssignmentOpen = useSetAtom(isMyAssignmentOpenState);
  
  const { isMidweekEditor, isWeekendEditor } = useCurrentUser();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  const handleOpenMyAssignments = () => {
    setIsMyAssignmentOpen(true);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_meetings', 'Reuniones')} />
      <div className="section-label">
        <div className="t">{t('tr_meetings', 'Reuniones')}</div>
      </div>
      <div className="tile-grid">
        
        {/* Mis Asignaciones */}
        <div className="tile-item c-blue active-press full-width" onClick={handleOpenMyAssignments}>
          <div className="ti">
            <ClipboardCheck size={20} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_viewMyAssignments', 'Mis asignaciones')}</div>
            <div className="tile-meta">Ver tus asignaciones pendientes</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Programas Semanales */}
        <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/weekly-schedules')}>
          <div className="ti">
            <Calendar size={20} />
          </div>
          <div className="tile-body">
            <div className="tile-name">{t('tr_viewAssignmentsSchedule', 'Programas semanales')}</div>
            <div className="tile-meta">Programa general de la congregación</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

        {/* Reunión de entre semana */}
        {(isMidweekEditor) && (
          <div className="tile-item c-blue active-press" onClick={() => handleTileClick('/midweek-meeting')}>
            <div className="ti">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="tile-name">{t('tr_midweekMeeting', 'Reunión de entre semana')}</div>
            </div>
          </div>
        )}

        {/* Reunión de fin de semana */}
        {(isWeekendEditor) && (
          <div className="tile-item c-blue active-press" onClick={() => handleTileClick('/weekend-meeting')}>
            <div className="ti">
              <Users size={20} />
            </div>
            <div>
              <div className="tile-name">{t('tr_weekendMeeting', 'Reunión de fin de semana')}</div>
            </div>
          </div>
        )}

        {/* Departamentos */}
        <div className="tile-item c-slate active-press full-width" onClick={() => handleTileClick('/departments-schedule')}>
          <div className="ti">
            <Building2 size={20} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Departamentos</div>
            <div className="tile-meta">Acomodadores, audio, etc.</div>
          </div>
          <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>

      </div>
    </Box>
  );
};

export default MeetingsDashboard;
