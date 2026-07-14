import { Box } from '@mui/material';
import ColorSchemeSwitcher from '@features/color_scheme_selector';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Switch from '@components/switch';
import SwitcherContainer from '@components/switcher_container';
import SwitchWithLabel from '@components/switch_with_label';
import Typography from '@components/typography';
import {
  ProfileItemContainer,
  SettingWithBorderContainer,
} from '../index.styles';
import { useAppTranslation } from '@hooks/index';
import useAppSettings from './useAppSettings';

const AppSettings = () => {
  const { t } = useAppTranslation();

  const {
    autoSync,
    handleSwitchAutoBackup,
    autoSyncInterval,
    handleUpdateSyncInterval,
    laptopUp,
    handleUpdateSyncTheme,
    syncTheme,
    showPdfExportPersonal,
    pdfExportPersonalEnabled,
    handleSwitchPdfExportPersonal,
  } = useAppSettings();

  return (
    <ProfileItemContainer>
      <Typography className="h2">{t('tr_organizedSettings')}</Typography>

      <SettingWithBorderContainer>
        <SwitcherContainer>
          <Switch
            checked={autoSync}
            onChange={(e) => handleSwitchAutoBackup(e.target.checked)}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: laptopUp ? 'center' : 'flex-start',
              gap: '16px',
              justifyContent: 'space-between',
              flexGrow: 1,
              flexDirection: laptopUp ? 'row' : 'column',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Typography>{t('tr_autoSync')}</Typography>
              <Typography
                className="label-small-regular"
                color="var(--grey-350)"
              >
                {t('tr_autoSyncDesc')}
              </Typography>
            </Box>
            <Select
              label={t('tr_syncInterval')}
              value={autoSyncInterval.toString()}
              onChange={(e) => handleUpdateSyncInterval(+e.target.value)}
              sx={{ maxWidth: '200px' }}
            >
              {[5, 15, 30, 45].map((time) => (
                <MenuItem key={time} value={time.toString()}>
                  <Typography className="body-regular" color="var(--black)">
                    {`${time} ${t('tr_minLabel')}`}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </Box>
        </SwitcherContainer>

        <SwitchWithLabel
          label={t('tr_autoThemeChange')}
          helper={t('tr_autoThemeChangeDesc')}
          checked={syncTheme}
          onChange={handleUpdateSyncTheme}
        />

        {showPdfExportPersonal && (
          <SwitchWithLabel
            label={t('tr_pdfExportPersonalEnabled', 'Habilitar exportación a PDF para mi cuenta')}
            helper={t(
              'tr_pdfExportPersonalEnabledDesc',
              'Muestra los botones de exportar/imprimir a PDF solo para tu cuenta, sin afectar a los demás.'
            )}
            checked={pdfExportPersonalEnabled}
            onChange={handleSwitchPdfExportPersonal}
          />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Typography className="h4">{t('tr_colorScheme')}</Typography>

          <ColorSchemeSwitcher />
        </Box>
      </SettingWithBorderContainer>
    </ProfileItemContainer>
  );
};

export default AppSettings;
