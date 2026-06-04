import { useState, useEffect } from 'react';
import { Box, Stack, IconButton, Grid } from '@mui/material';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Button from '@components/button';
import Typography from '@components/typography';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DocumentoCategoria } from '@definition/documentos';
import { dbCategoriasSave } from '@services/dexie/documentos';
import { useDocumentos } from './useDocumentos';

const CATEGORIAS_INICIALES = [
  { nombre: 'Cuentas', color: '#10B981' },
  { nombre: 'Visita del Superintendente', color: '#6366F1' },
  { nombre: 'Asambleas', color: '#F59E0B' },
  { nombre: 'Anuncios', color: '#306CB4' },
  { nombre: 'Otros', color: '#64748B' },
];

const PALETA_COLORES = [
  '#306CB4', // Azul principal Elda Centro
  '#10B981', // Verde esmeralda
  '#6366F1', // Indigo
  '#8B5CF6', // Violeta/Lavender
  '#EC4899', // Rosa
  '#EF4444', // Rojo coral
  '#F59E0B', // Naranja cálido
  '#14B8A6', // Turquesa/Teal
  '#06B6D4', // Cian brillante
  '#64748B', // Gris elegante
];

interface DialogCategoriasProps {
  open: boolean;
  onClose: () => void;
}

const DialogCategorias = ({ open, onClose }: DialogCategoriasProps) => {
  const { categorias, reload } = useDocumentos();
  const [drafts, setDrafts] = useState<DocumentoCategoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoColor, setNuevoColor] = useState('#306CB4');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (categorias.length === 0) {
        setDrafts(CATEGORIAS_INICIALES.map((c, i) => ({
          id: crypto.randomUUID(),
          nombre: c.nombre,
          color: c.color,
          orden: i,
          updatedAt: new Date().toISOString()
        })));
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
      updatedAt: new Date().toISOString()
    };
    setDrafts([...drafts, newCat]);
    setNuevaCategoria('');
    // Pick a different color for the next one randomly or sequentially
    const currentIdx = PALETA_COLORES.indexOf(nuevoColor);
    const nextColor = PALETA_COLORES[(currentIdx + 1) % PALETA_COLORES.length];
    setNuevoColor(nextColor);
  };

  const handleRemove = (id: string) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newDrafts = [...drafts];
    const temp = newDrafts[index - 1];
    newDrafts[index - 1] = newDrafts[index];
    newDrafts[index] = temp;
    // Fix orden
    newDrafts.forEach((d, i) => d.orden = i);
    setDrafts(newDrafts);
  };

  const handleMoveDown = (index: number) => {
    if (index === drafts.length - 1) return;
    const newDrafts = [...drafts];
    const temp = newDrafts[index + 1];
    newDrafts[index + 1] = newDrafts[index];
    newDrafts[index] = temp;
    // Fix orden
    newDrafts.forEach((d, i) => d.orden = i);
    setDrafts(newDrafts);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave = drafts.map((d, i) => ({ ...d, orden: i, updatedAt: new Date().toISOString() }));
      await dbCategoriasSave(toSave);
      await reload();
      onClose();
    } catch (err) {
      console.error(err);
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
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--white)',
          padding: '10px'
        }
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1, color: 'var(--black)' }}>
          Gestionar Categorías
        </Typography>
        <Typography variant="body2" color="var(--grey-400)" sx={{ mb: 3 }}>
          Organiza, crea y colorea las categorías de tus documentos pastorales.
        </Typography>
        
        {/* Lista de categorías actuales */}
        <Stack spacing={1.5} sx={{ mb: 4, maxHeight: '280px', overflowY: 'auto', pr: '4px' }}>
          {drafts.length === 0 ? (
            <Box sx={{ p: 3, border: '1px dashed var(--accent-200)', borderRadius: 'var(--radius-m)', textAlign: 'center' }}>
              <Typography color="var(--grey-400)" className="body-regular">
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
                  border: '1.5px solid var(--accent-150)', 
                  borderRadius: 'var(--radius-m)',
                  background: 'rgba(240, 244, 250, 0.3)',
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
                    background: 'rgba(240, 244, 250, 0.6)',
                    boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)'
                  }
                }}
              >
                <Typography sx={{ flex: 1, fontWeight: 600, color: 'var(--black)', fontSize: '14.5px', pl: 1 }}>
                  {cat.nombre}
                </Typography>
                
                <Stack direction="row" spacing={0.5}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleMoveUp(index)} 
                    disabled={index === 0}
                    sx={{ 
                      color: 'var(--grey-400)',
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      padding: '5px',
                      borderRadius: 'var(--radius-s)',
                      '&:hover': { color: 'var(--black)', backgroundColor: 'var(--accent-150)' }
                    }}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleMoveDown(index)} 
                    disabled={index === drafts.length - 1}
                    sx={{ 
                      color: 'var(--grey-400)',
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      padding: '5px',
                      borderRadius: 'var(--radius-s)',
                      '&:hover': { color: 'var(--black)', backgroundColor: 'var(--accent-150)' }
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
                      borderRadius: 'var(--radius-s)',
                      ml: 1,
                      '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Stack>
              </Box>
            ))
          )}
        </Stack>

        <Box sx={{ borderTop: '1px solid var(--accent-150)', pt: 3, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'var(--black)' }}>
            Crear Nueva Categoría
          </Typography>
          
          <Stack spacing={2}>
            {/* Selector de color curado */}
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'var(--grey-400)', fontWeight: 600 }}>
                SELECCIONA UN COLOR
              </Typography>
              <Grid container spacing={1}>
                {PALETA_COLORES.map(color => (
                  <Grid item key={color}>
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
                        border: nuevoColor === color ? '3px solid var(--white)' : 'none',
                        outline: nuevoColor === color ? `2.5px solid ${color}` : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                        '&:hover': {
                          transform: 'scale(1.15)',
                        }
                      }}
                    >
                      {nuevoColor === color && (
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--white)', boxShadow: '0 0 2px rgba(0,0,0,0.3)' }} />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Input nombre y botón añadir */}
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
                variant="contained" 
                onClick={handleAdd} 
                disabled={!nuevaCategoria.trim()}
                sx={{ 
                  height: '42px', 
                  backgroundColor: nuevoColor, 
                  color: 'var(--white)',
                  boxShadow: `0 4px 10px -2px ${nuevoColor}40`,
                  '&:hover': {
                    backgroundColor: nuevoColor,
                    opacity: 0.9,
                    boxShadow: `0 6px 14px -2px ${nuevoColor}50`,
                  }
                }}
              >
                Añadir
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Acciones principales del diálogo */}
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ borderTop: '1px solid var(--accent-150)', pt: 2.5 }}>
          <Button variant="outlined" onClick={onClose} disabled={isSaving} sx={{ borderRadius: 'var(--radius-m)' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving} sx={{ borderRadius: 'var(--radius-m)' }}>
            Guardar Cambios
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogCategorias;
