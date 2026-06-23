import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import TextField from '@components/textfield';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Button from '@components/button';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesState,
  territorySettingsState,
} from '@states/territories';
import { territoryLabel, formatTerritoryDate, getZoneColor } from '@services/app/territories';
import { usePersonName } from '../usePersonName';

const HistorialTab = () => {
  const assignments = useAtomValue(territoryAssignmentsState);
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);

  // Filtrar asignaciones cerradas y ordenarlas
  const closedAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.returnedAt !== null && a.returnedAt !== undefined)
      .sort((a, b) => new Date(b.returnedAt!).getTime() - new Date(a.returnedAt!).getTime());
  }, [assignments]);

  // Filtrar por búsqueda
  const filtered = useMemo(() => {
    if (!search.trim()) return closedAssignments;
    const lower = search.toLowerCase();
    return closedAssignments.filter((a) => {
      const personName = resolveName(a.personUid).toLowerCase();
      const t = territories.find((t) => t.id === a.territoryId);
      const tLabel = t ? territoryLabel(t).toLowerCase() : '';
      return personName.includes(lower) || tLabel.includes(lower);
    });
  }, [closedAssignments, search, resolveName, territories]);

  const visible = filtered.slice(0, limit);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ maxWidth: 400 }}>
        <TextField
          label="Buscar por publicador o territorio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      {filtered.length === 0 ? (
        <Typography variant="body2" color="var(--ink-2)">
          {search ? 'No hay resultados para tu búsqueda.' : 'No hay historial de asignaciones cerradas.'}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {visible.map((a) => {
            const t = territories.find((x) => x.id === a.territoryId);
            const tName = t ? territoryLabel(t) : 'Territorio desconocido';
            const color = t ? getZoneColor(t.zoneId, zones) : 'var(--ink-2)';
            const worked = a.status === 'trabajado';

            return (
              <Box
                key={a.id}
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  borderLeft: `5px solid ${color}`,
                  backgroundColor: 'var(--card)',
                }}
              >
                <Stack
                  direction={{ mobile: 'column', tablet600: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="body2" sx={{ color: 'var(--ink)' }}>
                      <strong>{resolveName(a.personUid)}</strong> devolvió el{' '}
                      <strong>{tName}</strong> como <strong>{worked ? 'trabajado' : 'no trabajado'}</strong>
                    </Typography>
                    <Typography variant="caption" color="var(--ink-2)">
                      Asignado el {formatTerritoryDate(a.assignedAt, settings.dateFormat)} · Devuelto el{' '}
                      {formatTerritoryDate(a.returnedAt!, settings.dateFormat)}
                    </Typography>
                  </Box>
                  {a.notas && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'var(--ink-2)', fontStyle: 'italic', maxWidth: '300px' }}
                    >
                      &quot;{a.notas}&quot;
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })}

          {limit < filtered.length && (
            <Button
              variant="tertiary"
              onClick={() => setLimit((l) => l + 30)}
              sx={{ mt: 1, alignSelf: 'center' }}
            >
              Cargar más
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default HistorialTab;
