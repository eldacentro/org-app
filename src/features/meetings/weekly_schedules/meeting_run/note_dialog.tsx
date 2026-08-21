import { useEffect, useState } from 'react';
import { Box, TextField } from '@mui/material';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';

/**
 * Apuntar algo de una parte.
 *
 * No es una nota sobre la persona: es sobre ESTA parte de ESTA semana. La misma
 * persona puede tener dos partes y no merecer el mismo comentario en las dos.
 */
const NoteDialog = ({
  open,
  label,
  person,
  value,
  onSave,
  onClose,
}: {
  open: boolean;
  label: string;
  person?: string;
  value?: string;
  onSave: (texto: string) => void;
  onClose: VoidFunction;
}) => {
  const [texto, setTexto] = useState(value ?? '');

  // Al abrirlo sobre otra parte —o sobre la misma después de guardar— tiene que
  // enseñar lo que hay apuntado ahora, no lo que se estaba escribiendo antes.
  useEffect(() => {
    if (open) setTexto(value ?? '');
  }, [open, value]);

  return (
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" sx={{ color: 'var(--ink)', mb: '4px' }}>
        {label}
      </Typography>
      <Typography
        className="body-small-regular"
        sx={{ color: 'var(--ink-2)', mb: '16px' }}
      >
        {person
          ? `${person} · solo lo ven los ancianos`
          : 'Solo lo ven los ancianos'}
      </Typography>

      <TextField
        multiline
        minRows={3}
        fullWidth
        autoComplete="off"
        placeholder="Escribe algo si quieres…"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          mt: '16px',
        }}
      >
        <Button variant="tertiary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="main" onClick={() => onSave(texto)}>
          Guardar
        </Button>
      </Box>
    </Dialog>
  );
};

export default NoteDialog;
