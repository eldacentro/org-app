import { TimeFieldProps } from './index.types';
import useTimeField from './useTimeField';
import TextField from '@components/textfield';

const TimeField = (props: TimeFieldProps) => {
  const { handleKeyDown, inputRef, handleClick, handleBlur, handleWheel } =
    useTimeField(props);

  return (
    <TextField
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      autoComplete="off"
      onBlur={handleBlur}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      label={props.label}
      placeholder="0:00"
      slotProps={{
        htmlInput: {
          maxLength: 7,
          ref: inputRef,
          className: props.className,
          inputMode: 'numeric',
          pattern: '[0-9]*',
          sx: {
            color:
              props.value.length === 0 || props.value === '0:00'
                ? 'var(--accent-350)'
                : 'var(--black)',
            '&::placeholder': { opacity: 1 },
          },
        },
      }}
      sx={{
        ...props.sx,
        // OJO: el TextField base hace `...props.sx` al FINAL de su propio sx,
        // así que estas claves REEMPLAZAN (no fusionan) las suyas.
        //
        // El alto, el radio, el relleno y el anillo de foco ya no se re-declaran
        // aquí: los pone el bloque «EL CAMPO» de `global/index.css`, que alcanza
        // también a esta familia. Antes este fichero repetía los suyos y por eso
        // el campo de hora se veía distinto a Fecha o Lugar.
        '.MuiInputBase-input': {
          textAlign: props.label ? 'left' : 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: '1 0 0',
        },
        '.MuiOutlinedInput-root': {
          paddingRight: 'unset !important',
          color: 'var(--black)',
          // Sin etiqueta esto no es un campo de formulario, es el +/- de
          // HoursEditor metido en una fila: ahí la superficie rellena sobraría
          // y se queda transparente.
          ...(props.label
            ? {}
            : {
                backgroundColor: 'transparent',
                '&:hover': { backgroundColor: 'transparent' },
                '&.Mui-focused': { backgroundColor: 'transparent' },
              }),
        },
      }}
    />
  );
};

export default TimeField;
