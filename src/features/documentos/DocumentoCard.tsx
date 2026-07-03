import { Box, Stack, IconButton, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { IconDelete } from '@components/icons';
import Typography from '@components/typography';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';

interface DocumentoCardProps {
  documento: DocumentoArchivo;
  categoria?: DocumentoCategoria;
  onView: (doc: DocumentoArchivo) => void;
  onDelete: (doc: DocumentoArchivo) => void;
}

const DocumentoCard = ({ documento, categoria, onView, onDelete }: DocumentoCardProps) => {
  const { isElder, isAdmin, person } = useCurrentUser();
  const canManage = isElder || isAdmin;

  const isNew = person?.person_uid
    ? !documento.vistoPor?.includes(person.person_uid)
    : false;

  const renderVigenciaBadge = () => {
    if (documento.vigencia === 'indefinido') {
      return (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            lineHeight: 1,
            background: 'var(--brand-tint)',
            color: 'var(--brand-deep)',
            border: '1px solid var(--line)',
            px: 1.2,
            py: 0.6,
            borderRadius: 'var(--r-sm)',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          Indefinido
        </Box>
      );
    }
    if (documento.fechaExpiracion) {
      const diff = new Date(documento.fechaExpiracion).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      if (days <= 7) {
        return (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: 1,
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#D97706',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              px: 1.2,
              py: 0.6,
              borderRadius: 'var(--r-sm)',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Expira en {days} d
          </Box>
        );
      }
      return (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            lineHeight: 1,
            background: 'rgba(var(--accent-main-base), 0.08)',
            color: 'var(--accent-main)',
            border: '1px solid rgba(var(--accent-main-base), 0.15)',
            px: 1.2,
            py: 0.6,
            borderRadius: 'var(--r-sm)',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          Expira el {new Date(documento.fechaExpiracion).toLocaleDateString()}
        </Box>
      );
    }
    return null;
  };

  const accentColor = categoria?.color || 'var(--accent-main)';

  return (
    <Box
      className="active-press"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--line)',
        background: 'var(--card)',
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
          '&::before': { width: '8px', opacity: 1 },
        },
      }}
      onClick={() => onView(documento)}
    >
      {isNew && (
        <Tooltip title="Nuevo documento">
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--brand)',
              boxShadow: '0 0 8px var(--brand)',
              animation: 'pulse 2.2s infinite',
            }}
          />
        </Tooltip>
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ pl: '4px' }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `color-mix(in srgb, ${accentColor} 7%, transparent)`,
            borderRadius: 'var(--r-sm)',
            border: `1.5px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
            flexShrink: 0,
            transition: 'all 0.3s ease',
          }}
        >
          <PictureAsPdfIcon sx={{ color: accentColor, fontSize: 30 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mb: 1 }}>
            {categoria && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  lineHeight: 1,
                  backgroundColor: `${categoria.color}15`,
                  color: categoria.color,
                  border: `1px solid ${categoria.color}35`,
                  px: 1.2,
                  py: 0.6,
                  borderRadius: 'var(--r-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {categoria.nombre}
              </Box>
            )}
            {renderVigenciaBadge()}
          </Box>

          <Typography
            className="h3"
            sx={{
              color: 'var(--ink)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '-0.01em',
            }}
          >
            {documento.nombre}
          </Typography>

          {documento.descripcion && (
            <Typography
              color="var(--ink-2)"
              className="body-small-regular"
              sx={{
                mt: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4,
              }}
            >
              {documento.descripcion}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 'auto', pt: 1.5, pl: '4px', borderTop: '1px solid var(--line)' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography className="label-small-regular" color="var(--ink-3)">
            {new Date(documento.fechaSubida).toLocaleDateString()}
          </Typography>
          <Typography className="label-small-regular" color="var(--ink-3)">•</Typography>
          <Typography className="label-small-regular" color="var(--ink-3)">
            {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Stack>

        {canManage && (
          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Eliminar documento">
              <IconButton
                onClick={() => onDelete(documento)}
                size="small"
                sx={{
                  color: 'var(--red-main)',
                  padding: '6px',
                  borderRadius: 'var(--r-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                  transition: 'all 0.2s',
                  '&:hover': { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' },
                }}
              >
                <IconDelete color="currentColor" width={18} height={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default DocumentoCard;
