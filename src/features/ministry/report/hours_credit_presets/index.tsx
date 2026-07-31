import { Box, Menu } from '@mui/material';
import Button from '@components/button';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import { IconArrowDown } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { HoursCreditPresetsProps } from './index.types';
import useHoursCreditPresets from './useHoursCreditPresets';
import Typography from '@components/typography';
import PresetItem from './preset_item';

const HoursCreditPresets = (props: HoursCreditPresetsProps) => {
  const { t } = useAppTranslation();

  const {
    presetsOpen,
    handleTogglePresets,
    presets,
    handleClosePreset,
    otherOpen,
    otherLabel,
    setOtherLabel,
    otherHours,
    setOtherHours,
    handlePresetSelected,
    handleConfirmOther,
    handleCancelOther,
  } = useHoursCreditPresets(props.onSelect);

  return (
    <>
      <Box sx={{ flex: 1 }}>
        <Box
          onClick={props.readOnly ? null : handleTogglePresets}
          sx={{
            width: 'fit-content',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: !props.readOnly && 'pointer',
          }}
        >
          <Typography sx={{ userSelect: 'none' }}>
            {t('tr_creditHours')}
          </Typography>

          {!props.readOnly && (
            <IconArrowDown
              color="var(--black)"
              sx={{
                transform: presetsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </Box>
      </Box>

      {props.anchorEl.current && (
        <Menu
          disableAutoFocus={true}
          disableAutoFocusItem={true}
          disableScrollLock={true}
          anchorEl={props.anchorEl.current}
          open={presetsOpen}
          onClose={handleTogglePresets}
          sx={{
            padding: '8px 0',
            '& li': {
              borderBottom: '1px solid var(--line)',
            },
            '& li:last-child': {
              borderBottom: 'none',
            },
          }}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
          slotProps={{
            paper: {
              style: {
                borderRadius: 'var(--shape-sm)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--card)',
                width: props.anchorEl.current.clientWidth,
              },
            },
          }}
        >
          <Typography
            className="body-small-semibold"
            color="var(--grey-400)"
            sx={{ padding: '4px 16px' }}
          >
            {t('tr_presets')}
          </Typography>

          {presets.map((preset) => (
            <PresetItem
              key={preset.name}
              preset={preset}
              onClose={handleClosePreset}
              onSelect={handlePresetSelected}
            />
          ))}
        </Menu>
      )}

      {/* "Otro": hay que preguntar el motivo y las horas */}
      <Dialog
        open={otherOpen}
        onClose={handleCancelOther}
        sx={{ padding: '24px' }}
      >
        <Typography className="h2">{t('tr_eldaCreditOther')}</Typography>

        <Typography color="var(--grey-400)">
          {t('tr_eldaCreditOtherDesc')}
        </Typography>

        <TextField
          label={t('tr_eldaCreditOtherLabel')}
          value={otherLabel}
          onChange={(e) => setOtherLabel(e.target.value)}
        />

        <TextField
          label={t('tr_hours')}
          type="number"
          value={otherHours}
          onChange={(e) => setOtherHours(e.target.value)}
        />

        <Box
          sx={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            width: '100%',
          }}
        >
          <Button variant="secondary" onClick={handleCancelOther}>
            {t('tr_cancel')}
          </Button>
          <Button
            variant="main"
            disabled={!otherLabel.trim() || +otherHours <= 0}
            onClick={handleConfirmOther}
          >
            {t('tr_add')}
          </Button>
        </Box>
      </Dialog>
    </>
  );
};

export default HoursCreditPresets;
