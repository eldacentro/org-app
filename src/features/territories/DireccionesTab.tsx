import { useMemo, useState } from 'react';
import { Box, Stack, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { IconDelete } from '@components/icons';
import {
  congIDState,
  congMasterKeyState,
  userLocalUIDState,
} from '@states/settings';
import { territoryLocationsState, territorySettingsState } from '@states/territories';
import { TerritoryLocation } from '@definition/territories';
import { saveLocation, deleteLocation } from '@services/firebase/territories';

type Props = { territoryId: string; canManage: boolean };

/** Pestaña "Direcciones" (No visitar) de un territorio. */
const DireccionesTab = ({ territoryId, canManage }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const uid = useAtomValue(userLocalUIDState);
  const settings = useAtomValue(territorySettingsState);
  const allLocations = useAtomValue(territoryLocationsState);

  const locations = useMemo(
    () => allLocations.filter((l) => l.territoryId === territoryId),
    [allLocations, territoryId]
  );
  const approved = locations.filter((l) => l.aprobada);
  const pending = locations.filter((l) => !l.aprobada);

  const [direccion, setDireccion] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const canAdd = canManage || settings.publishersCanAddLocations;

  const handleAdd = async () => {
    if (!direccion.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      // Responsables: aprobada directa. Publicadores: según la configuración.
      const aprobada = canManage || !settings.locationsRequireApproval;
      await saveLocation(
        congId,
        {
          id: crypto.randomUUID(),
          territoryId,
          etiqueta: 'NO_VISITAR',
          direccion: direccion.trim(),
          nota: nota.trim() || undefined,
          aprobada,
          addedBy: uid,
          approvedBy: aprobada ? uid : undefined,
          createdAt: now,
          updatedAt: now,
        },
        masterKey ?? ''
      );
      setDireccion('');
      setNota('');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (l: TerritoryLocation) => {
    await saveLocation(
      congId,
      { ...l, aprobada: true, approvedBy: uid, updatedAt: new Date().toISOString() },
      masterKey ?? ''
    );
  };

  const handleDelete = async (l: TerritoryLocation) => {
    if (window.confirm('¿Borrar esta dirección?')) {
      await deleteLocation(congId, l.id);
    }
  };

  const renderRow = (l: TerritoryLocation, isPending = false) => (
    <Stack
      key={l.id}
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ p: 1, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}
    >
      <Chip
        label="NO VISITAR"
        size="small"
        sx={{ backgroundColor: 'var(--red-main)', color: 'var(--always-white)' }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--ink)' }}>
          {l.direccion}
        </Typography>
        {l.nota && (
          <Typography variant="caption" color="var(--ink-2)">
            {l.nota}
          </Typography>
        )}
      </Box>
      {isPending && canManage && (
        <Button variant="small" onClick={() => handleApprove(l)}>
          Aprobar
        </Button>
      )}
      {canManage && (
        <Button variant="small" onClick={() => handleDelete(l)} ariaLabel="Borrar">
          <IconDelete color="var(--red-main)" width={18} height={18} />
        </Button>
      )}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      <Stack spacing={1}>
        {approved.length === 0 && pending.length === 0 && (
          <Typography variant="body2" color="var(--ink-2)">
            No hay direcciones de &quot;No visitar&quot; en este territorio.
          </Typography>
        )}
        {approved.map((l) => renderRow(l))}
      </Stack>

      {canManage && pending.length > 0 && (
        <Box>
          <Typography variant="caption" color="var(--orange-main)">
            Pendientes de aprobación ({pending.length})
          </Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {pending.map((l) => renderRow(l, true))}
          </Stack>
        </Box>
      )}

      {canAdd && (
        <Box sx={{ borderTop: '1px solid var(--line)', pt: 2 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nueva dirección (No visitar)"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
            <TextField
              label="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <Button
              variant="main"
              onClick={handleAdd}
              disabled={saving || !direccion.trim()}
            >
              Añadir
            </Button>
            {!canManage && settings.locationsRequireApproval && (
              <Typography variant="caption" color="var(--ink-2)">
                La dirección quedará pendiente hasta que un responsable la apruebe.
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default DireccionesTab;
