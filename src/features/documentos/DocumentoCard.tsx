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
        <Box sx={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: '#EF4444', 
          border: '1px solid rgba(239, 68, 68, 0.2)',
          px: 1.2, 
          py: 0.4, 
          borderRadius: 'var(--radius-s)', 
          fontSize: '11px', 
          fontWeight: 600, 
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}>
          Archivado
        </Box>
      );
    }
    if (documento.vigencia === 'indefinido') {
      return (
        <Box sx={{ 
          background: 'var(--accent-150)', 
          color: 'var(--grey-400)', 
          border: '1px solid var(--accent-200)',
          px: 1.2, 
          py: 0.4, 
          borderRadius: 'var(--radius-s)', 
          fontSize: '11px', 
          fontWeight: 600, 
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}>
          Indefinido
        </Box>
      );
    }
    if (documento.fechaExpiracion) {
      const diff = new Date(documento.fechaExpiracion).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      if (days <= 0) {
        return (
          <Box sx={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#EF4444', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            px: 1.2, 
            py: 0.4, 
            borderRadius: 'var(--radius-s)', 
            fontSize: '11px', 
            fontWeight: 600, 
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Expirado
          </Box>
        );
      }
      if (days <= 7) {
        return (
          <Box sx={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            color: '#D97706', 
            border: '1px solid rgba(245, 158, 11, 0.2)',
            px: 1.2, 
            py: 0.4, 
            borderRadius: 'var(--radius-s)', 
            fontSize: '11px', 
            fontWeight: 600, 
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Expira en {days} d
          </Box>
        );
      }
      return (
        <Box sx={{ 
          background: 'rgba(48, 108, 180, 0.1)', 
          color: '#306CB4', 
          border: '1px solid rgba(48, 108, 180, 0.2)',
          px: 1.2, 
          py: 0.4, 
          borderRadius: 'var(--radius-s)', 
          fontSize: '11px', 
          fontWeight: 600, 
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}>
          Expira el {new Date(documento.fechaExpiracion).toLocaleDateString()}
        </Box>
      );
    }
    return null;
  };

  // Curated fallback brand color
  const accentColor = categoria?.color || '#306CB4';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        borderRadius: 'var(--radius-l)',
        border: `1px solid var(--accent-200)`,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '5px',
          height: '100%',
          backgroundColor: accentColor,
          opacity: 0.8,
          transition: 'all 0.3s ease',
        },
        '&:hover': {
          boxShadow: 'var(--shadow-md)',
          transform: 'translateY(-4px)',
          borderColor: accentColor,
          background: 'rgba(255, 255, 255, 0.9)',
          '&::before': {
            width: '8px',
            opacity: 1,
          }
        },
      }}
      onClick={() => onView(documento)}
    >
      {isNew && (
        <Tooltip title="Nuevo Documento">
          <Box sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#306CB4',
            boxShadow: '0 0 8px #306CB4',
            animation: 'pulse 2.2s infinite'
          }} />
        </Tooltip>
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ pl: '4px' }}>
        <Box sx={{ 
          width: 52, 
          height: 52, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: `${accentColor}12`,
          borderRadius: 'var(--radius-m)',
          border: `1.5px solid ${accentColor}25`,
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}>
          <PictureAsPdfIcon sx={{ color: accentColor, fontSize: 30 }} />
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mb: 1 }}>
            {categoria && (
              <Box sx={{ 
                backgroundColor: `${categoria.color}15`, 
                color: categoria.color, 
                border: `1px solid ${categoria.color}35`,
                px: 1.2, 
                py: 0.4, 
                borderRadius: 'var(--radius-s)', 
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                {categoria.nombre}
              </Box>
            )}
            {renderVigenciaBadge()}
          </Box>
          
          <Typography className="h3" sx={{ 
            color: 'var(--black)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.35,
            fontWeight: 600,
            fontSize: '16px'
          }}>
            {documento.nombre}
          </Typography>
          
          {documento.descripcion && (
            <Typography color="var(--grey-400)" className="body-small-regular" sx={{ 
              mt: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              fontSize: '13px'
            }}>
              {documento.descripcion}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', pt: 1.5, pl: '4px', borderTop: '1px solid var(--accent-150)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
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
              <Tooltip title="Archivar Documento">
                <IconButton 
                  onClick={() => onArchive(documento)} 
                  size="small"
                  sx={{ 
                    color: 'var(--grey-400)',
                    padding: '6px',
                    borderRadius: 'var(--radius-s)',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      color: 'var(--grey-500)',
                      background: 'rgba(0, 0, 0, 0.06)' 
                    }
                  }}
                >
                  <ArchiveIcon sx={{ fontSize: '18px' }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Eliminar Permanentemente">
              <IconButton 
                onClick={() => onDelete(documento)} 
                size="small" 
                sx={{ 
                  color: 'var(--red-main)',
                  padding: '6px',
                  borderRadius: 'var(--radius-s)',
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    color: '#EF4444',
                    background: 'rgba(239, 68, 68, 0.1)' 
                  }
                }}
              >
                <IconDelete color="currentColor" style={{ width: '18px', height: '18px' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default DocumentoCard;

