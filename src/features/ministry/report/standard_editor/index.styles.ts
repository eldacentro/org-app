import { styled } from '@mui/system';
import TextField from '@components/textfield';

export const TextFieldStandard = styled(TextField)({
  '.MuiInputBase-input': {
    textAlign: 'center',
  },
  '.MuiOutlinedInput-root': {
    paddingRight: 'unset !important',
  },
  // El `& fieldset { border: none }` que había aquí ya no hace falta: los
  // campos no llevan contorno dibujado. Este editor pedía "sin borde" y ahora
  // lo es por defecto.
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
}) as unknown as typeof TextField;
