import { Box } from '@mui/material';
import { IconGenerate, IconPrint, IconPublish } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useMidweek from './useMidweek';
import MidweekEditor from '@features/meetings/midweek_editor';
import MidweekExport from '@features/meetings/midweek_export';
import PageTitle from '@components/page_title';
import QuickSettingsMidweekMeeting from '@features/meetings/midweek_editor/quick_settings';
import SchedulePublish from '@features/meetings/schedule_publish';
import MeetingPublishNotice from '@features/meetings/publish_notice';
import ScheduleAutofillDialog from '@features/meetings/schedule_autofill';
import WeekPickerPanel from '@features/meetings/week_picker_panel';
import NavBarButton from '@components/nav_bar_button';
import LastModifiedInfo from '@components/last_modified_info';
import PendingSlips from '@features/meetings/midweek_editor/pending_slips';
import PorCambiar from '@features/meetings/midweek_editor/por_cambiar';

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
    openPublish,
    handleClosePublish,
    handleOpenPublish,
    selectedMonth,
    monthIsPublished,
    monthIsHistoric,
    hasWeeks,
    openAutofill,
    handleCloseAutofill,
    handleOpenAutofill,
    updatedAt,
    lastModifiedBy,
    changes,
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

      {/* Ya no depende de tener cuenta conectada: publicar decide ANTES que
          nada si la congregación ve el mes dentro de la aplicación, y eso no
          puede quedarse esperando a la red. La subida a la web pública, que sí
          la necesita, se salta sola cuando no la hay. */}
      {openPublish && (
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
              {!monthIsHistoric && (
                <NavBarButton
                  text={monthIsPublished ? 'Publicado' : t('tr_publish')}
                  main={!monthIsPublished}
                  icon={<IconPublish />}
                  onClick={handleOpenPublish}
                ></NavBarButton>
              )}
            </>
          )
        }
      />

      <MeetingPublishNotice type="midweek" month={selectedMonth} />

      {/* Las hojitas pendientes van AQUÍ y no en Programas semanales: eso es
          la vista de consulta, y esto es trabajo de quien las reparte. */}
      {hasWeeks && <PendingSlips />}

      {/* Las partes que hay que cambiar. Debajo de las hojitas y no encima: las
          hojitas son la tarea de todas las semanas, y esto sale solo cuando
          alguien ha avisado de que no puede. */}
      {hasWeeks && <PorCambiar />}

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

export default MidweekMeeting;
