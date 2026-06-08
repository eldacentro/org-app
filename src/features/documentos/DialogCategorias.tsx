import { useState, useEffect } from 'react';
import { Box, Stack, IconButton, Grid } from '@mui/material';
import { useAtomValue } from 'jotai';
import { displaySnackNotification } from '@services/states/app';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DocumentoCategoria } from '@definition/documentos';
import { saveCategoriasFirestore } from '@services/firebase/documentos';
import { congIDState } from '@states/settings';
import { documentoCategoriasState, documentosState } from '@states/documentos';
import { CATEGORIAS_INICIALES } from './useDocumentos';

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
  const [nuevoColor, setNuevoColor] = useState('#306CB4');
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
    [newDrafts[index - 1], newDrafts[index]] = [newDrafts[index], newDrafts[index - 1]];
    newDrafts.forEach((d, i) => (d.orden = i));
    setDrafts(newDrafts);
  };

  const handleMoveDown = (index: number) => {
    if (index === drafts.length - 1) return;
    const newDrafts = [...drafts];
    [newDrafts[index + 1], newDrafts[index]] = [newDrafts[index], newDrafts[index + 1]];
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
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
          Gestionar categorías
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 3 }}>
          Organiza, crea y colorea las categorías de tus documentos pastorales.
        </Typography>

        {/* Lista de categorías actuales */}
        <Stack spacing={1.5} sx={{ mb: 4, maxHeight: '280px', overflowY: 'auto', pr: '4px' }}>
          {drafts.length === 0 ? (
            <Box
              sx={{
                p: 3,
                border: '1px dashed var(--line)',
                borderRadius: 'var(--r-sm)',
                textAlign: 'center',
              }}
            >
              <Typography color="var(--ink-2)" className="body-regular">
                No hay categorías definidas. Crea una a continuación.
              </Typography>
            </Box>
          ) : (
            drafts.map((cat, index) => (
              <Box
                key={cat.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: '10px 14px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--card)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '5px',
                    height: '100%',
                    backgroundColor: cat.color,
                  },
                  '&:hover': {
                    borderColor: cat.color,
                    background: 'rgba(0, 0, 0, 0.02)',
                    boxShadow: 'var(--shadow-sm)',
                  },
                }}
              >
                <Typography
                  sx={{ flex: 1, fontWeight: 600, color: 'var(--ink)', fontSize: '14.5px', pl: 1 }}
                >
                  {cat.nombre}
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    sx={{
                      color: 'var(--ink-3)',
                      backgroundColor: 'var(--paper)',
                      padding: '5px',
                      borderRadius: 'var(--r-sm)',
                      '&:hover': { color: 'var(--ink)', backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === drafts.length - 1}
                    sx={{
                      color: 'var(--ink-3)',
                      backgroundColor: 'var(--paper)',
                      padding: '5px',
                      borderRadius: 'var(--r-sm)',
                      '&:hover': { color: 'var(--ink)', backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(cat.id)}
                    sx={{
                      color: 'var(--red-main)',
                      backgroundColor: 'rgba(239, 68, 68, 0.04)',
                      padding: '5px',
                      borderRadius: 'var(--r-sm)',
                      ml: 1,
                      '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                    }}
                  >
                    <IconDelete color="currentColor" width={16} height={16} />
                  </IconButton>
                </Stack>
              </Box>
            ))
          )}
        </Stack>

        <Box sx={{ borderTop: '1px solid var(--line)', pt: 3, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'var(--ink)' }}>
            Crear nueva categoría
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, color: 'var(--ink-3)', fontWeight: 600 }}
              >
                SELECCIONA UN COLOR
              </Typography>
              <Grid container spacing={1}>
                {PALETA_COLORES.map((color) => (
                  <Grid size="auto" key={color}>
                    <Box
                      onClick={() => setNuevoColor(color)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: nuevoColor === color ? '3px solid var(--card)' : 'none',
                        outline: nuevoColor === color ? `2.5px solid ${color}` : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                        '&:hover': { transform: 'scale(1.15)' },
                      }}
                    >
                      {nuevoColor === color && (
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'var(--card)',
                            boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
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
                sx={{
                  height: '42px',
                  backgroundColor: nuevoColor,
                  color: 'var(--always-white) !important',
                  borderRadius: 'var(--r-sm)',
                  boxShadow: `0 4px 10px -2px ${nuevoColor}40`,
                  '&:hover': {
                    backgroundColor: nuevoColor,
                    opacity: 0.9,
                    boxShadow: `0 6px 14px -2px ${nuevoColor}50`,
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
            Guardar cambios
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogCategorias;
