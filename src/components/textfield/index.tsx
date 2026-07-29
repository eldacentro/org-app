import { HTMLInputTypeAttribute, useState } from 'react';
import {
  IconButton,
  InputAdornment,
  TextField as MUITextField,
} from '@mui/material';
import { IconVisibility, IconVisibilityOff } from '@components/icons';
import { TextFieldTypeProps } from './index.types';

/**
 * A custom text field component.
 *
 * @param {TextFieldTypeProps} props - The props for the CustomTextField component.
 * @returns {JSX.Element} - JSX.Element
 */
const TextField = (props: TextFieldTypeProps) => {
  const {
    height,
    startIcon,
    endIcon,
    styleIcon,
    slotProps,
    resetHelperPadding,
    success,
    type = 'text',
    ...defaultProps
  } = props;

  const [showAccessCode, setShowAccessCode] = useState(false);
  const [inputType, setInputType] = useState<HTMLInputTypeAttribute>(type);

  const heightLocal = height || 44;
  const endIconLocal =
    type === 'password' ? (
      showAccessCode ? (
        <IconVisibilityOff />
      ) : (
        <IconVisibility />
      )
    ) : (
      endIcon
    );
  const styleIconLocal = styleIcon ?? true;

  const isMultiLine = props.multiline || props.rows;

  // Cuánto hay que subir la etiqueta del campo VACÍO para que quede centrada.
  //
  // MUI la coloca con un desplazamiento fijo (`translate(14px, 16px)`) pensado
  // para su caja de 56px de alto. Las nuestras son más bajas, así que sin esta
  // corrección la etiqueta se va hacia abajo.
  //
  // Con `multiline` la caja no lleva `height` —crece con el texto— pero sí un
  // `minHeight` de 48, que es exactamente lo que mide cuando está vacía; y
  // vacía es el único momento en que esta regla aplica, porque en cuanto hay
  // texto la etiqueta se encoge y se va al borde.
  const altoDeReferencia = isMultiLine ? 48 : heightLocal;
  const varHeight = (56 - altoDeReferencia) / 2;

  const handleToggleAccessCode = () => {
    setShowAccessCode((prev) => {
      if (!prev) setInputType('text');
      if (prev) setInputType(type);

      return !prev;
    });
  };

  return (
    <MUITextField
      {...defaultProps}
      type={inputType}
      fullWidth
      sx={{
        '.MuiInputBase-root': {
          height: isMultiLine ? 'auto' : `${heightLocal}px`,
          paddingTop: isMultiLine ? '12px' : 'auto',
          paddingBottom: isMultiLine ? '12px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
        '.MuiInputBase-input': {
          overflow: isMultiLine ? 'unset' : 'hidden',
          textOverflow: isMultiLine ? 'unset' : 'ellipsis',
          paddingTop: isMultiLine ? 'unset' : `calc(14.5px - ${varHeight}px)`,
          paddingBottom: isMultiLine
            ? 'unset'
            : `calc(14.5px - ${varHeight}px)`,
          flex: '1 0 0',
          color:
            props.value || props.inputProps?.value
              ? 'var(--black)'
              : 'var(--accent-400)',
          cursor: props.disabled && 'not-allowed',
        },
        '.MuiInput-root:before': {
          borderBottom: '1px solid var(--accent-300) !important',
        },
        '.MuiInput-root:after': {
          borderBottom: '1px solid var(--accent-main)',
        },
        '.MuiInput-root:hover:before': {
          borderBottom: '1px solid var(--accent-main)',
          outline: 0,
        },
        '.MuiOutlinedInput-root': {
          borderRadius: 'var(--shape-sm)',
          color: 'var(--black)',
          '& svg': {
            boxSizing: 'content-box',
          },
          '& fieldset': {
            border: success
              ? '1px solid var(--green-main)'
              : '1px solid var(--accent-350)',
          },
          '&:hover fieldset': {
            border: success
              ? '1px solid var(--green-main)'
              : '1px solid var(--accent-main)',
          },
          '&.Mui-focused fieldset': {
            border: success
              ? '1px solid var(--green-main)'
              : '1px solid var(--accent-main)',
          },
          '&.Mui-error': {
            '&:hover fieldset': {
              border: '1px solid var(--red-main)',
            },
            '&.Mui-focused fieldset': {
              border: '1px solid var(--red-main)',
            },
          },

          '&.Mui-disabled fieldset': {
            border: '1px solid var(--accent-200)',
          },
        },
        '.MuiInputLabel-root': {
          color: !props.disabled
            ? success
              ? 'var(--green-main)'
              : 'var(--accent-350)'
            : 'var(--accent-200)',
          '&.Mui-focused': {
            color: success ? 'var(--green-main)' : 'var(--accent-350)',
          },
          '&.Mui-error': {
            color: 'var(--red-main)',
          },
        },

        '& .MuiSvgIcon-root': {
          color: 'var(--accent-350)',
        },

        // La etiqueta del campo vacío, centrada. Ver `varHeight` arriba.
        '.MuiFormLabel-root[data-shrink=false]': {
          top: `-${varHeight}px`,
        },
        '& > .MuiAutocomplete-popupIndicator': {
          '& svg, & svg g, & svg g path': { fill: 'var(--black)' },
        },

        '& .MuiInputAdornment-positionStart .MuiSvgIcon-root': {
          color: startIcon?.props['color'] ?? 'var(--black)',
        },

        '& .MuiAutocomplete-endAdornment .MuiSvgIcon-root': {
          color: !props.disabled ? 'var(--black)' : 'var(--accent-200)',
          '& g path': {
            fill: 'var(--black)',
          },
        },
        ...props.sx,
      }}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          className: props.className,
          startAdornment: startIcon ? (
            <InputAdornment
              position="start"
              sx={{
                height: 0,
                maxHeight: 0,
                marginRight: 0,
              }}
            >
              {startIcon}
            </InputAdornment>
          ) : slotProps?.input ? (
            slotProps?.input['startAdornment']
          ) : null,
          endAdornment: endIconLocal ? (
            <InputAdornment
              position="end"
              sx={{
                height: 0,
                maxHeight: 0,
                marginRight: 0,
                '& svg, & svg g, & svg g path': styleIconLocal
                  ? {
                      fill: endIconLocal.props.color ?? 'var(--accent-350)',
                    }
                  : {},
              }}
            >
              {props.type !== 'password' && endIconLocal}
              {props.type === 'password' && (
                <IconButton
                  onClick={handleToggleAccessCode}
                  sx={{ margin: 0, padding: 0 }}
                >
                  {endIconLocal}
                </IconButton>
              )}
            </InputAdornment>
          ) : slotProps?.input ? (
            slotProps?.input['endAdornment']
          ) : null,
        },
        formHelperText: {
          component: 'div',
          style: {
            margin: 0,
            padding: resetHelperPadding ? 0 : '4px 16px 0px 16px',
            color: success
              ? 'var(--green-main)'
              : props.error
                ? 'var(--red-main)'
                : 'inherit',
          },
        },
      }}
    />
  );
};

export default TextField;
