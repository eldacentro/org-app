import { Box } from '@mui/material';
import { IconPrint, IconGenerate, IconPublish } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useWeekend from './useWeekend';
import WeekendEditor from '@features/meetings/weekend_editor';
import WeekendExport from '@features/meetings/weekend_export';
import PageTitle from '@components/page_title';
import QuickSettingsWeekendMeeting from '@features/meetings/weekend_editor/quick_settings';
import SchedulePublish from '@features/meetings/schedule_publish';
import ScheduleAutofillDialog from '@features/meetings/schedule_autofill';
import WeekPickerPanel from '@features/meetings/week_picker_panel';
import NavBarButton from '@components/nav_bar_button';
import LastModifiedInfo from '@components/last_modified_info';
import { useAtomValue } from 'jotai';
import { pdfExportEnabledState } from '@states/settings';

const WeekendMeeting = () => {
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const {
    hasWeeks,
    openAutofill,
    handleCloseAutofill,
    handleOpenAutofill,
    openExport,
    handleCloseExport,
    handleOpenExport,
    handleClosePublish,
    handleOpenPublish,
    isConnected,
    openPublish,
    handleCloseQuickSettings,
    handleOpenQuickSettings,
    quickSettingsOpen,
    updatedAt,
    lastModifiedBy,
    changes,
  } = useWeekend();

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
        <QuickSettingsWeekendMeeting
          open={quickSettingsOpen}
          onClose={handleCloseQuickSettings}
        />
      )}

      {openExport && (
        <WeekendExport open={openExport} onClose={handleCloseExport} />
      )}

      {isConnected && openPublish && (
        <SchedulePublish
          type="weekend"
          open={openPublish}
          onClose={handleClosePublish}
        />
      )}

      {openAutofill && (
        <ScheduleAutofillDialog
          meeting="weekend"
          open={openAutofill}
          onClose={handleCloseAutofill}
        />
      )}

      <PageTitle
        title={t('tr_weekendMeeting')}
        quickSettings={handleOpenQuickSettings}
        buttons={
          hasWeeks && (
            <>
              {pdfExportEnabled && (
                <NavBarButton
                  text={t('tr_export')}
                  onClick={handleOpenExport}
                  icon={<IconPrint />}
                ></NavBarButton>
              )}
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

      <Box
        sx={{
          display: 'flex',
          flexDirection: desktopUp ? 'row' : 'column',
          gap: '16px',
          alignItems: desktopUp ? 'flex-start' : 'unset',
        }}
      >
        <WeekPickerPanel />
        <WeekendEditor />
      </Box>

      {/* Al pie: es contexto, no titular. Debajo del título era lo segundo
          que se leía al abrir la página, por delante del programa. */}
      <LastModifiedInfo
        updatedAt={updatedAt}
        lastModifiedBy={lastModifiedBy}
        changes={changes}
      />
    </Box>
  );
};

export default WeekendMeeting;
