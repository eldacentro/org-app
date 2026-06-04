import { useState, useEffect } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
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
  { nombre: 'Otros', color: '#9CA3AF' },
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
    <Dialog open={open} onClose={isSaving ? undefined : onClose}>
      <Typography variant="h6" className="h2" sx={{ mb: 2 }}>Gestionar Categorías</Typography>
      
      <Stack spacing={2} sx={{ minWidth: { sm: 400 }, mb: 3 }}>
        {drafts.map((cat, index) => (
          <Stack key={cat.id} direction="row" spacing={1} alignItems="center" sx={{ p: 1, border: '1px solid var(--accent-200)', borderRadius: 'var(--radius-s)' }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: cat.color }} />
            <Typography sx={{ flex: 1 }}>{cat.nombre}</Typography>
            <IconButton size="small" onClick={() => handleMoveUp(index)} disabled={index === 0}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => handleMoveDown(index)} disabled={index === drafts.length - 1}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleRemove(cat.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Añadir Nueva Categoría</Typography>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <input 
          type="color" 
          value={nuevoColor} 
          onChange={(e) => setNuevoColor(e.target.value)} 
          style={{ width: 40, height: 40, padding: 0, border: 'none' }}
        />
        <TextField 
          label="Nombre" 
          value={nuevaCategoria} 
          onChange={(e) => setNuevaCategoria(e.target.value)} 
        />
        <Button variant="outlined" onClick={handleAdd} disabled={!nuevaCategoria.trim()}>
          Añadir
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={onClose} disabled={isSaving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>Guardar Cambios</Button>
      </Stack>
    </Dialog>
  );
};

export default DialogCategorias;
