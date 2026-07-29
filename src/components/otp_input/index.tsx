import { FC } from 'react';
import { Box } from '@mui/material';
import { MuiOtpInput, MuiOtpInputProps } from 'mui-one-time-password-input';

/**
 * Function to check if the provided text is numeric.
 * @param text - The text to be checked.
 * @returns A boolean indicating whether the text is numeric.
 */
const matchIsNumeric = (text) => {
  return !isNaN(Number(text));
};

/**
 * Function to validate each character of the OTP input.
 * @param value - The value of the OTP input.
 * @returns A boolean indicating whether the character is valid.
 */
const validateChar = (value) => {
  return matchIsNumeric(value);
};

type OTPInputProps = MuiOtpInputProps & {
  hasError?: boolean;
};

/**
 * OTPInput component.
 * @param hasError - Boolean flag indicating whether there is an error in the OTP input.
 * @param props - Additional props for the OTPInput component.
 * @returns JSX element for the OTPInput component.
 */
const OTPInput: FC<OTPInputProps> = ({ hasError, ...props }) => {
  return (
    <Box sx={{ width: '100%', maxWidth: '352px' }}>
      <MuiOtpInput
        {...props}
        length={6}
        display="flex"
        gap={1}
        validateChar={validateChar}
        TextFieldsProps={(index) => ({
          autoComplete: 'off',
          inputProps: {
            className: 'h1',
          },
          // Las casillas del código: un dígito cada una, sin etiqueta. No son
          // campos de formulario al uso, así que no heredan el alto de 56 ni el
          // hueco de la etiqueta — pero SÍ el lenguaje: superficie rellena,
          // anillo al enfocar, y nada de bordes dibujados en reposo.
          sx: {
            '.MuiOutlinedInput-input': {
              color: 'var(--black)',
              width: 52,
              height: 52,
              padding: 0,
              textAlign: 'center',
            },
            '.MuiOutlinedInput-root': {
              minHeight: 'unset',
              width: 52,
              height: 52,
              // Un dígito ya escrito se marca con el tinte de "elegido", que es
              // el mismo que usan las pestañas y los chips: así se ve de un
              // golpe cuántas casillas llevas sin contar los números.
              backgroundColor: hasError
                ? 'var(--red-secondary)'
                : props.value[index]?.length > 0
                  ? 'var(--state-selected)'
                  : 'var(--accent-100)',
              '&:hover': {
                backgroundColor: hasError
                  ? 'var(--red-secondary)'
                  : 'var(--state-selected)',
              },
              '&.Mui-focused': {
                backgroundColor: 'var(--card)',
                boxShadow: `inset 0 0 0 2px var(${hasError ? '--red-main' : '--accent-main'})`,
              },
            },
          },
        })}
        sx={{}}
      />
    </Box>
  );
};

export default OTPInput;
