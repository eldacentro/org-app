import { forwardRef, Ref } from 'react';
import { PickersTextField, PickersTextFieldProps } from '@mui/x-date-pickers';

const InputTextField = forwardRef(function DatePickerInputField(
  props: PickersTextFieldProps,
  ref: Ref<HTMLDivElement>
) {
  return (
    <PickersTextField
      {...props}
      fullWidth
      className="body-regular"
      ref={ref}
      sx={{
        // El alto, el radio, el relleno, el anillo de foco y el sitio de la
        // etiqueta los pone el bloque «EL CAMPO» de `global/index.css`. Este
        // fichero repetía su propio alto de 44 y sus propios bordes, que es
        // justo por lo que el selector de hora no acababa de parecerse a los
        // demás campos.
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
