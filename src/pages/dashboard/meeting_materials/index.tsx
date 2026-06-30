import { ListItem } from '@mui/material';
import { IconImportFile, IconJwOrg } from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import useMeetingMaterials from './useMeetingMaterials';
import useSharedHook from '../useSharedHook';
import DashboardCard from '@features/dashboard/card';
import DashboardMenu from '@features/dashboard/menu';

const MeetingsMaterialsCard = () => {
  const { t } = useAppTranslation();

  const { showMeetingCard } = useSharedHook();

  const { handleOpenJWImport, isNavigatorOnline, handleFileSelected } =
    useMeetingMaterials();

  if (!showMeetingCard) return null;

  return (
    <DashboardCard header={t('tr_meetingMaterials')}>

      {isNavigatorOnline && (
        <ListItem disablePadding>
          <DashboardMenu
            icon={<IconJwOrg color="var(--black)" />}
            primaryText={t('tr_sourceImportJw')}
            onClick={handleOpenJWImport}
          />
        </ListItem>
      )}

      <ListItem disablePadding sx={{ position: 'relative' }}>
        <DashboardMenu
          icon={<IconImportFile color="var(--black)" />}
          primaryText={t('tr_sourceImportEPUB')}
        />
        <input
          type="file"
          accept=".epub,.jwpub"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 1,
          }}
          onChange={handleFileSelected}
        />
      </ListItem>
    </DashboardCard>
  );
};

export default MeetingsMaterialsCard;
