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
  onDelete,
  onClose,
}: {
  open: boolean;
  label: string;
  person?: string;
  value?: string;
  onSave: (texto: string) => void;
  /** Solo cuando ya hay algo escrito: borrar lo que no existe no es una acción. */
  onDelete?: VoidFunction;
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          mt: '16px',
        }}
      >
        {/* Borrar va al otro lado, separada de guardar: es lo que manda el
            sistema de diseño para una acción destructiva que convive con el
            pie normal, y aquí además evita darle sin querer. */}
        {onDelete ? (
          <Button variant="secondary" color="red" onClick={onDelete}>
            Borrar
          </Button>
        ) : (
          <Box />
        )}

        <Box sx={{ display: 'flex', gap: '8px' }}>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="main" onClick={() => onSave(texto)}>
            Guardar
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default NoteDialog;
