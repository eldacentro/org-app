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
    tableOptions,
    availableDates,
    selectedTable,
    setSelectedTable,
    selectedDate,
    setSelectedDate,
    handleRestore,
  } = useServerSnapshots();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingTop: '8px',
      }}
    >
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
                    {date}
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
        </>
      )}
    </Box>
  );
};

export default ServerSnapshotsTab;
