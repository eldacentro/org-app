import { styled } from '@mui/system';
import { Box, Button, Input } from '@mui/material';

// Buscar es una acción, y las acciones en esta app tienen forma de píldora.
// Además el campo redondo se distingue de un vistazo de los campos de dato
// (rectángulo de esquina suave): al entrar en una lista larga, encontrar el
// buscador deja de requerir leer.
export const StyledBox = styled(Box)({
  display: 'flex',
  width: '100%',
  height: '48px',
  alignItems: 'center',
  borderRadius: 'var(--shape-full)',
  background: 'var(--grey-100)',
  padding: '4px 8px',
  gap: '4px',
  alignSelf: 'stretch',
});

export const StyledButton = styled(Button)({
  minWidth: '0px',
  padding: '8px',
  borderRadius: 'var(--shape-full)',
  '&:hover': {
    backgroundColor: 'var(--state-hover)',
  },
  '&:active': {
    backgroundColor: 'var(--state-pressed)',
  },
});

export const StyledInput = styled(Input)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: '1 0 0',
  alignSelf: 'stretch',
  borderRadius: 'var(--radius-none)',

  '& .MuiInput-input::placeholder': {
    color: 'var(--grey-350)',
    opacity: 1,
  },

  '& input': {
    color: 'var(--black)',
  },
});
