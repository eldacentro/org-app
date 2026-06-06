import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconTalk,
  IconTalker,
  IconOutgoindSpeaker,
} from '@icons/index';

const TalksDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  
  const { isElder, isWeekendEditor, isPublicTalkCoordinator, isAppointed } = useCurrentUser();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      <PageTitle title={t('tr_publicTalks', 'Discursos')} />
      <div className="section-label">
        <div className="t">{t('tr_publicTalks', 'Discursos')}</div>
      </div>
      <div className="tile-grid">
        
        {/* Lista de discursos públicos */}
        {(isElder || isWeekendEditor || isPublicTalkCoordinator) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/public-talks-list')}>
            <div className="ti">
              <IconTalk color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_publicTalksList', 'Lista de discursos públicos')}</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Catálogo de oradores */}
        {(isAppointed || isPublicTalkCoordinator) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/speakers-catalog')}>
            <div className="ti">
              <IconTalker color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Catálogo de oradores</div>
            </div>
            <svg className="chev-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* Oradores salientes */}
        {(isAppointed || isPublicTalkCoordinator) && (
          <div className="tile-item c-blue active-press full-width" onClick={() => handleTileClick('/outgoing-speakers')}>
            <div className="ti">
              <IconOutgoindSpeaker color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_outgoingTalks', 'Oradores salientes')}</div>
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

export default TalksDashboard;
