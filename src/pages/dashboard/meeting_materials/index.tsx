import { ListItem } from '@mui/material';
import { IconJwOrg } from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import useSharedHook from '../useSharedHook';
import DashboardCard from '@features/dashboard/card';
import DashboardMenu from '@features/dashboard/menu';

const MeetingsMaterialsCard = () => {
  const { t } = useAppTranslation();

  const { showMeetingCard } = useSharedHook();

  if (!showMeetingCard) return null;

  return (
    <DashboardCard header={t('tr_meetingMaterials')}>

      {/* Los dos importadores viven en su propia página, junto con lo que hay
          importado y lo que falta. */}
      <ListItem disablePadding>
        <DashboardMenu
          icon={<IconJwOrg color="var(--black)" />}
          primaryText={t('tr_meetingMaterials', 'Materiales de reunión')}
          path="/meeting-materials"
        />
      </ListItem>
    </DashboardCard>
  );
};

export default MeetingsMaterialsCard;
