import { styled } from '@mui/system';
import { Box, Button, Input } from '@mui/material';

// Buscar es una acción, y las acciones en esta app tienen forma de píldora.
// Además el campo redondo se distingue de un vistazo de los campos de dato
// (rectángulo de esquina suave): al entrar en una lista larga, encontrar el
// buscador deja de requerir leer.
//
// EL ALTO ES 56, el mismo que un campo. Estuvo en 48, y se notaba justo donde
// más: en las barras de filtrar, con un «Ordenar por» al lado, uno era ocho
// píxeles más bajo que el otro y la pareja se leía como un descuido en vez de
// como una decisión. Material 3 pone la barra de búsqueda y los campos de
// texto a la misma altura (56) precisamente para que puedan ir juntos, y les
// deja formas DISTINTAS —una redonda del todo, el otro no— para que se
// distingan por la silueta y no por el tamaño. Igualar el alto es lo que hace
// que la diferencia de forma se lea como intención.
export const StyledBox = styled(Box)({
  display: 'flex',
  width: '100%',
  height: '56px',
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
  // El área del dedo, solo a lo alto: la lupa y la equis de borrar se dibujan
  // a 40×40 y Material pide 48 de objetivo. A lo ancho no, que van dentro de
  // la caja de búsqueda pegadas al campo de texto.
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: 'translateY(-50%)',
    height: 'max(100%, 48px)',
  },
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
