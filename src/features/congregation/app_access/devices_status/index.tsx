import { Box, Stack } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import UsersContainer from '../users_container';
import useDevicesStatus, { DeviceStatusRow } from './useDevicesStatus';

const SEVERITY_COLOR: Record<DeviceStatusRow['severity'], string> = {
  ok: 'var(--green-main)',
  warn: 'var(--orange-dark)',
  bad: 'var(--red-main)',
  unknown: 'var(--grey-400)',
};

const StatusRow = ({ row }: { row: DeviceStatusRow }) => {
  const color = SEVERITY_COLOR[row.severity];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--accent-100)',
      }}
    >
      <Box
        sx={{
          width: '8px',
          height: '8px',
          minWidth: '8px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography className="body-small-semibold" color="var(--black)">
          {row.name}
        </Typography>

        <Typography className="body-small-regular" color="var(--grey-400)">
          {row.lastSync === null
            ? 'Sin datos de sincronización todavía'
            : `Sincronizó hace ${row.lastSyncText}`}
          {row.isOutdated ? ' · app sin actualizar' : ''}
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'right' }}>
        <Typography className="body-small-regular" color="var(--grey-400)">
          {row.build === null ? 'versión desconocida' : `versión ${row.build}`}
        </Typography>
        <Typography className="body-small-regular" color="var(--grey-400)">
          {row.lastSeen === null
            ? 'sin abrir'
            : `abrió hace ${row.lastSeenText}`}
        </Typography>
      </Box>
    </Box>
  );
};

const DevicesStatus = () => {
  const {
    rows,
    visibleRows,
    needAttention,
    outdatedCount,
    currentBuild,
    showAll,
    setShowAll,
  } = useDevicesStatus();

  if (rows.length === 0) return null;

  const summary =
    needAttention.length === 0
      ? 'Todos han sincronizado en las últimas 24 horas.'
      : `${needAttention.length} de ${rows.length} necesitan que les eches una mano` +
        (outdatedCount > 0
          ? ` · ${outdatedCount} con la app sin actualizar`
          : '');

  return (
    <UsersContainer
      title="Estado de los dispositivos"
      description={`Quién tiene la app al día y quién lleva tiempo sin sincronizar, para saber a quién abordar. ${summary}`}
    >
      <Stack spacing="8px">
        {visibleRows.map((row) => (
          <StatusRow key={row.id} row={row} />
        ))}

        {visibleRows.length === 0 && (
          <Typography className="body-regular" color="var(--grey-400)">
            No hay nadie pendiente ahora mismo.
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <Typography className="body-small-regular" color="var(--grey-400)">
          {currentBuild === null
            ? 'Versión actual desconocida'
            : `Versión actual publicada: ${currentBuild}`}
        </Typography>

        <Button variant="small" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Ver solo los pendientes' : `Ver todos (${rows.length})`}
        </Button>
      </Box>
    </UsersContainer>
  );
};

export default DevicesStatus;
