import { useEffect, useState } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import { dbDocumentosGetById, dbDocumentosMarcarVisto } from '@services/dexie/documentos';
import { DocumentoArchivo } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';

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
    <Dialog open={open} onClose={handleClose} fullScreen>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: '1px solid var(--accent-200)' }}>
          <Typography className="h2">{documento?.nombre || 'Documento'}</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleDownload} disabled={!pdfUrl}>Descargar</Button>
            <Button variant="contained" onClick={handleClose}>Cerrar</Button>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, position: 'relative' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={documento?.nombre}
            />
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default DialogVerDocumento;
