import { displaySnackNotification } from '@services/states/app';
import { useEffect, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconDelete, IconEdit } from '@components/icons';
import { TerritoryZone } from '@definition/territories';
import { saveZone, deleteZone } from '@services/firebase/territories';
import { congIDState } from '@states/settings';
import { territoryZonesSortedState } from '@states/territories';
import { territoriesState } from '@states/territories';
import ColorPicker from '@components/color_picker';
import IconButton from '@components/icon_button';
import { PALETA_COLORES } from '@services/app/paleta';
import { conCuenta } from '@utils/plural';
import { useDebouncedColorSave } from './useDebouncedColorSave';
import { getAccentMainHex } from '@utils/color';

type Props = { open: boolean; onClose: () => void };

const DialogZonas = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(getAccentMainHex);
  const [saving, setSaving] = useState(false);
  const {
    getColor,
    handleColorChange,
    reset: resetColors,
  } = useDebouncedColorSave<TerritoryZone>(
    (zone, newColor) =>
      saveZone(congId, {
        ...zone,
        color: newColor,
        updatedAt: new Date().toISOString(),
      }),
    'No se pudo guardar el color.'
  );

  // Edición de zonas
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (open) {
      setNombre('');
      setColor(getAccentMainHex());
      resetColors();
      setEditingZoneId(null);
      setEditingName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const zone: TerritoryZone = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        color,
        orden:
          zones.length === 0 ? 0 : Math.max(...zones.map((z) => z.orden)) + 1,
        updatedAt: new Date().toISOString(),
      };
      await saveZone(congId, zone);
      setNombre('');
      const idx = PALETA_COLORES.indexOf(color);
      setColor(PALETA_COLORES[(idx + 1) % PALETA_COLORES.length]);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo crear la zona.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (zone: TerritoryZone) => {
    if (!editingName.trim()) return;
    try {
      await saveZone(congId, {
        ...zone,
        nombre: editingName.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditingZoneId(null);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo actualizar la zona.',
      });
    }
  };

  const handleDelete = async (zone: TerritoryZone) => {
    const count = territories.filter((t) => t.zoneId === zone.id).length;
    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar «${zone.nombre}»: tiene ${conCuenta(count, 'territorio')}. ${count === 1 ? 'Muévelo o elimínalo' : 'Muévelos o elimínalos'} primero.`,
        severity: 'error',
      });
      return;
    }
    const ok = await confirm({
      message: `¿Borrar la zona «${zone.nombre}»? Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteZone(congId, zone.id);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo borrar la zona.',
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
            Zonas y tipos de territorio
          </Typography>
          <Typography
            className="body-small-regular"
            color="var(--ink-2)"
            sx={{ mb: 3 }}
          >
            Agrupa tus territorios por zona (ej. Elda - Urbano, Elda - Rural).
            El color se aplica a todos los territorios de la zona.
          </Typography>

          <Stack
            spacing={1.5}
            sx={{ mb: 3, maxHeight: 280, overflowY: 'auto', pr: '4px' }}
          >
            {zones.length === 0 ? (
              <Typography className="body-small-regular" color="var(--ink-2)">
                Aún no hay zonas. Crea la primera abajo.
              </Typography>
            ) : (
              zones.map((zone) => {
                const count = territories.filter(
                  (t) => t.zoneId === zone.id
                ).length;
                return (
                  <Stack
                    key={zone.id}
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
                      value={getColor(zone)}
                      onChange={(nuevo) => handleColorChange(zone, nuevo)}
                      ariaLabel={`Color de la zona ${zone.nombre}`}
                    />
                    <Box sx={{ flex: 1 }}>
                      {editingZoneId === zone.id ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* Sin `label` (antes iba una etiqueta VACÍA, que MUI
                            dibuja igual): así este campo no reserva el hueco
                            para la etiqueta de dentro y se queda compacto, que
                            es lo que pide renombrar en línea. */}
                          <TextField
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { height: '36px' } }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(zone);
                              if (e.key === 'Escape') setEditingZoneId(null);
                            }}
                          />
                          <Button
                            variant="small"
                            disableAutoStretch
                            onClick={() => handleSaveEdit(zone)}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="small"
                            disableAutoStretch
                            onClick={() => setEditingZoneId(null)}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      ) : (
                        <>
                          <Typography
                            className="body-regular"
                            sx={{ color: 'var(--ink)' }}
                          >
                            {zone.nombre}
                          </Typography>
                          <Typography
                            className="label-small-regular"
                            color="var(--ink-2)"
                          >
                            {conCuenta(count, 'territorio')}
                          </Typography>
                        </>
                      )}
                    </Box>
                    {editingZoneId !== zone.id && (
                      <IconButton
                        onClick={() => {
                          setEditingZoneId(zone.id);
                          setEditingName(zone.nombre);
                        }}
                        aria-label={`Editar la zona ${zone.nombre}`}
                      >
                        <IconEdit color="var(--ink)" width={20} height={20} />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => handleDelete(zone)}
                      aria-label={`Borrar la zona ${zone.nombre}`}
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
                label="Nueva zona"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Box>
            <ColorPicker
              value={color}
              onChange={setColor}
              ariaLabel="Color de la zona nueva"
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

export default DialogZonas;
