import { displaySnackNotification } from '@services/states/app';
import { useEffect, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack, Grid } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';
import { TerritoryZone } from '@definition/territories';
import { saveZone, deleteZone } from '@services/firebase/territories';
import { congIDState } from '@states/settings';
import { territoryZonesSortedState } from '@states/territories';
import { territoriesState } from '@states/territories';

const PALETA_COLORES = [
  '#306CB4',
  '#10B981',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#14B8A6',
  '#06B6D4',
  '#64748B',
];

type Props = { open: boolean; onClose: () => void };

const DialogZonas = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#306CB4');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre('');
      setColor('#306CB4');
    }
  }, [open]);

  const handleAdd = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const zone: TerritoryZone = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        color,
        orden: zones.length,
        updatedAt: new Date().toISOString(),
      };
      await saveZone(congId, zone);
      setNombre('');
      const idx = PALETA_COLORES.indexOf(color);
      setColor(PALETA_COLORES[(idx + 1) % PALETA_COLORES.length]);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (zone: TerritoryZone, newColor: string) => {
    await saveZone(congId, {
      ...zone,
      color: newColor,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDelete = async (zone: TerritoryZone) => {
    const count = territories.filter((t) => t.zoneId === zone.id).length;
    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar "${zone.nombre}": tiene ${count} territorio(s). Muévelos o elimínalos primero.`,
        severity: 'error',
      });
      return;
    }
    const ok = await confirm({
      message: `¿Borrar la zona "${zone.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) await deleteZone(congId, zone.id);
  };

  return (
    <>
      {ConfirmDialogNode}
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
      PaperProps={{
        style: {
          maxWidth: '520px',
          width: '100%',
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
          Zonas y tipos de territorio
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 3 }}>
          Agrupa tus territorios por zona (ej. Elda - Urbano, Elda - Rural). El
          color se aplica a todos los territorios de la zona.
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 3, maxHeight: 280, overflowY: 'auto', pr: '4px' }}>
          {zones.length === 0 ? (
            <Typography variant="body2" color="var(--ink-2)">
              Aún no hay zonas. Crea la primera abajo.
            </Typography>
          ) : (
            zones.map((zone) => {
              const count = territories.filter((t) => t.zoneId === zone.id).length;
              return (
                <Stack
                  key={zone.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    p: 1,
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <input
                    type="color"
                    value={zone.color}
                    onChange={(e) => handleColorChange(zone, e.target.value)}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ color: 'var(--ink)' }}>
                      {zone.nombre}
                    </Typography>
                    <Typography variant="caption" color="var(--ink-2)">
                      {count} territorio(s)
                    </Typography>
                  </Box>
                  <Button
                    variant="small"
                    onClick={() => handleDelete(zone)}
                    ariaLabel="Borrar zona"
                  >
                    <IconDelete color="var(--red-main)" width={20} height={20} />
                  </Button>
                </Stack>
              );
            })
          )}
        </Stack>

        <Grid container spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Grid size={{ mobile: 12, tablet600: 7 }}>
            <TextField
              label="Nueva zona"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Grid>
          <Grid size={{ mobile: 8, tablet600: 3 }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '100%', height: 42, cursor: 'pointer' }}
            />
          </Grid>
          <Grid size={{ mobile: 4, tablet600: 2 }}>
            <Button
              variant="main"
              onClick={handleAdd}
              disabled={!nombre.trim() || saving}
            >
              Añadir
            </Button>
          </Grid>
        </Grid>

        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ borderTop: '1px solid var(--line)', pt: 2.5, mt: 2 }}
        >
          <Button variant="tertiary" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
        </Stack>
      </Box>
      </Dialog>
    </>
  );
};

export default DialogZonas;
