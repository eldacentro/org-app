import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useServerSnapshots from './useServerSnapshots';
import Button from '@components/button';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';
import WaitingLoader from '@components/waiting_loader';
import { IconSync } from '@components/icons';

const ServerSnapshotsTab = () => {
  const { t } = useAppTranslation();

  const {
    isLoading,
    isRestoring,
    isLocking,
    isForcing,
    scheduleLocked,
    handleToggleLock,
    handleForceResync,
    tableOptions,
    availableDates,
    selectedTable,
    setSelectedTable,
    selectedDate,
    setSelectedDate,
    previewForDate,
    handleRestore,
  } = useServerSnapshots();

  // Etiqueta de fecha con info estructural (solo programas): "2026-07-08 ·
  // 117 sem · jul/ago ✓". Ayuda a elegir un snapshot completo vs. truncado.
  const dateLabel = (date: string) => {
    if (selectedTable !== 'schedules') return date;
    const p = previewForDate(date);
    if (!p || p.weeks < 0) return date;
    const julAug = p.julyAugust > 0 ? '✓' : '✗';
    return `${date} · ${p.weeks} sem · jul/ago ${julAug}`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingTop: '8px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          borderRadius: 'var(--radius-l)',
          border: `1px solid ${scheduleLocked ? 'var(--red-main)' : 'var(--accent-200)'}`,
          backgroundColor: 'var(--accent-100)',
        }}
      >
        <Typography className="body-small-semibold">
          {scheduleLocked
            ? t('tr_scheduleLockActiveTitle')
            : t('tr_scheduleLockTitle')}
        </Typography>
        <Typography color="var(--grey-400)" className="body-small-regular">
          {t('tr_scheduleLockHint')}
        </Typography>
        <Button
          variant="main"
          color={scheduleLocked ? 'red' : 'main'}
          disabled={isLocking}
          onClick={handleToggleLock}
        >
          {scheduleLocked
            ? t('tr_scheduleLockDisable')
            : t('tr_scheduleLockEnable')}
        </Button>
      </Box>

      <Typography color="var(--grey-400)" className="body-small-regular">
        {t('tr_snapshotsDesc')}
      </Typography>

      {isLoading && <WaitingLoader size={48} variant="standard" />}

      {!isLoading && (
        <>
          <Select
            label={t('tr_snapshotTable')}
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value as string)}
          >
            {tableOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label} ({option.count})
              </MenuItem>
            ))}
          </Select>

          {availableDates.length === 0 && (
            <Typography color="var(--grey-350)" className="body-small-regular">
              {t('tr_snapshotsNone')}
            </Typography>
          )}

          {availableDates.length > 0 && (
            <>
              <Select
                label={t('tr_snapshotDate')}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value as string)}
              >
                {availableDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {dateLabel(date)}
                  </MenuItem>
                ))}
              </Select>

              <Button
                variant="main"
                color="red"
                startIcon={<IconSync />}
                disabled={isRestoring || !selectedDate}
                onClick={handleRestore}
              >
                {t('tr_snapshotRestore')}
              </Button>

              <Typography
                color="var(--grey-350)"
                className="body-small-regular"
              >
                {t('tr_snapshotRestoreHint')}
              </Typography>
            </>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <Typography className="body-small-semibold">
              {t('tr_forceResyncTitle')}
            </Typography>
            <Typography color="var(--grey-400)" className="body-small-regular">
              {t('tr_forceResyncHint')}
            </Typography>
            <Button
              variant="secondary"
              startIcon={<IconSync />}
              disabled={isForcing}
              onClick={handleForceResync}
            >
              {t('tr_forceResyncButton')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ServerSnapshotsTab;
