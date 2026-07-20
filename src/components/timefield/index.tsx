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
        // así que estas claves REEMPLAZAN (no fusionan) las suyas. Hay que
        // re-declarar aquí el radio, el borde y el padding del input — sin
        // ellos, el campo de hora salía con el radio y el color de borde por
        // defecto de MUI, distinto a Fecha/Lugar (bug visual real).
        '.MuiInputBase-input': {
          textAlign: props.label ? 'left' : 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingTop: 'calc(14.5px - 6px)',
          paddingBottom: 'calc(14.5px - 6px)',
          flex: '1 0 0',
        },
        '.MuiOutlinedInput-root': {
          paddingRight: 'unset !important',
          borderRadius: 'var(--radius-l)',
          color: 'var(--black)',
          '& fieldset': {
            border: '1px solid var(--accent-350)',
          },
          '&:hover fieldset': {
            border: '1px solid var(--accent-main)',
          },
          '&.Mui-focused fieldset': {
            border: '1px solid var(--accent-main)',
          },
        },
        ...(props.label ? {} : { '& fieldset': { border: 'none' } }),
      }}
    />
  );
};

export default TimeField;
