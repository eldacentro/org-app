import { SxProps, Theme } from '@mui/material';

export const TextFieldStyles: SxProps<Theme> = {
  // El número va a la izquierda, alineado con su etiqueta ("Jul 2"). Centrado
  // tenía sentido cuando la etiqueta iba fuera del campo; ahora que las dos
  // cosas comparten caja, una a cada lado se lee torcida.
  //
  // Y sin padding propio: aquí había un `10.5px 2px` que dejaba el número
  // pegado al canto izquierdo mientras su etiqueta seguía a 14. Lo pone el
  // bloque «EL CAMPO».
  '.MuiInputBase-input': {
    textAlign: 'left',
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
