import { displaySnackNotification } from '@services/states/app';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Stack,
  TextField,
  Grid,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import {
  territoryZonesSortedState,
  territoryTagsState,
} from '@states/territories';
import { congIDState, congMasterKeyState } from '@states/settings';
import { saveTerritory, deleteTerritoryCompleto } from '@services/firebase/territories';
import { Territory, TerritoryTag } from '@definition/territories';
import Typography from '@components/typography';
import Button from '@components/button';
import AutocompleteMultiple from '@components/autocomplete_multiple';
import Select from '@components/select';
import { IconClose, IconDelete } from '@components/icons';
import TerritoryMap from '../map/TerritoryMap';
import type { Polygon, MultiPolygon } from 'geojson';

type Props = {
  open: boolean;
  territory: Territory;
  onClose: () => void;
};

const DialogEditarTerritorio = ({ open, territory, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const zones = useAtomValue(territoryZonesSortedState);
  const tags = useAtomValue(territoryTagsState);

  const [numero, setNumero] = useState(territory.numero);
  const [nombre, setNombre] = useState(territory.nombre || '');
  const [notas, setNotas] = useState(territory.notas || '');
  const [zoneId, setZoneId] = useState(territory.zoneId);
  const [tagIds, setTagIds] = useState<string[]>(territory.tags || []);
  const [geometry, setGeometry] = useState<Polygon | MultiPolygon | null>(territory.geometry);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      numero !== territory.numero ||
      nombre !== (territory.nombre || '') ||
      notas !== (territory.notas || '') ||
      zoneId !== territory.zoneId ||
      JSON.stringify(tagIds) !== JSON.stringify(territory.tags || []) ||
      JSON.stringify(geometry) !== JSON.stringify(territory.geometry)
    );
  }, [numero, nombre, notas, zoneId, tagIds, geometry, territory]);

  const handleSave = async () => {
    if (!numero.trim() || !zoneId) return;
    setSaving(true);
    try {
      const updated: Territory = {
        ...territory,
        numero: numero.trim(),
        nombre: nombre.trim() || undefined,
        notas: notas.trim() || undefined,
        zoneId,
        tags: tagIds,
        geometry,
        updatedAt: new Date().toISOString(),
      };
      await saveTerritory(congId, updated, masterKey ?? '');
      onClose();
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        header: 'Error',
        message: 'Error guardando territorio',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        '¿Estás SEGURO de que deseas eliminar este territorio por completo? Esta acción NO se puede deshacer.'
      )
    ) {
      setDeleting(true);
      try {
        await deleteTerritoryCompleto(congId, territory.id);
        onClose();
      } catch (e) {
        console.error(e);
        displaySnackNotification({
          header: 'Error',
          message: 'Error eliminando territorio',
          severity: 'error',
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const selectedTags = useMemo(
    () => tags.filter((t) => tagIds.includes(t.id)),
    [tags, tagIds]
  );
  
  const zoneColor = useMemo(() => {
    return zones.find(z => z.id === zoneId)?.color || '#306CB4';
  }, [zones, zoneId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth scroll="paper"
      PaperProps={{ sx: { maxWidth: '1100px', width: 'calc(100% - 32px)' } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 0 }}>
          <Typography className="h2">Editar territorio</Typography>
          <IconButton onClick={onClose}>
            <IconClose color="var(--black)" />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={3}>
          <Grid size={{ mobile: 12, tablet600: 4, desktop: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 1, fontWeight: 500 }}>
                  Zona *
                </Typography>
                <Select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value as string)}
                >
                  <option value="" disabled>Seleccione una zona</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </Select>
              </Box>

              <TextField
                label="Número *"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                fullWidth
                size="small"
              />

              <TextField
                label="Nombre (opcional)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                fullWidth
                size="small"
              />

              <Box>
                <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 1, fontWeight: 500 }}>
                  Etiquetas
                </Typography>
                <AutocompleteMultiple
                  options={tags}
                  getOptionLabel={(t: TerritoryTag) => t.nombre}
                  value={selectedTags}
                  onChange={(_, v) => setTagIds((v as TerritoryTag[]).map((t) => t.id))}
                  placeholder="Añadir etiqueta..."
                />
              </Box>

              <TextField
                label="Notas internas (cifradas)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
              />

              <Button
                variant="tertiary"
                onClick={handleDelete}
                disabled={deleting || saving}
                sx={{ 
                  color: 'var(--red-main) !important',
                  mt: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--red-main)' }}>
                  <IconDelete color="var(--red-main)" />
                  Eliminar territorio
                </Box>
              </Button>
            </Stack>
          </Grid>

          <Grid size={{ mobile: 12, tablet600: 8, desktop: 9 }}>
            <Box sx={{ 
              borderRadius: '16px', 
              border: '1px solid var(--line)', 
              overflow: 'hidden',
              height: { mobile: '400px', tablet600: '100%' },
              minHeight: '400px',
              position: 'relative'
            }}>
              <TerritoryMap
                geometry={geometry}
                color={zoneColor}
                height="100%"
                editable
                onGeometryChange={setGeometry}
              />
              <Box sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'var(--card)',
                p: 1.5,
                borderRadius: '8px',
                boxShadow: 'var(--small-card-shadow)',
                border: '1px solid var(--line)',
                zIndex: 1000,
                pointerEvents: 'none'
              }}>
                <Typography variant="caption" color="var(--ink-2)" sx={{ fontWeight: 600 }}>
                  Modo Edición: Activo
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3, pt: 2, borderTop: '1px solid var(--line)' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="main" onClick={handleSave} disabled={!hasChanges || saving || !numero.trim() || !zoneId}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default DialogEditarTerritorio;
