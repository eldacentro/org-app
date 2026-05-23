import { ListItem } from '@mui/material';
import { IconPodium, IconVisitingSpeaker, IconOutgoindSpeaker } from '@icons/index';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import useSharedHook from '../useSharedHook';
import DashboardCard from '@features/dashboard/card';
import DashboardMenu from '@features/dashboard/menu';

const PublicTalksCard = () => {
  const { t } = useAppTranslation();

  const { isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();

  const { showWeekend } = useSharedHook();

  if (!showWeekend) return null;

  return (
    <DashboardCard header={t('tr_publicTalksLong', 'Discursos públicos')}>
      <ListItem disablePadding>
        <DashboardMenu
          icon={<IconPodium color="var(--black)" />}
          primaryText={t('tr_publicTalksList')}
          path="/public-talks-list"
        />
      </ListItem>

      <ListItem disablePadding>
        <DashboardMenu
          icon={<IconVisitingSpeaker color="var(--black)" />}
          primaryText={t('tr_speakersCatalog')}
          path="/speakers-catalog"
        />
      </ListItem>

      {(isWeekendEditor || isPublicTalkCoordinator) && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconOutgoindSpeaker color="var(--black)" />}
            primaryText="Oradores salientes"
            path="/outgoing-speakers"
          />
        </ListItem>
      )}
    </DashboardCard>
  );
};

export default PublicTalksCard;
