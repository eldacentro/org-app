import { useEffect, useState } from 'react';
import { Box, TextField } from '@mui/material';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';

/**
 * Los atajos.
 *
 * De pie en la plataforma no se escribe. Estas cuatro son las cosas que un
 * presidente apunta de verdad de una parte; para lo demás está el campo de
 * texto, que sigue estando.
 */
const ATAJOS = ['Se pasó de tiempo', 'Muy bien', 'Volumen', 'Lectura'];

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

  const añadirAtajo = (atajo: string) => {
    setTexto((previo) => {
      const base = previo.trim();

      if (base.length === 0) return atajo;
      if (base.includes(atajo)) return base;

      return `${base}. ${atajo}`;
    });
  };

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

      <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', mb: '12px' }}>
        {ATAJOS.map((atajo) => (
          <Box
            key={atajo}
            component="button"
            type="button"
            onClick={() => añadirAtajo(atajo)}
            sx={{
              appearance: 'none',
              font: 'inherit',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 'var(--shape-full)',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--card)',
              '&:hover': { backgroundColor: 'var(--accent-100)' },
            }}
          >
            <Typography className="label-small-medium" color="var(--ink-2)">
              {atajo}
            </Typography>
          </Box>
        ))}
      </Box>

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
