import { useState, useRef } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import { useAtomValue } from 'jotai';
import { PDFDocument } from 'pdf-lib';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import Select from '@components/select';
import Button from '@components/button';
import Typography from '@components/typography';
import { DocumentoArchivo, DocumentoVigencia } from '@definition/documentos';
import { dbDocumentosGuardarArchivo } from '@services/dexie/documentos';
import { uploadDocumentoPDF, saveDocumentoFirestore } from '@services/firebase/documentos';
import useCurrentUser from '@hooks/useCurrentUser';
import { congIDState } from '@states/settings';
import { documentoCategoriasState } from '@states/documentos';
import MenuItem from '@components/menuitem';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const WARN_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB

const vigenciaOptions = [
  { value: '1semana', label: '1 semana' },
  { value: '2semanas', label: '2 semanas' },
  { value: '1mes', label: '1 mes' },
  { value: '3meses', label: '3 meses' },
  { value: '6meses', label: '6 meses' },
  { value: '1anyo', label: '1 año' },
  { value: 'indefinido', label: 'Indefinido' },
];

const calculateExpiration = (vigencia: DocumentoVigencia): string | undefined => {
  if (vigencia === 'indefinido') return undefined;

  const now = new Date();
  switch (vigencia) {
    case '1semana':  now.setDate(now.getDate() + 7);           break;
    case '2semanas': now.setDate(now.getDate() + 14);          break;
    case '1mes':     now.setMonth(now.getMonth() + 1);         break;
    case '3meses':   now.setMonth(now.getMonth() + 3);         break;
    case '6meses':   now.setMonth(now.getMonth() + 6);         break;
    case '1anyo':    now.setFullYear(now.getFullYear() + 1);   break;
  }
  return now.toISOString();
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

interface DialogSubirDocumentoProps {
  open: boolean;
  onClose: () => void;
}

const DialogSubirDocumento = ({ open, onClose }: DialogSubirDocumentoProps) => {
  const { person } = useCurrentUser();
  const congId = useAtomValue(congIDState);
  const categorias = useAtomValue(documentoCategoriasState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [vigencia, setVigencia] = useState<DocumentoVigencia>('1mes');
  const [file, setFile] = useState<File | null>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setError('El archivo supera el límite de 15 MB');
        return;
      }
      setError(selected.size > WARN_FILE_SIZE ? 'El archivo es grande, la compresión podría tardar' : null);
      setFile(selected);
    }
  };

  const handleSubir = async () => {
    if (!nombre || !categoriaId || !file) {
      setError('Por favor completa los campos requeridos y selecciona un archivo');
      return;
    }

    try {
      setIsCompressing(true);
      setError(null);

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      const base64Data = arrayBufferToBase64(compressedBytes);

      setIsCompressing(false);
      setIsUploading(true);

      const id = crypto.randomUUID();
      const downloadURL = await uploadDocumentoPDF(congId, id, compressedBlob);

      const doc: DocumentoArchivo = {
        id,
        nombre,
        descripcion,
        categoriaId,
        fileName: file.name,
        fileSize: compressedBlob.size,
        downloadURL,
        vigencia,
        fechaSubida: new Date().toISOString(),
        fechaExpiracion: calculateExpiration(vigencia),
        subidoPor: person?.person_uid || '',
        vistoPor: [],
        updatedAt: new Date().toISOString(),
      };

      // Guardar metadatos en Firestore (visible para todos los dispositivos)
      await saveDocumentoFirestore(congId, doc);

      // Guardar PDF localmente en este dispositivo para acceso instantáneo
      await dbDocumentosGuardarArchivo(id, base64Data);

      handleClose();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Error al procesar el archivo');
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setCategoriaId('');
    setVigencia('1mes');
    setFile(null);
    setError(null);
    setIsCompressing(false);
    setIsUploading(false);
    onClose();
  };

  const isBusy = isCompressing || isUploading;

  return (
    <Dialog open={open} onClose={isBusy ? undefined : handleClose}>
      <Typography variant="h6" className="h2" sx={{ mb: 2 }}>Subir documento</Typography>
      <Stack spacing={3} sx={{ minWidth: { sm: 400 } }}>
        <TextField
          label="Nombre del documento *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={isBusy}
        />

        <TextField
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={isBusy}
        />

        <Select
          label="Categoría *"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value as string)}
          disabled={isBusy}
        >
          {categorias.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
          ))}
        </Select>

        <Select
          label="Vigencia *"
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value as DocumentoVigencia)}
          disabled={isBusy}
        >
          {vigenciaOptions.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>

        <Box sx={{ border: '1px dashed var(--accent-main)', p: 2, borderRadius: 'var(--r-md)', textAlign: 'center' }}>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={isBusy}
          />
          <Button variant="tertiary" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
            Seleccionar PDF
          </Button>
          {file && (
            <Typography sx={{ mt: 1 }} className="label-small-regular">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}
        </Box>

        {error && (
          <Typography color="var(--red-main)" className="label-small-regular">{error}</Typography>
        )}

        {isBusy && (
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <CircularProgress size={24} />
            <Typography>{isCompressing ? 'Comprimiendo PDF...' : 'Subiendo documento...'}</Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="tertiary" onClick={handleClose} disabled={isBusy}>
            Cancelar
          </Button>
          <Button
            variant="main"
            onClick={handleSubir}
            disabled={isBusy || !file || !nombre || !categoriaId}
          >
            Subir documento
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
};

export default DialogSubirDocumento;
