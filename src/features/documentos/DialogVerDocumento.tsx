import { useEffect, useState } from 'react';
import { Box, Stack, Skeleton, Dialog, AppBar, Toolbar } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IconButton from '@components/icon_button';
import { IconClose, IconCloudDownload, IconFullscreen } from '@components/icons';
import Typography from '@components/typography';
import Button from '@components/button';
import { dbDocumentosGetById, dbDocumentosMarcarVisto } from '@services/dexie/documentos';
import { DocumentoArchivo } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';
import { useBreakpoints } from '@hooks/index';
import { useDocumentos } from './useDocumentos';

interface DialogVerDocumentoProps {
  open: boolean;
  documento: DocumentoArchivo | null;
  onClose: () => void;
  onViewed: () => void;
}

const DialogVerDocumento = ({ open, documento, onClose, onViewed }: DialogVerDocumentoProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { person } = useCurrentUser();
  const { tablet688Up } = useBreakpoints();
  const { categorias } = useDocumentos();

  const categoria = documento ? categorias.find(c => c.id === documento.categoriaId) : undefined;
  const accentColor = categoria?.color || '#306CB4';

  useEffect(() => {
    let url = '';
    if (open && documento) {
      setLoading(true);
      dbDocumentosGetById(documento.id).then(docConArchivo => {
        if (docConArchivo?.fileData) {
          try {
            const byteString = window.atob(docConArchivo.fileData);
            const byteNumbers = new Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              byteNumbers[i] = byteString.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            url = URL.createObjectURL(blob);
            setPdfUrl(url);
          } catch (e) {
            console.error('Error al cargar PDF', e);
          }
        }
        // Artificial delay for loading feel (and decryption to finish smoothly)
        setTimeout(() => {
          setLoading(false);
        }, 600);
      });
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [open, documento]);

  const handleClose = async () => {
    if (documento && person?.person_uid) {
      await dbDocumentosMarcarVisto(documento.id, person.person_uid);
      onViewed();
    }
    setPdfUrl(null);
    onClose();
  };

  const handleDownload = () => {
    if (pdfUrl && documento) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = documento.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderSkeleton = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppBar position="static" elevation={0} sx={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', color: 'var(--black)' }}>
        <Toolbar sx={{ justifyContent: 'space-between', padding: { mobile: '8px 12px', tablet: '8px 24px' }, minHeight: '64px !important' }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="30%" height={16} />
            </Box>
          </Stack>
          <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 'var(--radius-s)' }} />
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 'var(--radius-l)', flex: 1 }} />
      </Box>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullScreen={!tablet688Up}
      PaperProps={{
        sx: { 
          background: 'var(--white)',
          maxWidth: tablet688Up ? '850px' : 'none',
          width: tablet688Up ? '90vw' : '100%',
          height: tablet688Up ? '85vh' : '100%',
          borderRadius: tablet688Up ? 'var(--radius-xl)' : 0,
          margin: tablet688Up ? 'auto' : 0,
          overflow: 'hidden'
        }
      }}
    >
      {loading ? (
        renderSkeleton()
      ) : documento && pdfUrl ? (
        tablet688Up ? (
          /* Desktop View: Full Embedded Viewer */
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <AppBar position="static" elevation={0} sx={{ 
              background: 'var(--card)', 
              borderBottom: '1px solid var(--line)',
              color: 'var(--black)'
            }}>
              <Toolbar sx={{ justifyContent: 'space-between', padding: '8px 24px', minHeight: '64px !important' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: 42, 
                    height: 42, 
                    background: `${accentColor}12`, 
                    border: `1.5px solid ${accentColor}25`,
                    borderRadius: 'var(--radius-m)', 
                    color: accentColor,
                    flexShrink: 0 
                  }}>
                    <PictureAsPdfIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography className="h3" sx={{ 
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      fontWeight: 700,
                      color: 'var(--black)'
                    }}>
                      {documento.nombre}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                      {categoria && (
                        <Typography variant="caption" sx={{ color: accentColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.02em' }}>
                          {categoria.nombre} •
                        </Typography>
                      )}
                      <Typography className="label-small-regular" color="var(--grey-400)">
                        {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button 
                    variant="outlined" 
                    onClick={() => window.open(pdfUrl, '_blank')} 
                    startIcon={<IconFullscreen />}
                    sx={{ borderRadius: 'var(--radius-m)', borderColor: 'var(--accent-300)', color: 'var(--black)' }}
                  >
                    Pantalla completa
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleDownload} 
                    startIcon={<IconCloudDownload />}
                    sx={{ borderRadius: 'var(--radius-m)', backgroundColor: accentColor, '&:hover': { backgroundColor: accentColor, opacity: 0.9 } }}
                  >
                    Descargar
                  </Button>
                  <IconButton onClick={handleClose} sx={{ color: 'var(--grey-400)', ml: 1 }}>
                    <IconClose />
                  </IconButton>
                </Stack>
              </Toolbar>
            </AppBar>

            <Box sx={{ flex: 1, position: 'relative', background: 'var(--grey-100)', p: 1.5 }}>
              <object
                data={pdfUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%', display: 'block', borderRadius: 'var(--radius-l)', border: '1px solid var(--accent-200)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ mb: 2, color: 'var(--black)', fontWeight: 600 }}>El visor de PDF no se cargó correctamente en el navegador.</Typography>
                  <Button variant="contained" onClick={handleDownload} startIcon={<IconCloudDownload />} sx={{ backgroundColor: accentColor }}>
                    Descargar documento
                  </Button>
                </Box>
              </object>
            </Box>
          </Box>
        ) : (
          /* Mobile View: High-Fidelity Cover Sheet with Native View Trigger */
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            background: `linear-gradient(135deg, ${accentColor}08 0%, ${accentColor}18 100%)`,
            position: 'relative',
            p: 3,
            boxSizing: 'border-box',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* Close Button floating top-right */}
            <IconButton 
              onClick={handleClose} 
              sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                color: 'var(--grey-400)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                boxShadow: 'var(--shadow-sm)',
                '&:hover': { backgroundColor: 'var(--white)' }
              }}
            >
              <IconClose />
            </IconButton>

            {/* Category Header */}
            <Box sx={{ mt: 4 }}>
              {categoria && (
                <Box sx={{ 
                  backgroundColor: `${categoria.color}15`, 
                  color: categoria.color, 
                  border: `1.5px solid ${categoria.color}35`,
                  px: 2, 
                  py: 0.6, 
                  borderRadius: '999px', 
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {categoria.nombre}
                </Box>
              )}
            </Box>

            {/* Premium Document Showcase Card */}
            <Box sx={{ 
              width: '100%', 
              maxWidth: '340px', 
              backgroundColor: 'rgba(255, 255, 255, 0.75)', 
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--accent-150)',
              borderRadius: 'var(--radius-xl)', 
              p: 4,
              boxSizing: 'border-box',
              boxShadow: '0 12px 32px -8px rgba(48, 108, 180, 0.08)',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center',
              gap: 2.5
            }}>
              <Box sx={{ 
                width: 76, 
                height: 76, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: `${accentColor}12`,
                border: `1.5px solid ${accentColor}25`,
                borderRadius: 'var(--radius-l)',
                color: accentColor,
                boxShadow: `0 8px 20px -6px ${accentColor}30`
              }}>
                <PictureAsPdfIcon sx={{ fontSize: 40 }} />
              </Box>

              <Box>
                <Typography className="h2" sx={{ color: 'var(--black)', fontWeight: 700, lineHeight: 1.3, mb: 1, fontSize: '18px' }}>
                  {documento.nombre}
                </Typography>
                {documento.descripcion && (
                  <Typography variant="body2" color="var(--grey-400)" sx={{ fontSize: '13px', lineHeight: 1.45 }}>
                    {documento.descripcion}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={2.5} sx={{ width: '100%', justifyContent: 'center', pt: 2, borderTop: '1px solid var(--accent-150)' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="var(--grey-350)" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '9px' }}>
                    TAMAÑO
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--black)', mt: 0.25 }}>
                    {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <Box sx={{ width: '1px', backgroundColor: 'var(--accent-150)' }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="var(--grey-350)" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '9px' }}>
                    FECHA
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--black)', mt: 0.25 }}>
                    {new Date(documento.fechaSubida).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Action buttons */}
            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: '340px', mb: 3 }}>
              <Button 
                variant="contained" 
                onClick={() => window.open(pdfUrl, '_blank')}
                startIcon={<IconFullscreen />}
                sx={{ 
                  height: '46px', 
                  borderRadius: 'var(--radius-m)', 
                  fontSize: '14px', 
                  fontWeight: 700,
                  backgroundColor: accentColor,
                  boxShadow: `0 6px 20px -4px ${accentColor}40`,
                  '&:hover': {
                    backgroundColor: accentColor,
                    opacity: 0.95
                  }
                }}
              >
                Abrir documento
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleDownload}
                startIcon={<IconCloudDownload />}
                sx={{ 
                  height: '46px', 
                  borderRadius: 'var(--radius-m)', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  borderColor: 'var(--accent-300)',
                  color: 'var(--black)',
                  '&:hover': {
                    borderColor: 'var(--accent-400)',
                    backgroundColor: 'rgba(0,0,0,0.02)'
                  }
                }}
              >
                Descargar archivo
              </Button>
            </Stack>
          </Box>
        )
      ) : (
        <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography color="error" sx={{ mb: 2 }}>Error al cargar el documento.</Typography>
          <Button variant="outlined" onClick={handleClose}>Cerrar</Button>
        </Box>
      )}
    </Dialog>
  );
};

export default DialogVerDocumento;
