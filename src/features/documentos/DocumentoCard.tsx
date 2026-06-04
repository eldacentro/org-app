import { Box, Stack, Card, IconButton, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@components/button';
import Typography from '@components/typography';
import MiniChip from '@components/mini_chip';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';

interface DocumentoCardProps {
  documento: DocumentoArchivo;
  categoria?: DocumentoCategoria;
  onView: (doc: DocumentoArchivo) => void;
  onDelete: (doc: DocumentoArchivo) => void;
  onArchive: (doc: DocumentoArchivo) => void;
}

const DocumentoCard = ({ documento, categoria, onView, onDelete, onArchive }: DocumentoCardProps) => {
  const { isElder, isAdmin, person } = useCurrentUser();
  const canManage = isElder || isAdmin;
  
  const isNew = person?.person_uid ? !documento.vistoPor?.includes(person.person_uid) : false;

  const renderVigenciaBadge = () => {
    if (documento.archivado) {
      return <MiniChip label="Expirado/Archivado" edit={false} />;
    }
    if (documento.vigencia === 'indefinido') {
      return <MiniChip label="Indefinido" edit={false} />;
    }
    if (documento.fechaExpiracion) {
      const diff = new Date(documento.fechaExpiracion).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      if (days <= 7) {
        return <MiniChip label={`Expira en ${days} días`} edit={false} />;
      }
      return <MiniChip label={`Expira el ${new Date(documento.fechaExpiracion).toLocaleDateString()}`} edit={false} />;
    }
    return null;
  };

  return (
    <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      {isNew && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: 'var(--blue-main)'
        }} />
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start">
        <PictureAsPdfIcon sx={{ color: 'var(--red-main)', fontSize: 40 }} />
        
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} mb={0.5}>
            {categoria && (
              <Box sx={{ 
                backgroundColor: categoria.color || 'var(--accent-main)', 
                color: 'white', 
                px: 1, 
                py: 0.25, 
                borderRadius: 'var(--radius-s)', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {categoria.nombre}
              </Box>
            )}
            {renderVigenciaBadge()}
          </Stack>
          
          <Typography className="h3">{documento.nombre}</Typography>
          
          {documento.descripcion && (
            <Typography color="var(--grey-400)" className="label-small" sx={{ mt: 0.5 }}>
              {documento.descripcion}
            </Typography>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Typography className="label-small" color="var(--grey-350)">
              Subido: {new Date(documento.fechaSubida).toLocaleDateString()}
            </Typography>
            <Typography className="label-small" color="var(--grey-350)">
              {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 'auto', pt: 1, borderTop: '1px solid var(--accent-200)' }}>
        {canManage && !documento.archivado && (
          <Tooltip title="Archivar">
            <IconButton onClick={() => onArchive(documento)} size="small">
              <ArchiveIcon />
            </IconButton>
          </Tooltip>
        )}
        {canManage && (
          <Tooltip title="Eliminar">
            <IconButton onClick={() => onDelete(documento)} size="small" sx={{ color: 'var(--red-main)' }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
        <Button variant="contained" onClick={() => onView(documento)}>Ver Documento</Button>
      </Stack>
    </Card>
  );
};

export default DocumentoCard;
