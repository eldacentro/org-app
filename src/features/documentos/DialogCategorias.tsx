import { useState, useEffect } from 'react';
import { Box, Stack, Grid } from '@mui/material';
import { useAtomValue } from 'jotai';
import { displaySnackNotification } from '@services/states/app';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';
import { ReactSortable } from 'react-sortablejs';
import DragHandle from '@components/drag_handle';
import IconButton from '@components/icon_button';
import accentSurface from '@components/accent_surface';
import { DocumentoCategoria } from '@definition/documentos';
import { saveCategoriasFirestore } from '@services/firebase/documentos';
import { congIDState } from '@states/settings';
import { documentoCategoriasState, documentosState } from '@states/documentos';
import { CATEGORIAS_INICIALES } from './useDocumentos';
import { getAccentMainHex } from '@utils/color';

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

interface DialogCategoriasProps {
  open: boolean;
  onClose: () => void;
}

const DialogCategorias = ({ open, onClose }: DialogCategoriasProps) => {
  const categorias = useAtomValue(documentoCategoriasState);
  const documentos = useAtomValue(documentosState);
  const congId = useAtomValue(congIDState);

  const [drafts, setDrafts] = useState<DocumentoCategoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoColor, setNuevoColor] = useState(getAccentMainHex);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (categorias.length === 0) {
        setDrafts(
          CATEGORIAS_INICIALES.map((c, i) => ({
            id: crypto.randomUUID(),
            nombre: c.nombre,
            color: c.color,
            orden: i,
            updatedAt: new Date().toISOString(),
          }))
        );
      } else {
        setDrafts([...categorias]);
      }
    }
  }, [open, categorias]);

  const handleAdd = () => {
    if (!nuevaCategoria.trim()) return;
    const newCat: DocumentoCategoria = {
      id: crypto.randomUUID(),
      nombre: nuevaCategoria.trim(),
      color: nuevoColor,
      orden: drafts.length,
      updatedAt: new Date().toISOString(),
    };
    setDrafts([...drafts, newCat]);
    setNuevaCategoria('');
    const currentIdx = PALETA_COLORES.indexOf(nuevoColor);
    setNuevoColor(PALETA_COLORES[(currentIdx + 1) % PALETA_COLORES.length]);
  };

  const handleRemove = (id: string) => {
    const count = documentos.filter((d) => d.categoriaId === id).length;
    if (count > 0) {
      displaySnackNotification({
        severity: 'error',
        header: 'Categoría en uso',
        message: `Esta categoría tiene ${count} documento(s). Si la eliminas y guardas, esos documentos quedarán sin categoría.`,
      });
    }
    setDrafts(drafts.filter((d) => d.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newDrafts = [...drafts];
    [newDrafts[index - 1], newDrafts[index]] = [
      newDrafts[index],
      newDrafts[index - 1],
    ];
    newDrafts.forEach((d, i) => (d.orden = i));
    setDrafts(newDrafts);
  };

  const handleMoveDown = (index: number) => {
    if (index === drafts.length - 1) return;
    const newDrafts = [...drafts];
    [newDrafts[index + 1], newDrafts[index]] = [
      newDrafts[index],
      newDrafts[index + 1],
    ];
    newDrafts.forEach((d, i) => (d.orden = i));
    setDrafts(newDrafts);
  };

  const handleSave = async () => {
    if (!congId) return;
    setIsSaving(true);
    try {
      const toSave = drafts.map((d, i) => ({
        ...d,
        orden: i,
        updatedAt: new Date().toISOString(),
      }));
      await saveCategoriasFirestore(congId, toSave);
      onClose();
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al guardar',
        message: 'No se pudieron guardar las categorías. Verifica tu conexión.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
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
        <Typography
          variant="h6"
          className="h2"
          sx={{ mb: 1, color: 'var(--ink)' }}
        >
          Gestionar categorías
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 3 }}>
          Organiza, crea y colorea las categorías de tus documentos.
        </Typography>

        {/* Lista de categorías actuales */}
        <Stack
          spacing={1.5}
          sx={{ mb: 4, maxHeight: '280px', overflowY: 'auto', pr: '4px' }}
        >
          {drafts.length === 0 ? (
            <Box
              sx={{
                p: 3,
                border: '1px dashed var(--line)',
                borderRadius: 'var(--shape-md)',
                textAlign: 'center',
              }}
            >
              <Typography color="var(--ink-2)" className="body-regular">
                No hay categorías definidas. Crea una a continuación.
              </Typography>
            </Box>
          ) : (
            /* `handle` apunta al asa: así el dedo solo arrastra si empieza
               sobre ella, y el resto de la fila deja que la lista siga
               haciendo scroll — que es lo delicado de arrastrar en un móvil.
               `setList` recibe el orden ya movido y solo hay que renumerar. */
            <ReactSortable
              list={drafts}
              setList={(nuevo) =>
                setDrafts(nuevo.map((d, i) => ({ ...d, orden: i })))
              }
              handle=".scrollable-icon"
              animation={150}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {drafts.map((cat, index) => (
                <Box
                  key={cat.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--shape-sm)',
                    transition:
                      'background-color var(--motion-fast) var(--ease-standard)',
                    // La cápsula del color de la categoría, no la "uñita": el
                    // borde de 5px iba pegado al canto y la esquina redondeada lo
                    // cortaba en seco, dejando dos muescas. Ver §6.3.
                    ...accentSurface(cat.color),
                    '&:hover': {
                      backgroundColor: `color-mix(in srgb, ${cat.color} 12%, var(--card))`,
                    },
                  }}
                >
                  <DragHandle
                    etiqueta={cat.nombre}
                    onSubir={() => handleMoveUp(index)}
                    onBajar={() => handleMoveDown(index)}
                    sx={{ padding: '6px' }}
                  />

                  <Typography
                    className="body-regular-semibold"
                    color="var(--ink)"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {cat.nombre}
                  </Typography>

                  <Stack direction="row" spacing="4px">
                    <IconButton
                      edge={false}
                      color="error"
                      onClick={() => handleRemove(cat.id)}
                      title="Eliminar"
                      sx={{ padding: '6px', color: 'var(--red-main)' }}
                    >
                      <IconDelete color="currentColor" width={18} height={18} />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </ReactSortable>
          )}
        </Stack>

        <Box sx={{ borderTop: '1px solid var(--line)', pt: 3, mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, color: 'var(--ink)' }}
          >
            Crear nueva categoría
          </Typography>

          <Stack spacing={2}>
            <Box>
              {/* En minúscula: las mayúsculas escritas a mano están
                  prohibidas (DESIGN_SYSTEM §5); solo las pone una clase
                  `-caps` cuando toca, y aquí no toca. */}
              <Typography
                className="label-small-semibold"
                color="var(--ink-3)"
                sx={{ display: 'block', mb: 1 }}
              >
                Selecciona un color
              </Typography>
              <Grid container spacing={1}>
                {PALETA_COLORES.map((color) => (
                  <Grid size="auto" key={color}>
                    <Box
                      onClick={() => setNuevoColor(color)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--shape-full)',
                        backgroundColor: color,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // El elegido, con un anillo separado del propio color.
                        // Antes llevaba borde blanco de 3px MÁS un `outline` de
                        // 2,5 MÁS un puntito dentro: tres señales para decir lo
                        // mismo, y la sombra interior ensuciaba todos los
                        // colores.
                        boxShadow:
                          nuevoColor === color
                            ? `0 0 0 3px var(--card), 0 0 0 5px ${color}`
                            : 'none',
                        transition:
                          'transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
                        '&:hover': { transform: 'scale(1.12)' },
                      }}
                    ></Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Stack
              direction={{ mobile: 'column', tablet600: 'row' }}
              spacing={1.5}
              alignItems="stretch"
              sx={{ width: '100%' }}
            >
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Nombre de categoría"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  sx={{ width: '100%' }}
                />
              </Box>
              <Button
                variant="main"
                onClick={handleAdd}
                disabled={!nuevaCategoria.trim()}
                // Se pinta del color elegido —es la única pista de qué color
                // va a tener la categoría— pero sin sombra de colorines: eran
                // dos sombras a mano con el color en hexadecimal + alfa, que
                // ningún otro botón de la app lleva. La forma y el alto los
                // pone el componente.
                sx={{
                  flexShrink: 0,
                  backgroundColor: nuevoColor,
                  color: 'var(--always-white) !important',
                  '&:hover': { backgroundColor: nuevoColor, opacity: 0.9 },
                  // Desactivado tenía pinta de campo vacío: un bloque pálido a
                  // todo lo ancho, indistinguible del recuadro de al lado.
                  '&.Mui-disabled': {
                    backgroundColor: 'var(--accent-200)',
                    color: 'var(--ink-3) !important',
                  },
                }}
              >
                Añadir
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="flex-end"
          sx={{ borderTop: '1px solid var(--line)', pt: 2.5 }}
        >
          <Button variant="tertiary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="main" onClick={handleSave} disabled={isSaving}>
            Guardar
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogCategorias;
