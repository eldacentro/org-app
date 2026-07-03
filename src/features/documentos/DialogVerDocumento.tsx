import { useEffect, useState } from 'react';
import { Box, Stack, Skeleton, Dialog, AppBar, Toolbar } from '@mui/material';
import { useAtomValue } from 'jotai';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IconButton from '@components/icon_button';
import { IconClose, IconCloudDownload, IconFullscreen } from '@components/icons';
import Typography from '@components/typography';
import Button from '@components/button';
import { dbDocumentosGetLocalFile } from '@services/dexie/documentos';
import { marcarDocumentoVisto } from '@services/firebase/documentos';
import { DocumentoArchivo } from '@definition/documentos';
import { documentoCategoriasState } from '@states/documentos';
import { congIDState } from '@states/settings';
import useCurrentUser from '@hooks/useCurrentUser';
import { useBreakpoints } from '@hooks/index';

interface DialogVerDocumentoProps {
  open: boolean;
  documento: DocumentoArchivo | null;
  onClose: () => void;
}

const DialogVerDocumento = ({ open, documento, onClose }: DialogVerDocumentoProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { person } = useCurrentUser();
  const { tablet688Up } = useBreakpoints();
  const categorias = useAtomValue(documentoCategoriasState);
  const congId = useAtomValue(congIDState);

  const categoria = documento
    ? categorias.find((c) => c.id === documento.categoriaId)
    : undefined;
  const accentColor = categoria?.color || 'var(--accent-main)';

  useEffect(() => {
    let blobUrl = '';

    if (open && documento) {
      setLoading(true);

      dbDocumentosGetLocalFile(documento.id).then((fileData) => {
        if (fileData) {
          try {
            const byteString = window.atob(fileData);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              byteArray[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            blobUrl = URL.createObjectURL(blob);
            setPdfUrl(blobUrl);
          } catch (e) {
            console.error('Error al cargar PDF local, usando URL remota', e);
            if (documento.downloadURL) setPdfUrl(documento.downloadURL);
          }
        } else if (documento.downloadURL) {
          setPdfUrl(documento.downloadURL);
        }

        setTimeout(() => setLoading(false), 600);
      });
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, documento]);

  const handleClose = () => {
    // Fire-and-forget — marcar como visto no bloquea el cierre del diálogo
    if (documento && person?.person_uid && congId && pdfUrl) {
      marcarDocumentoVisto(congId, documento.id, person.person_uid).catch(console.error);
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
      <AppBar
        position="static"
        elevation={0}
        sx={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', color: 'var(--black)' }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            padding: { mobile: '8px 12px', tablet: '8px 24px' },
            minHeight: '64px !important',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="30%" height={16} />
            </Box>
          </Stack>
          <Skeleton
            variant="rectangular"
            width={80}
            height={36}
            sx={{ borderRadius: 'var(--r-sm)' }}
          />
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, p: 3 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ borderRadius: 'var(--r-md)', minHeight: 300 }}
        />
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
          background: 'var(--card)',
          maxWidth: tablet688Up ? '850px' : 'none',
          width: tablet688Up ? '90vw' : '100%',
          height: tablet688Up ? '85vh' : '100%',
          borderRadius: tablet688Up ? 'var(--r-lg)' : 0,
          margin: tablet688Up ? 'auto' : 0,
          overflow: 'hidden',
        },
      }}
    >
      {loading ? (
        renderSkeleton()
      ) : documento && pdfUrl ? (
        tablet688Up ? (
          /* ── Vista escritorio: visor embebido ── */
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <AppBar
              position="static"
              elevation={0}
              sx={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <Toolbar sx={{ justifyContent: 'space-between', padding: '8px 24px', minHeight: '64px !important' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 42,
                      height: 42,
                      background: `color-mix(in srgb, ${accentColor} 7%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
                      borderRadius: 'var(--r-sm)',
                      color: accentColor,
                      flexShrink: 0,
                    }}
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      className="h3"
                      sx={{
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      {documento.nombre}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                      {categoria && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: accentColor,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {categoria.nombre} •
                        </Typography>
                      )}
                      <Typography className="label-small-regular" color="var(--ink-2)">
                        {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button
                    variant="tertiary"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    startIcon={<IconFullscreen />}
                    sx={{ borderRadius: 'var(--r-sm)' }}
                  >
                    Pantalla completa
                  </Button>
                  <Button
                    variant="main"
                    onClick={handleDownload}
                    startIcon={<IconCloudDownload />}
                    sx={{
                      borderRadius: 'var(--r-sm)',
                      backgroundColor: accentColor,
                      color: 'var(--always-white) !important',
                      '&:hover': { backgroundColor: accentColor, opacity: 0.9 },
                    }}
                  >
                    Descargar
                  </Button>
                  <IconButton onClick={handleClose} sx={{ color: 'var(--ink-2)', ml: 1 }}>
                    <IconClose />
                  </IconButton>
                </Stack>
              </Toolbar>
            </AppBar>

            <Box sx={{ flex: 1, position: 'relative', background: 'var(--paper)', p: 1.5 }}>
              <object
                data={pdfUrl}
                type="application/pdf"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--line)',
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ mb: 2, color: 'var(--ink)', fontWeight: 600 }}>
                    El visor de PDF no se cargó correctamente en el navegador.
                  </Typography>
                  <Button
                    variant="main"
                    onClick={handleDownload}
                    startIcon={<IconCloudDownload />}
                    sx={{ backgroundColor: accentColor, color: 'var(--always-white) !important' }}
                  >
                    Descargar documento
                  </Button>
                </Box>
              </object>
            </Box>
          </Box>
        ) : (
          /* ── Vista móvil: ficha con acciones ── */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 3%, transparent) 0%, color-mix(in srgb, ${accentColor} 9%, transparent) 100%)`,
              position: 'relative',
              px: 3,
              pb: 3,
              pt: 'calc(max(24px, env(safe-area-inset-top, 0px)) + 16px)',
              boxSizing: 'border-box',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IconButton
              onClick={handleClose}
              sx={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                right: 16,
                color: 'var(--ink-2)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                boxShadow: 'var(--shadow-sm)',
                '&:hover': { backgroundColor: 'var(--card)' },
              }}
            >
              <IconClose />
            </IconButton>

            <Box sx={{ mt: 2 }}>
              {categoria && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: `${categoria.color}15`,
                    color: categoria.color,
                    border: `1.5px solid ${categoria.color}35`,
                    px: 2,
                    py: 0.8,
                    lineHeight: 1,
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {categoria.nombre}
                </Box>
              )}
            </Box>

            <Box
              sx={{
                width: '100%',
                maxWidth: '340px',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                p: 4,
                boxSizing: 'border-box',
                boxShadow: '0 12px 32px -8px rgba(48, 108, 180, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `color-mix(in srgb, ${accentColor} 7%, transparent)`,
                  border: `1.5px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
                  borderRadius: 'var(--r-sm)',
                  color: accentColor,
                  boxShadow: `0 8px 20px -6px color-mix(in srgb, ${accentColor} 19%, transparent)`,
                }}
              >
                <PictureAsPdfIcon sx={{ fontSize: 40 }} />
              </Box>

              <Box>
                <Typography
                  className="h2"
                  sx={{ color: 'var(--ink)', fontWeight: 700, lineHeight: 1.3, mb: 1 }}
                >
                  {documento.nombre}
                </Typography>
                {documento.descripcion && (
                  <Typography className="body-small-regular" color="var(--ink-2)" sx={{ lineHeight: 1.45 }}>
                    {documento.descripcion}
                  </Typography>
                )}
              </Box>

              <Stack
                direction="row"
                spacing={2.5}
                sx={{ width: '100%', justifyContent: 'center', pt: 2, borderTop: '1px solid var(--line)' }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-3)"
                    sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '9px' }}
                  >
                    TAMAÑO
                  </Typography>
                  <Typography className="body-small-semibold" sx={{ color: 'var(--ink)', mt: 0.25 }}>
                    {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <Box sx={{ width: '1px', backgroundColor: 'var(--line)' }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-3)"
                    sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '9px' }}
                  >
                    FECHA
                  </Typography>
                  <Typography className="body-small-semibold" sx={{ color: 'var(--ink)', mt: 0.25 }}>
                    {new Date(documento.fechaSubida).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: '340px', mb: 3 }}>
              <Button
                variant="main"
                onClick={() => window.open(pdfUrl, '_blank')}
                startIcon={<IconFullscreen />}
                sx={{
                  height: '46px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: accentColor,
                  color: 'var(--always-white) !important',
                  boxShadow: `0 6px 20px -4px color-mix(in srgb, ${accentColor} 25%, transparent)`,
                  '&:hover': { backgroundColor: accentColor, opacity: 0.95 },
                }}
              >
                Abrir documento
              </Button>
              <Button
                variant="tertiary"
                onClick={handleDownload}
                startIcon={<IconCloudDownload />}
                sx={{
                  height: '46px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderColor: `color-mix(in srgb, ${accentColor} 50%, transparent) !important`,
                  color: `${accentColor} !important`,
                  '&:hover': { borderColor: accentColor, backgroundColor: `color-mix(in srgb, ${accentColor} 3%, transparent)` },
                }}
              >
                Descargar archivo
              </Button>
            </Stack>
          </Box>
        )
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography color="error" sx={{ mb: 2 }}>
            Error al cargar el documento.
          </Typography>
          <Button variant="tertiary" onClick={handleClose}>
            Cerrar
          </Button>
        </Box>
      )}
    </Dialog>
  );
};

export default DialogVerDocumento;
