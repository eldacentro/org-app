import { useEffect, useState } from 'react';
import { Box, Stack, CircularProgress, Dialog, AppBar, Toolbar } from '@mui/material';
import IconButton from '@components/icon_button';
import { IconClose, IconCloudDownload } from '@components/icons';
import Typography from '@components/typography';
import Button from '@components/button';
import { dbDocumentosGetById, dbDocumentosMarcarVisto } from '@services/dexie/documentos';
import { DocumentoArchivo } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';
import { useBreakpoints } from '@hooks/index';

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
        setLoading(false);
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

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullScreen={!tablet688Up}
      PaperProps={{
        sx: { 
          background: 'var(--white)',
          maxWidth: tablet688Up ? '800px' : 'none',
          width: tablet688Up ? '90vw' : '100%',
          height: tablet688Up ? '90vh' : '100%',
          borderRadius: tablet688Up ? 'var(--radius-xl)' : 0,
          margin: tablet688Up ? 'auto' : 0,
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header estético */}
        <AppBar position="static" elevation={0} sx={{ 
          background: 'var(--card)', 
          borderBottom: '1px solid var(--line)',
          color: 'var(--black)'
        }}>
          <Toolbar sx={{ justifyContent: 'space-between', padding: { mobile: '8px 12px', tablet: '8px 24px' }, minHeight: '64px !important' }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0, mr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'var(--accent-150)', borderRadius: 'var(--radius-m)', flexShrink: 0 }}>
                <Typography className="h2" sx={{ color: 'var(--accent-main)' }}>📄</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography className="h3" sx={{ 
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {documento?.nombre || 'Documento'}
                </Typography>
                {documento?.fileSize && (
                  <Typography className="label-small-regular" color="var(--grey-400)">
                    {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {tablet688Up ? (
                <Button variant="outlined" onClick={handleDownload} disabled={!pdfUrl} startIcon={<IconCloudDownload />}>
                  Descargar
                </Button>
              ) : (
                <IconButton onClick={handleDownload} disabled={!pdfUrl} sx={{ color: 'var(--accent-main)', background: 'var(--accent-150)' }}>
                  <IconCloudDownload />
                </IconButton>
              )}
              
              <IconButton onClick={handleClose} sx={{ color: 'var(--grey-400)' }}>
                <IconClose />
              </IconButton>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Visor de PDF */}
        <Box sx={{ flex: 1, position: 'relative', background: 'var(--grey-100)' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title={documento?.nombre}
            />
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default DialogVerDocumento;
