import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { IconExpand } from '@components/icons';
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
        borderRadius: 'var(--shape-sm)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--accent-100)',
      }}
    >
      <Box
        sx={{
          width: '8px',
          height: '8px',
          minWidth: '8px',
          borderRadius: 'var(--shape-full)',
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
          {row.buildLabel
            ? `app del ${row.buildLabel}`
            : row.build === null
              ? 'versión desconocida'
              : 'app muy antigua'}
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
    currentBuildLabel,
    showAll,
    setShowAll,
    handleForceUpdate,
    isPushing,
  } = useDevicesStatus();

  // Plegado por defecto: en una congregación entera la lista es larguísima y
  // esto no es lo que se viene a hacer a esta pantalla. Lo que importa cabe en
  // una línea; el detalle se abre cuando de verdad hace falta.
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  const summary =
    needAttention.length === 0
      ? 'Todos han sincronizado en las últimas 24 horas.'
      : `${needAttention.length} de ${rows.length} necesitan que les eches una mano` +
        (outdatedCount > 0
          ? ` · ${outdatedCount} con la app sin actualizar`
          : '');

  if (!open) {
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) =>
          e.key === 'Enter' || e.key === ' ' ? setOpen(true) : null
        }
        sx={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 'var(--shape-xl)',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          '&:hover': { borderColor: 'var(--accent-300)' },
          '&:focus-visible': { outline: 'var(--accent-main) auto 1px' },
        }}
      >
        <Box
          sx={{
            width: '8px',
            height: '8px',
            minWidth: '8px',
            borderRadius: 'var(--shape-full)',
            backgroundColor:
              needAttention.length === 0
                ? 'var(--green-main)'
                : 'var(--orange-dark)',
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography className="body-small-semibold" color="var(--black)">
            Estado de los dispositivos
          </Typography>
          <Typography className="body-small-regular" color="var(--grey-400)">
            {summary}
          </Typography>
        </Box>

        <IconExpand width={16} color="var(--accent-400)" />
      </Box>
    );
  }

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
          {currentBuildLabel
            ? `Versión actual publicada: ${currentBuildLabel}`
            : 'Versión actual desconocida'}
        </Typography>

        <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="small" onClick={() => setOpen(false)}>
            Cerrar
          </Button>

          <Button variant="small" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Ver solo los pendientes' : `Ver todos (${rows.length})`}
          </Button>

          <Button
            variant="secondary"
            disabled={currentBuild === null || isPushing}
            onClick={handleForceUpdate}
          >
            {isPushing ? 'Enviando…' : 'Actualizar a todos'}
          </Button>
        </Box>
      </Box>

      <Typography className="body-small-regular" color="var(--grey-400)">
        «Actualizar a todos» empuja esta versión a toda la congregación: quien
        tenga la app abierta se actualiza en unos segundos —esperando a que no
        esté escribiendo— y el resto, la próxima vez que la abra. A quien ya
        esté al día no le pasa nada.
      </Typography>
    </UsersContainer>
  );
};

export default DevicesStatus;
