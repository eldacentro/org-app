import { useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { Territory, TerritoryZone } from '@definition/territories';
import { formatTerritoryDate, getZoneName, territoryLabel } from '@services/app/territories';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Territorios candidatos a añadir (ya filtrados: los que no están en la campaña). */
  territories: Territory[];
  zones: TerritoryZone[];
  /** territoryId → fecha ISO desde la que está libre (null si nunca se ha trabajado). */
  unassignedSince: Map<string, string | null>;
  dateFormat: string;
  onConfirm: (territoryIds: string[]) => void;
};

/** Fila de territorio con checkbox + "Sin asignar desde" — pensado para
 *  seleccionar muchos territorios a la vez (ej. para una campaña grande),
 *  en vez de tener que buscarlos y añadirlos uno por uno. */
const DialogSeleccionarTerritorios = ({
  open,
  onClose,
  territories,
  zones,
  unassignedSince,
  dateFormat,
  onConfirm,
}: Props) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected(new Set());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return territories
      .filter(
        (t) =>
          !lower ||
          territoryLabel(t).toLowerCase().includes(lower) ||
          getZoneName(t.zoneId, zones).toLowerCase().includes(lower)
      )
      .sort((a, b) =>
        territoryLabel(a).localeCompare(territoryLabel(b), undefined, { numeric: true })
      );
  }, [territories, zones, search]);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const someSelected = !allSelected && filtered.some((t) => selected.has(t.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (selected.size === 0) return;
    onConfirm([...selected]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          maxWidth: '560px',
          width: '100%',
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '16px',
        },
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1.5, color: 'var(--ink)' }}>
          Seleccionar territorios
        </Typography>

        <TextField
          label="Buscar territorio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5 }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
            pb: 1,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            label={
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>
                Territorio
              </Typography>
            }
          />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>
            Sin asignar desde
          </Typography>
        </Box>

        <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <Typography variant="body2" color="var(--ink-2)" sx={{ p: 2, textAlign: 'center' }}>
              No hay territorios disponibles.
            </Typography>
          ) : (
            filtered.map((t) => {
              const since = unassignedSince.get(t.id);
              return (
                <Box
                  key={t.id}
                  sx={{
                    px: 1,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: 'var(--bg-hover)' },
                  }}
                >
                  <Checkbox
                    checked={selected.has(t.id)}
                    onChange={() => toggleOne(t.id)}
                    sx={{ width: '100%' }}
                    label={
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ width: '100%', pr: 1 }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 14, color: 'var(--ink)' }}>
                            {territoryLabel(t)}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'var(--ink-2)' }}>
                            {getZoneName(t.zoneId, zones)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, color: 'var(--ink-2)', flexShrink: 0 }}>
                          {since ? formatTerritoryDate(since, dateFormat) : '—'}
                        </Typography>
                      </Stack>
                    }
                  />
                </Box>
              );
            })
          )}
        </Box>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Button variant="tertiary" disableAutoStretch onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="main"
            disableAutoStretch
            onClick={handleSave}
            disabled={selected.size === 0}
          >
            {selected.size > 0 ? `Añadir (${selected.size})` : 'Añadir'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogSeleccionarTerritorios;
