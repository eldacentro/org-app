import { Box, Stack, IconButton, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArchiveIcon from '@mui/icons-material/Archive';
import { IconDelete } from '@components/icons';
import Typography from '@components/typography';
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
      return (
        <Box sx={{ background: 'var(--red-secondary)', color: 'var(--red-dark)', px: 1, py: 0.25, borderRadius: 'var(--radius-s)', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>
          Expirado/Archivado
        </Box>
      );
    }
    if (documento.vigencia === 'indefinido') {
      return (
        <Box sx={{ background: 'var(--grey-150)', color: 'var(--grey-400)', px: 1, py: 0.25, borderRadius: 'var(--radius-s)', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>
          Indefinido
        </Box>
      );
    }
    if (documento.fechaExpiracion) {
      const diff = new Date(documento.fechaExpiracion).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      if (days <= 7) {
        return (
          <Box sx={{ background: 'var(--orange-secondary)', color: 'var(--orange-dark)', px: 1, py: 0.25, borderRadius: 'var(--radius-s)', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>
            Expira en {days} días
          </Box>
        );
      }
      return (
        <Box sx={{ background: 'var(--accent-150)', color: 'var(--accent-dark)', px: 1, py: 0.25, borderRadius: 'var(--radius-s)', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>
          Expira el {new Date(documento.fechaExpiracion).toLocaleDateString()}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--accent-200)',
        background: 'var(--white)',
        boxShadow: 'var(--shadow-01)',
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 'var(--shadow-02)',
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => onView(documento)}
    >
      {isNew && (
        <Box sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: 'var(--blue-main)'
        }} />
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ 
          width: 48, 
          height: 48, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--red-secondary)',
          borderRadius: 'var(--radius-m)',
          flexShrink: 0
        }}>
          <PictureAsPdfIcon sx={{ color: 'var(--red-main)', fontSize: 28 }} />
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} mb={0.5} sx={{ flexWrap: 'wrap', gap: '4px', mb: 1 }}>
            {categoria && (
              <Box sx={{ 
                backgroundColor: `${categoria.color}20`, 
                color: categoria.color, 
                border: `1px solid ${categoria.color}40`,
                px: 1, 
                py: 0.25, 
                borderRadius: 'var(--radius-s)', 
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-block'
              }}>
                {categoria.nombre}
              </Box>
            )}
            {renderVigenciaBadge()}
          </Stack>
          
          <Typography className="h3" sx={{ 
            color: 'var(--black)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3
          }}>
            {documento.nombre}
          </Typography>
          
          {documento.descripcion && (
            <Typography color="var(--grey-400)" className="body-small-regular" sx={{ 
              mt: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {documento.descripcion}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', pt: 1, borderTop: '1px solid var(--accent-150)' }}>
        <Stack direction="row" spacing={1.5}>
          <Typography className="label-small-regular" color="var(--grey-350)">
            {new Date(documento.fechaSubida).toLocaleDateString()}
          </Typography>
          <Typography className="label-small-regular" color="var(--grey-350)">
            •
          </Typography>
          <Typography className="label-small-regular" color="var(--grey-350)">
            {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Stack>
        
        {canManage && (
          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
            {!documento.archivado && (
              <Tooltip title="Archivar">
                <IconButton 
                  onClick={() => onArchive(documento)} 
                  size="small"
                  sx={{ 
                    color: 'var(--grey-400)',
                    '&:hover': { background: 'var(--grey-150)' }
                  }}
                >
                  <ArchiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Eliminar">
              <IconButton 
                onClick={() => onDelete(documento)} 
                size="small" 
                sx={{ 
                  color: 'var(--red-main)',
                  '&:hover': { background: 'var(--red-secondary)' }
                }}
              >
                <IconDelete color="var(--red-main)" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default DocumentoCard;
