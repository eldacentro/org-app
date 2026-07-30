import { ReactElement, ReactNode } from 'react';
import { Box, SxProps } from '@mui/material';
import Typography from '@components/typography';

/**
 * La píldora de acción: "JW Library", "Consejos", "Documentos", "Ver reunión
 * completa"…
 *
 * Estaba escrita TRES veces —el enlace de JW Library, la acción de la cabecera
 * de las pestañas y el botón de la pestaña de la visita— con tres aspectos
 * distintos y tres juegos de medidas. Eran el mismo gesto: "esto te lleva a
 * otro sitio".
 *
 * Las tres variantes se conservan porque cada una dice algo distinto, y la
 * regla es POR JERARQUÍA, no por pantalla:
 *
 * - `solid`   — la acción de la pantalla. Hay UNA. Es lo único con color
 *               pleno, y por eso nada más debe llevarlo (ni una pestaña
 *               elegida, ni una etiqueta).
 * - `tinted`  — una acción DENTRO de una tarjeta. No compite con la tarjeta
 *               que la contiene ni con la acción principal de la pantalla.
 * - `outline` — una acción que se repite en una lista. En "Mis asignaciones"
 *               hay una por fila: rellenas serían un muro de color.
 */
const ActionPill = ({
  label,
  variant = 'solid',
  icon,
  trailing,
  href,
  onClick,
  sx,
}: {
  label: string;
  variant?: 'solid' | 'tinted' | 'outline';
  icon?: ReactElement;
  /** Se añade al final del texto: la flecha de "sale fuera" o de "te lleva". */
  trailing?: ReactNode;
  /** Con `href` se dibuja como enlace; sin él, como botón. */
  href?: string;
  onClick?: () => void;
  sx?: SxProps;
}) => {
  const porVariante = {
    solid: {
      border: 'none',
      backgroundColor: 'var(--accent-main)',
      '&:hover': { backgroundColor: 'var(--accent-dark)' },
      '&:active': { backgroundColor: 'var(--accent-dark)' },
    },
    tinted: {
      border: '1px solid var(--accent-200)',
      backgroundColor: 'var(--accent-100)',
      '&:hover': { backgroundColor: 'var(--accent-200)' },
      '&:active': { backgroundColor: 'var(--accent-200)' },
    },
    outline: {
      border: '1px solid var(--accent-200)',
      backgroundColor: 'transparent',
      '&:hover': { backgroundColor: 'var(--accent-100)' },
      '&:active': { backgroundColor: 'var(--accent-200)' },
    },
  }[variant];

  const color =
    variant === 'solid' ? 'var(--always-white)' : 'var(--accent-main)';

  return (
    <Box
      component={href ? 'a' : 'button'}
      type={href ? undefined : 'button'}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      sx={{
        appearance: 'none',
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        // Un solo tamaño para las tres: antes cada copia tenía el suyo
        // (9/3, 12/6 y 14/7) y se notaba al verlas en la misma pantalla.
        padding: '6px 12px',
        borderRadius: 'var(--shape-full)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        ...porVariante,
        ...sx,
      }}
    >
      {icon}

      {/* La clase manda sobre el `sx`: las tipográficas globales tienen más
          especificidad, así que poner aquí `fontSize` no haría nada. */}
      <Typography
        component="span"
        className="label-small-semibold"
        color={color}
      >
        {label}
        {trailing}
      </Typography>
    </Box>
  );
};

export default ActionPill;
