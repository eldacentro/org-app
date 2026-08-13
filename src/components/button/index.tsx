import { Button as MUIButton, ButtonProps } from '@mui/material';
import { ButtonPropsType } from './index.types';
import { FC } from 'react';

/**
 * Component for rendering a custom button.
 * @param {ButtonPropsType} props - Props for the CustomButton component.
 * @returns {JSX.Element} CustomButton component.
 */
const Button: FC<ButtonPropsType> = (props) => {
  let className = props.className || 'button-caps';
  const disabled = props.disabled || false;
  const variant = props.variant || 'main';
  const disableAutoStretch = props.disableAutoStretch || false;
  const color = props.color;
  const ariaLabel = props.ariaLabel;

  let internalVariant: ButtonProps['variant'] = 'contained';

  if (variant === 'main' || variant === 'semi-white')
    internalVariant = 'contained';
  if (variant === 'secondary' || variant === 'small') internalVariant = 'text';
  if (variant === 'tertiary' || variant === 'group')
    internalVariant = 'outlined';

  if (variant === 'small') className = 'body-small-semibold';

  const getBackgroundColor = () => {
    let result = '';

    if (variant === 'semi-white') {
      result = 'var(--white-semi-s)';
    }

    if (variant !== 'semi-white') {
      if (internalVariant !== 'contained') {
        result = 'unset';
      }

      if (internalVariant === 'contained') {
        // `-fill` y no `-main`: el relleno de un botón tiene que llevar la
        // letra encima, así que en los temas donde el tono vivo es demasiado
        // claro para el blanco se usa uno más bajo. `-main` sigue siendo el
        // color de la marca para todo lo demás. Ver `global/index.css`.
        // El valor de reserva cubre los colores sin relleno propio.
        result = color
          ? `var(--${color}-fill, var(--${color}-main))`
          : 'var(--brand-fill)';
      }
    }

    return result;
  };

  const getColor = () => {
    let result = '';

    if (internalVariant === 'contained') {
      // La tinta que va sobre el relleno, emparejada con él. NO `--always-white`
      // a secas: el relleno cambia de tono con el tema y la tinta tiene que
      // cambiar con él. Medido, el blanco fijo fallaba en ocho de los diez
      // temas (2,29:1 el botón principal en naranja claro). Ver el bloque
      // «LA TINTA QUE VA ENCIMA DE UN RELLENO DE COLOR» en `global/index.css`.
      //
      // El segundo argumento de `var()` es el valor de reserva: un color sin
      // pareja definida (`blue`, `accent`, `grey`…) se comporta exactamente
      // como antes en vez de quedarse sin tinta.
      result = color
        ? `var(--on-${color}, var(--always-white))`
        : 'var(--on-brand)';

      // `semi-white` es la excepción: su fondo no es un relleno de color sino
      // un velo blanco translúcido sobre una imagen, así que le toca blanco
      // pase lo que pase.
      if (variant === 'semi-white') {
        result = 'var(--always-white)';
      }
    }

    if (internalVariant !== 'contained') {
      if (!color) {
        result = 'var(--accent-dark)';
      }

      if (color) {
        if (variant === 'small') {
          result = `var(--${color}-dark)`;
        }

        if (variant !== 'small') {
          result = `var(--${color}-main)`;
        }
      }
    }

    return result;
  };

  const getBackgroundColorHover = () => {
    let result = '';

    if (variant === 'semi-white') {
      result = 'var(--white-semi-l)';
    }

    if (variant !== 'semi-white') {
      if (internalVariant === 'contained') {
        // Capa de estado al 8 %, no un salto al tono oscuro de la familia.
        //
        // Antes el hover cambiaba el relleno a `--{color}-dark`, que es un
        // tono MUCHO más oscuro, y eso rompía la tinta: en verde claro la
        // tinta que se lee sobre el relleno base (oscura, 5,15:1) se queda en
        // 3,65 sobre el relleno del hover, y la que se leería sobre el hover
        // (blanca) no se lee sobre el base. Ninguna sirve para los dos, porque
        // los dos rellenos están demasiado lejos el uno del otro.
        //
        // Con una capa del 8 % del color del CONTENIDO —que es la regla de
        // §2.5 y la de Material— el hover queda cerca del relleno base, así
        // que la misma tinta vale para los dos estados. De paso, el botón deja
        // de tener su propio dialecto de «estoy encima» y usa el de la app.
        result = `color-mix(in srgb, ${getColor()} 8%, ${getBackgroundColor()})`;
      }

      if (internalVariant !== 'contained') {
        if (color) {
          result = `var(--${color}-secondary)`;
        }

        if (!color) {
          result = 'var(--accent-200)';
        }
      }
    }

    return result;
  };

  const getBackgroundColorClick = () => {
    let result = '';

    if (variant === 'semi-white') {
      result = 'var(--white-semi-m)';
    }

    if (variant !== 'semi-white') {
      if (variant === 'small') {
        if (color) {
          result = `var(--${color}-secondary)`;
        }

        if (!color) {
          result = 'var(--accent-200)';
        }
      }

      if (variant !== 'small') {
        if (internalVariant === 'contained') {
          // Lo mismo que el hover, al 14 % — los dos porcentajes son los de
          // `--state-hover` y `--state-pressed` (§2.5).
          result = `color-mix(in srgb, ${getColor()} 14%, ${getBackgroundColor()})`;
        }

        if (internalVariant !== 'contained') {
          if (color) {
            result = `var(--${color}-secondary)`;
          }

          if (!color) {
            result = 'var(--accent-150)';
          }
        }
      }
    }

    return result;
  };

  const getSvgColor = () => {
    let result = '';

    if (disabled) {
      result = 'var(--accent-350)';
    }

    if (!disabled) {
      if (internalVariant === 'contained') {
        const overrideColor =
          props.startIcon?.props?.['color'] || props.endIcon?.props?.['color'];

        result = overrideColor ?? 'var(--always-white)';
      }

      if (internalVariant !== 'contained') {
        if (color) {
          if (variant === 'small') {
            result = `var(--${color}-dark)`;
          }

          if (variant !== 'small') {
            result = `var(--${color}-main)`;
          }
        }

        if (!color) {
          result = 'var(--accent-dark)';
        }
      }
    }

    return result;
  };

  return (
    <MUIButton
      startIcon={props.startIcon}
      endIcon={props.endIcon}
      aria-label={ariaLabel}
      variant={internalVariant}
      onClick={props.onClick}
      disableRipple
      className={className}
      disabled={disabled}
      rel={props.rel}
      href={props.href}
      sx={{
        cursor: 'pointer',
        minHeight: props.minHeight ? `${props.minHeight}px` : '40px',
        fontFeatureSettings: '"cv05"',
        padding: variant === 'small' ? '4px 8px' : '8px 16px',
        backgroundColor: getBackgroundColor(),
        transition:
          'transform var(--motion-fast) var(--ease-standard), background-color var(--motion-fast) var(--ease-standard)',
        border:
          internalVariant === 'outlined'
            ? '1px solid var(--accent-dark)'
            : 'none',
        color: getColor(),
        boxShadow: 'none',
        // Todos los botones, píldora. Tenían dos radios según la variante
        // (6px los pequeños, 8px el resto) y ninguno de los dos casaba con la
        // píldora de ActionPill ni con los chips de semana, que ya eran
        // redondos: en la misma pantalla convivían tres formas para la misma
        // idea de "esto se pulsa".
        borderRadius: 'var(--shape-full)',
        // La etiqueta de un botón NUNCA se parte en dos líneas: si no cabe, lo
        // que está mal es el sitio donde se ha metido, no la etiqueta. Salía
        // partida en "Nueva visita" y en "Guardar cambios".
        whiteSpace: 'nowrap',
        // ─── El dedo acierta en 48; el dibujo sigue midiendo 40 ───────────
        // El mínimo de Material para un objetivo táctil son 48×48, y el de
        // iOS 44. Los botones de la app miden 40 —también los de un pie de
        // diálogo, que es donde se confirma algo—, y ese alto está bien: lo
        // que faltaba era el área alrededor.
        //
        // Se hace con un `::after` invisible y NO subiendo el alto: un botón
        // de 48 rompería el §6.5 (un botón no se estira al alto de un campo),
        // los pies de diálogo y las filas ya medidas al píxel. El
        // pseudoelemento no ocupa sitio en el flujo, así que no mueve nada.
        //
        // Los 4px de ancho no roban al vecino: el hueco estándar entre dos
        // botones es 8 (`gap: '8px'` del pie de diálogo y de la app entera),
        // así que las dos áreas quedan justo pegadas, sin solaparse.
        //
        // El alto NO se escribe como un `-4px` fijo: hay quien pide
        // `minHeight={32}` —«Eliminar múltiples asignaciones», por ejemplo— y
        // ahí 32 + 4 + 4 se queda en 40. Con `max(100%, 48px)` centrado, el
        // área es la del botón cuando ya pasa de 48 y exactamente 48 cuando no
        // llega, sin tener que saber de antemano cuánto mide.
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '-4px',
          right: '-4px',
          transform: 'translateY(-50%)',
          height: 'max(100%, 48px)',
        },
        '&:hover': {
          backgroundColor: getBackgroundColorHover(),
          border:
            internalVariant === 'outlined'
              ? '1px solid var(--accent-dark)'
              : 'none',
          boxShadow: 'none',
          '@media (hover: none)': {
            backgroundColor: getBackgroundColor(),
          },
        },

        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },

        '&:active': {
          backgroundColor: getBackgroundColorClick(),
          transform: 'scale(0.97)',
          border:
            internalVariant === 'outlined'
              ? '1px solid var(--accent-dark)'
              : 'none',
          boxShadow: 'none',
          opacity: variant === 'small' || color ? 0.8 : 1,
        },
        '&:disabled': {
          backgroundColor:
            internalVariant === 'contained' ? 'var(--accent-150)' : 'unset',
          color: 'var(--accent-350)',
          border:
            internalVariant === 'outlined'
              ? '1px solid var(--accent-200)'
              : 'none',
        },
        '& svg': {
          height: variant === 'small' ? '20px' : '22px',
          width: variant === 'small' ? '20px' : '22px',
        },
        '& svg, & svg g, & svg g path': {
          fill: getSvgColor(),
        },
        width: { mobile: disableAutoStretch ? 'auto' : '100%', tablet: 'auto' },
        ...props.sx,
      }}
    >
      {props.children}
    </MUIButton>
  );
};

export default Button;
