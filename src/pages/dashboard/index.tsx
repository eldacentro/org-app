import { Box } from '@mui/material';
import { IconCheckCircle } from '@icons/index';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import useDashboard from './useDashboard';
import CongregationCard from './congregation';
import LanguageGroupSelector from '@features/language_group_selector';
import Markup from '@components/text_markup';
import MinistryCard from './ministry';
import MeetingsCard from './meetings';
import ConfiguracionCard from './configuracion';
import PublicTalksCard from './public_talks';
import ReportsCard from './reports';
import Snackbar from '@components/snackbar';
import Typography from '@components/typography';
import PageTitle from '@components/page_title';
import useSharedHook from './useSharedHook';

const Dashboard = () => {
  const { t } = useAppTranslation();

  const { tablet688Up } = useBreakpoints();

  const {
    isPublisher,
    isElder,
    isAttendanceEditor,
    isGroupOverseer,
    isWeekendEditor,
    isPublicTalkCoordinator,
  } = useCurrentUser();

  const { showWeekend } = useSharedHook();

  const {
    firstName,
    handleOpenMyAssignments,
    countFutureAssignments,
    handleCloseNewCongNotice,
    newCongSnack,
  } = useDashboard();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle />
      <Box
        sx={{
          display: 'flex',
          alignItems: tablet688Up ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          flexDirection: tablet688Up ? 'row' : 'column',
        }}
      >
        <Box>
          <Typography className="h1">
            {t('tr_greeting', { firstName })} &#128075;
          </Typography>
          <Markup
            content={
              countFutureAssignments === 0
                ? t('tr_noMeetingAssignments')
                : t('tr_meetingAssignments', {
                    assignment: countFutureAssignments,
                  })
            }
            className="h3"
            anchorClassName="h3"
            anchorColor="var(--accent-main)"
            anchorClick={handleOpenMyAssignments}
          />
        </Box>

        <LanguageGroupSelector />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gridGap: '24px',
        }}
      >
        <MeetingsCard assignmentCount={countFutureAssignments} />

        {isPublisher && <MinistryCard />}

        <CongregationCard />

        {showWeekend && (isElder || isWeekendEditor || isPublicTalkCoordinator) && (
          <PublicTalksCard />
        )}

        {(isElder || isAttendanceEditor || isGroupOverseer) && <ReportsCard />}

        <ConfiguracionCard />
      </Box>

      {newCongSnack && (
        <Snackbar
          open={newCongSnack}
          variant="success"
          messageIcon={<IconCheckCircle color="var(--always-white)" />}
          messageHeader={t('tr_welcomeCongregationTitle')}
          message={t('tr_welcomeCongregationDesc')}
          onClose={handleCloseNewCongNotice}
        />
      )}
    </Box>
  );
};

export default Dashboard;
