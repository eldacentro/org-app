import { forwardRef, Ref } from 'react';
import { PickersTextField, PickersTextFieldProps } from '@mui/x-date-pickers';

const InputTextField = forwardRef(function DatePickerInputField(
  props: PickersTextFieldProps,
  ref: Ref<HTMLDivElement>
) {
  return (
    <PickersTextField
      {...props}
      ref={ref}
      fullWidth
      sx={{
        // La geometría y los estados del campo —alto, radio, relleno, anillo de
        // foco, sitio de la etiqueta— los pone el bloque «EL CAMPO» de
        // `global/index.css`, que también alcanza a esta familia (el
        // DatePicker trae sus propias clases, `MuiPickersOutlinedInput`).
        // Antes este fichero repetía a mano su propio alto de 44 y sus propios
        // bordes, y por eso el calendario nunca acababa de parecerse al resto.
        '.MuiPickersInputBase-root': {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
        '.MuiPickersInputBase-input': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: '1 0 0',
          color:
            props.value || props.inputProps['value']
              ? 'var(--black)'
              : 'var(--accent-400)',
          cursor: props.disabled && 'not-allowed',
        },
        '& .MuiSvgIcon-root': {
          fill: 'var(--accent-350)',
          '& g, & g path': {
            fill: 'var(--accent-350) !important',
          },
        },

        '& > .MuiAutocomplete-popupIndicator': {
          '& svg, & svg g, & svg g path': { fill: 'var(--black)' },
        },
      }}
    />
  );
});

export default InputTextField;
