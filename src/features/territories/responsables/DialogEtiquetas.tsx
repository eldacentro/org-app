import { displaySnackNotification } from '@services/states/app';
import { useEffect, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack } from '@mui/material';
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
import ColorPicker from '@components/color_picker';
import IconButton from '@components/icon_button';
import { PALETA_COLORES } from '@components/color_picker/palette';
import { conCuenta } from '@utils/plural';
import { useDebouncedColorSave } from './useDebouncedColorSave';

type Props = { open: boolean; onClose: () => void };

const DialogEtiquetas = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const tags = useAtomValue(territoryTagsState);
  const territories = useAtomValue(territoriesState);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(PALETA_COLORES[4]);
  const [saving, setSaving] = useState(false);
  const {
    getColor,
    handleColorChange,
    reset: resetColors,
  } = useDebouncedColorSave<TerritoryTag>(
    (tag, newColor) =>
      saveTag(congId, {
        ...tag,
        color: newColor,
        updatedAt: new Date().toISOString(),
      }),
    'No se pudo guardar el color.'
  );

  useEffect(() => {
    if (open) {
      setNombre('');
      setColor(PALETA_COLORES[4]);
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
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo crear la etiqueta.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: TerritoryTag) => {
    const count = territories.filter((t) => t.tags?.includes(tag.id)).length;
    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar «${tag.nombre}»: está asignada a ${conCuenta(count, 'territorio')}. Quítala de ${count === 1 ? 'él' : 'ellos'} primero.`,
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
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo borrar la etiqueta.',
      });
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
            borderRadius: 'var(--shape-xl)',
            backgroundColor: 'var(--card)',
            padding: '10px',
          },
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Typography className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
            Etiquetas
          </Typography>
          <Typography
            className="body-small-regular"
            color="var(--ink-2)"
            sx={{ mb: 3 }}
          >
            Crea etiquetas para clasificar tus territorios (ej. Comercial,
            Escaleras, Urbano denso). Luego podrás asignarlas a cada territorio.
          </Typography>

          <Stack
            spacing={1.5}
            sx={{ mb: 3, maxHeight: 280, overflowY: 'auto', pr: '4px' }}
          >
            {tags.length === 0 ? (
              <Typography className="body-small-regular" color="var(--ink-2)">
                Aún no hay etiquetas. Crea la primera abajo.
              </Typography>
            ) : (
              tags.map((tag) => {
                const count = territories.filter((t) =>
                  t.tags?.includes(tag.id)
                ).length;
                return (
                  <Stack
                    key={tag.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      p: 1,
                      borderRadius: 'var(--shape-md)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <ColorPicker
                      value={getColor(tag)}
                      onChange={(nuevo) => handleColorChange(tag, nuevo)}
                      ariaLabel={`Color de la etiqueta ${tag.nombre}`}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        className="body-regular"
                        sx={{ color: 'var(--ink)' }}
                      >
                        {tag.nombre}
                      </Typography>
                      <Typography
                        className="label-small-regular"
                        color="var(--ink-2)"
                      >
                        {conCuenta(count, 'territorio')}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => handleDelete(tag)}
                      aria-label={`Borrar la etiqueta ${tag.nombre}`}
                    >
                      <IconDelete
                        color="var(--red-main)"
                        width={20}
                        height={20}
                      />
                    </IconButton>
                  </Stack>
                );
              })
            )}
          </Stack>

          {/* Una fila que se ordena sola: el campo crece, y la pastilla del
              color y el botón se quedan al final. Cuando no cabe, el campo se
              queda con su línea y los otros dos bajan juntos. Antes era una
              rejilla de doce columnas con los tamaños puestos a ojo, y dejaba
              la pastilla pegada al margen y el botón flotando en medio de un
              hueco vacío. */}
          <Box
            sx={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              mb: 1,
            }}
          >
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <TextField
                label="Nueva etiqueta"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Box>
            <ColorPicker
              value={color}
              onChange={setColor}
              ariaLabel="Color de la etiqueta nueva"
              size={40}
            />
            <Button
              variant="main"
              disableAutoStretch
              onClick={handleAdd}
              disabled={!nombre.trim() || saving}
            >
              Añadir
            </Button>
          </Box>

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
