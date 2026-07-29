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
        // La geometría del campo —alto, radio, relleno, hueco para la etiqueta
        // de dentro— la gobierna el bloque «EL CAMPO» de `global/index.css`,
        // que es el único sitio donde está escrita para las cuatro familias de
        // campo de la app. Aquí solo queda lo propio de este componente:
        // iconos, colores del texto y adornos.
        '.MuiInputBase-root': {
          display: 'flex',
          alignItems: isMultiLine ? 'flex-start' : 'center',
          gap: '8px',
          ...(height && { minHeight: `${height}px` }),
        },
        '.MuiInputBase-input': {
          overflow: isMultiLine ? 'unset' : 'hidden',
          textOverflow: isMultiLine ? 'unset' : 'ellipsis',
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
          color: 'var(--black)',
          '& svg': {
            boxSizing: 'content-box',
          },
          // El contorno dibujado ya no existe: el campo es una superficie
          // rellena y solo se le pinta un anillo al enfocarlo. Eso vive en el
          // bloque «EL CAMPO» de `global/index.css`.
          //
          // Lo único que este componente sigue decidiendo por su cuenta es el
          // estado "correcto" (p. ej. un código de acceso ya validado), que no
          // tiene clase propia en MUI: mismo anillo que el foco, en verde, y
          // permanente, porque es un resultado y no un estado pasajero.
          ...(success && { boxShadow: 'inset 0 0 0 2px var(--green-main)' }),
        },
        '.MuiInputLabel-root': {
          ...(success && {
            color: 'var(--green-main)',
            '&.Mui-focused': { color: 'var(--green-main)' },
          }),
        },

        '& .MuiSvgIcon-root': {
          color: 'var(--accent-350)',
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
