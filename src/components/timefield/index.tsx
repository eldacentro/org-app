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
          // Con label (Fecha/Lugar de Reuniones especiales, pastoreo): caja
          // con borde. Sin label (uso inline +/- de HoursEditor): SIN borde,
          // igual que StandardEditor — `!important` porque, sin él, esta
          // regla pierde por especificidad contra la de arriba y el borde
          // queda siempre puesto (bug visual real, 2026-07-24).
          '& fieldset': {
            border: props.label
              ? '1px solid var(--accent-350)'
              : 'none !important',
          },
          '&:hover fieldset': {
            border: props.label
              ? '1px solid var(--accent-main)'
              : 'none !important',
          },
          '&.Mui-focused fieldset': {
            border: props.label
              ? '1px solid var(--accent-main)'
              : 'none !important',
          },
        },
      }}
    />
  );
};

export default TimeField;
