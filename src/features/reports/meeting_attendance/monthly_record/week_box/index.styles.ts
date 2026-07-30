import { SxProps, Theme } from '@mui/material';

export const TextFieldStyles: SxProps<Theme> = {
  '.MuiInputBase-root': {
    padding: '0! important',
  },
  // El número va a la izquierda, alineado con su etiqueta ("Jul 2"). Centrado
  // tenía sentido cuando la etiqueta iba fuera del campo; ahora que las dos
  // cosas comparten caja, una a cada lado se lee torcida.
  '.MuiInputBase-input': {
    textAlign: 'left',
  },
  '& input': {
    padding: '10.5px 2px',
  },
  '& input::-webkit-outer-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '& input::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '.MuiInputAdornment-root': {
    marginLeft: '0px !important',
  },
};
