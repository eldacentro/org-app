import { Box } from '@mui/material';
import { IconGenerate, IconPrint, IconPublish } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useMidweek from './useMidweek';
import MidweekEditor from '@features/meetings/midweek_editor';
import MidweekExport from '@features/meetings/midweek_export';
import PageTitle from '@components/page_title';
import QuickSettingsMidweekMeeting from '@features/meetings/midweek_editor/quick_settings';
import SchedulePublish from '@features/meetings/schedule_publish';
import ScheduleAutofillDialog from '@features/meetings/schedule_autofill';
import WeekPickerPanel from '@features/meetings/week_picker_panel';
import NavBarButton from '@components/nav_bar_button';
import LastModifiedInfo from '@components/last_modified_info';
import PendingSlips from '@features/meetings/midweek_editor/pending_slips';

const MidweekMeeting = () => {
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const {
    handleCloseQuickSettings,
    handleOpenQuickSettings,
    quickSettingsOpen,
    openExport,
    handleCloseExport,
    handleOpenExport,
    isConnected,
    openPublish,
    handleClosePublish,
    handleOpenPublish,
    hasWeeks,
    openAutofill,
    handleCloseAutofill,
    handleOpenAutofill,
    updatedAt,
    lastModifiedBy,
  } = useMidweek();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
        paddingBottom: !tablet688Up ? '60px' : '0px',
      }}
    >
      {quickSettingsOpen && (
        <QuickSettingsMidweekMeeting
          open={quickSettingsOpen}
          onClose={handleCloseQuickSettings}
        />
      )}

      {openExport && (
        <MidweekExport open={openExport} onClose={handleCloseExport} />
      )}

      {isConnected && openPublish && (
        <SchedulePublish
          type="midweek"
          open={openPublish}
          onClose={handleClosePublish}
        />
      )}

      {openAutofill && (
        <ScheduleAutofillDialog
          meeting="midweek"
          open={openAutofill}
          onClose={handleCloseAutofill}
        />
      )}

      <PageTitle
        title={t('tr_midweekMeeting')}
        quickSettings={handleOpenQuickSettings}
        buttons={
          hasWeeks && (
            <>
              <NavBarButton
                text={t('tr_export')}
                onClick={handleOpenExport}
                icon={<IconPrint />}
              ></NavBarButton>
              <NavBarButton
                text={t('tr_autofill')}
                onClick={handleOpenAutofill}
                icon={<IconGenerate />}
              ></NavBarButton>
              {isConnected && (
                <NavBarButton
                  text={t('tr_publish')}
                  main
                  icon={<IconPublish />}
                  onClick={handleOpenPublish}
                ></NavBarButton>
              )}
            </>
          )
        }
      />

      <LastModifiedInfo updatedAt={updatedAt} lastModifiedBy={lastModifiedBy} />

      {/* Las hojitas pendientes van AQUÍ y no en Programas semanales: eso es
          la vista de consulta, y esto es trabajo de quien las reparte. */}
      {hasWeeks && <PendingSlips />}

      <Box
        sx={{
          display: 'flex',
          flexDirection: desktopUp ? 'row' : 'column',
          gap: '16px',
          alignItems: desktopUp ? 'flex-start' : 'unset',
        }}
      >
        <WeekPickerPanel />
        <MidweekEditor />
      </Box>
    </Box>
  );
};

export default MidweekMeeting;
