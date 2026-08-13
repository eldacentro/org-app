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
      // `--brand-fill`, el tono de marca que puede llevar letra encima. Ver
      // `global/index.css`.
      backgroundColor: 'var(--brand-fill)',
      '&:hover': {
        backgroundColor:
          'color-mix(in srgb, var(--on-brand) 8%, var(--brand-fill))',
      },
      '&:active': {
        backgroundColor:
          'color-mix(in srgb, var(--on-brand) 14%, var(--brand-fill))',
      },
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

  // `solid` lleva relleno de marca, así que su tinta es la emparejada con él,
  // no un blanco fijo (ver `global/index.css`). Las otras dos van sobre fondo
  // claro y usan la marca como TEXTO, y para eso vale `--accent-dark`, no
  // `--accent-main`: el acento a secas está pensado para rellenar, y como
  // letra se queda corto —2,31:1 en naranja claro—.
  const color = variant === 'solid' ? 'var(--on-brand)' : 'var(--accent-dark)';

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
        // El área del dedo. La píldora se dibuja en ~29px de alto —6 de
        // relleno arriba y abajo sobre una línea de 12— y eso es la mitad de
        // los 48 que pide Material. El dibujo no se toca: son las tres
        // variantes las que comparten tamaño a propósito, y subirlo las
        // convertiría en botones.
        //
        // Solo a lo alto, y con un pseudoelemento en vez de `min-height` para
        // no mover nada: en «Mis asignaciones» hay una por fila y en una
        // tarjeta hay una junto al texto. `alignSelf: flex-start` las deja
        // sueltas, así que crecer a lo alto no pisa a ningún otro objetivo.
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          height: 'max(100%, 48px)',
        },
        transition: 'background-color var(--motion-fast) var(--ease-standard)',
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
