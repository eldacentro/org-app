import { Box } from '@mui/material';
import Switch from '@components/switch';
import SwitcherContainer from '@components/switcher_container';
import Typography from '@components/typography';
import {
  ProfileItemContainer,
  SettingWithBorderContainer,
} from '../index.styles';
import { useAppTranslation } from '@hooks/index';
import useCalendarExport from './useCalendarExport';

const CalendarExport = () => {
  const { t } = useAppTranslation();

  const { enabled, handleToggle } = useCalendarExport();

  return (
    <ProfileItemContainer>
      <SettingWithBorderContainer>
        <SwitcherContainer>
          <Switch
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography>{t('tr_calendarExportPreference')}</Typography>
            <Typography className="label-small-regular" color="var(--grey-350)">
              {t('tr_calendarExportPreferenceDesc')}
            </Typography>
          </Box>
        </SwitcherContainer>
      </SettingWithBorderContainer>
    </ProfileItemContainer>
  );
};

export default CalendarExport;
