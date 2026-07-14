import SwitchWithLabel from '@components/switch_with_label';
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
        <SwitchWithLabel
          label={t('tr_calendarExportPreference')}
          helper={t('tr_calendarExportPreferenceDesc')}
          checked={enabled}
          onChange={handleToggle}
        />
      </SettingWithBorderContainer>
    </ProfileItemContainer>
  );
};

export default CalendarExport;
