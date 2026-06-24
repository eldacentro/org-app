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
import { TerritoryTag } from '@definition/territories';
import { saveTag, deleteTag } from '@services/firebase/territories';
import { congIDState } from '@states/settings';
import { territoryTagsState } from '@states/territories';
import { territoriesState } from '@states/territories';
import { PALETA_COLORES } from './colorPalette';
import { useDebouncedColorSave } from './useDebouncedColorSave';

type Props = { open: boolean; onClose: () => void };

const DialogEtiquetas = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const tags = useAtomValue(territoryTagsState);
  const territories = useAtomValue(territoriesState);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#EC4899');
  const [saving, setSaving] = useState(false);
  const { getColor, handleColorChange, reset: resetColors } = useDebouncedColorSave<TerritoryTag>(
    (tag, newColor) => saveTag(congId, { ...tag, color: newColor, updatedAt: new Date().toISOString() }),
    'No se pudo guardar el color.'
  );

  useEffect(() => {
    if (open) {
      setNombre('');
      setColor('#EC4899');
      resetColors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const tag: TerritoryTag = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        color,
        updatedAt: new Date().toISOString(),
      };
      await saveTag(congId, tag);
      setNombre('');
      const idx = PALETA_COLORES.indexOf(color);
      setColor(PALETA_COLORES[(idx + 1) % PALETA_COLORES.length]);
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo crear la etiqueta.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: TerritoryTag) => {
    const count = territories.filter((t) => t.tags?.includes(tag.id)).length;
    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar "${tag.nombre}": está asignada a ${count} territorio(s). Quítala de los territorios primero.`,
        severity: 'error',
      });
      return;
    }
    const ok = await confirm({
      message: `¿Borrar la etiqueta "${tag.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTag(congId, tag.id);
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo borrar la etiqueta.' });
    }
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
          Etiquetas
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 3 }}>
          Crea etiquetas para clasificar tus territorios (ej. Comercial, Escaleras, 
          Urbano denso). Luego podrás asignarlas a cada territorio.
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 3, maxHeight: 280, overflowY: 'auto', pr: '4px' }}>
          {tags.length === 0 ? (
            <Typography variant="body2" color="var(--ink-2)">
              Aún no hay etiquetas. Crea la primera abajo.
            </Typography>
          ) : (
            tags.map((tag) => {
              const count = territories.filter((t) => t.tags?.includes(tag.id)).length;
              return (
                <Stack
                  key={tag.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    p: 1,
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <input
                    type="color"
                    value={getColor(tag)}
                    onChange={(e) => handleColorChange(tag, e.target.value)}
                    aria-label={`Color de la etiqueta ${tag.nombre}`}
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
                      {tag.nombre}
                    </Typography>
                    <Typography variant="caption" color="var(--ink-2)">
                      {count} territorio(s)
                    </Typography>
                  </Box>
                  <Button
                    variant="small"
                    onClick={() => handleDelete(tag)}
                    ariaLabel="Borrar etiqueta"
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
              label="Nueva etiqueta"
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

export default DialogEtiquetas;
