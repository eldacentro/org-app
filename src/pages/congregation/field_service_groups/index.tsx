import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import useFieldServiceGroups from './useFieldServiceGroups';
import CreateGroup from '@features/congregation/field_service_groups/create_group';
import FieldServiceGroupsContainer from '@features/congregation/field_service_groups';
import GroupsReorder from '@features/congregation/field_service_groups/groups_reorder';
import PageTitle from '@components/page_title';
import QuickSettingsFieldServiceGroups from '@features/congregation/field_service_groups/quick_settings';
import { fieldGroupsState } from '@states/field_service_groups';
import LastModifiedInfo from '@components/last_modified_info';

const FieldServiceGroups = () => {
  const groups = useAtomValue(fieldGroupsState);

  const lastUpdate = groups.reduce((acc, curr) => {
    const currDate = curr.group_data.updatedAt;
    if (!acc || new Date(currDate) > new Date(acc.updatedAt)) {
      return {
        updatedAt: currDate,
        lastModifiedBy: curr.group_data.lastModifiedBy,
      };
    }
    return acc;
  }, null as { updatedAt: string; lastModifiedBy: string });

  const { t } = useAppTranslation();

  const {
    buttons,
    groupAddOpen,
    handleCloseGroupAdd,
    handleCloseReorder,
    reorderOpen,
    handleOpenQuickSettings,
    handleCloseQuickSettings,
    quickSettingsOpen,
    isServiceCommittee,
  } = useFieldServiceGroups();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
      }}
    >
      {quickSettingsOpen && (
        <QuickSettingsFieldServiceGroups
          open={quickSettingsOpen}
          onClose={handleCloseQuickSettings}
        />
      )}

      {groupAddOpen && (
        <CreateGroup open={groupAddOpen} onClose={handleCloseGroupAdd} />
      )}

      {reorderOpen && (
        <GroupsReorder open={reorderOpen} onClose={handleCloseReorder} />
      )}

      <PageTitle
        title={t('tr_fieldServiceGroups')}
        buttons={buttons}
        quickSettings={isServiceCommittee ? handleOpenQuickSettings : undefined}
      />

      <LastModifiedInfo
        updatedAt={lastUpdate?.updatedAt}
        lastModifiedBy={lastUpdate?.lastModifiedBy}
      />

      <FieldServiceGroupsContainer />
    </Box>
  );
};

export default FieldServiceGroups;
