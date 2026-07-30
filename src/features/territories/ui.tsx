import { Box, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';
import Typography from '@components/typography';
import Badge from '@components/badge';
import accentSurface from '@components/accent_surface';

/**
 * Vocabulario visual compartido de Territorios.
 *
 * El módulo se escribió pantalla a pantalla y cada una se inventó sus propias
 * piezas: había once tarjetas distintas (cuatro grosores de "uñita", radios de
 * 10, 12, 14, 20, 24 y 28px) y ocho maneras de pintar una etiqueta de estado,
 * cada una con su `fontSize` y su `fontWeight` a pelo. Aquí viven las dos
 * únicas versiones buenas; todo lo demás las usa.
 *
 * Las etiquetas de SIGNIFICADO FIJO (Atrasado, Campaña, No visitar…) no están
 * aquí a propósito: esas son el componente `Badge` compartido de la app, el
 * mismo que usan Personas o Informes. Aquí solo está lo que Territorios sí
 * tiene de propio — el color que elige un responsable para una zona o una
 * etiqueta, que no puede salir de la paleta de tokens porque es un dato.
 */

// ─── La tarjeta ───────────────────────────────────────────────────────────

type TerritoryCardProps = {
  children: ReactNode;
  /**
   * Color de la zona (o de lo que categorice la fila). Pinta la cápsula
   * lateral y el lavado de fondo. Sin él, la tarjeta es lisa.
   */
  accent?: string;
  /** Atenúa la tarjeta (p. ej. territorios de otro publicador). */
  muted?: boolean;
  sx?: SxProps<Theme>;
};

/**
 * LA tarjeta de una fila de territorio. Un solo radio (`--shape-lg`, el de
 * cualquier tarjeta de página en el resto de la app — las de aquí estaban a
 * 16px y cantaban), un solo hueco interior, y NADA de hover: estas tarjetas
 * no se pulsan, se pulsan los botones de dentro. Antes se levantaban 2px y
 * cambiaban de sombra al pasar el ratón, prometiendo un clic que no existía.
 */
export const TerritoryCard = ({
  children,
  accent,
  muted,
  sx,
}: TerritoryCardProps) => {
  const style = {
    padding: '16px',
    borderRadius: 'var(--shape-lg)',
    border: '1px solid var(--line)',
    backgroundColor: 'var(--card)',
    boxShadow: 'var(--small-card-shadow)',
    ...(accent ? (accentSurface(accent) as object) : {}),
    ...(muted && { borderStyle: 'dashed' }),
    ...(sx as object),
  } as SxProps<Theme>;

  return <Box sx={style}>{children}</Box>;
};

// ─── La etiqueta de color libre ───────────────────────────────────────────

type TagChipProps = {
  label: string;
  /** HEX elegido por un responsable — por eso no puede ser un token. */
  color: string;
  /** Marcada: se rellena del color en vez de solo teñirse. */
  selected?: boolean;
  onClick?: () => void;
  title?: string;
};

/**
 * Etiqueta con color de dato (etiquetas de territorio, nombres de zona).
 *
 * Misma geometría que el `Badge` compartido —píldora, `body-small-semibold`—
 * para que puestas una al lado de otra se lean como de la misma familia. Lo
 * único que cambia es de dónde sale el color.
 */
export const TagChip = ({
  label,
  color,
  selected,
  onClick,
  title,
}: TagChipProps) => (
  <Box
    component={onClick ? 'button' : 'div'}
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    aria-pressed={onClick ? Boolean(selected) : undefined}
    title={title}
    sx={{
      // Reset de <button>: sin esto hereda el tipo del navegador.
      appearance: 'none',
      font: 'inherit',
      margin: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 10px',
      minHeight: '22px',
      borderRadius: 'var(--shape-full)',
      flexShrink: 0,
      backgroundColor: selected
        ? color
        : `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} ${selected ? '100%' : '30%'}, transparent)`,
      color: selected ? 'var(--always-white)' : color,
      cursor: onClick ? 'pointer' : 'default',
      transition: onClick
        ? 'background-color var(--motion-fast) var(--ease-standard)'
        : 'none',
      ...(onClick && {
        '&:hover': {
          backgroundColor: selected
            ? color
            : `color-mix(in srgb, ${color} 22%, transparent)`,
        },
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '2px',
        },
      }),
    }}
  >
    <Typography
      component="span"
      className="body-small-semibold"
      color="inherit"
      sx={{ lineHeight: '18px' }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── El estado de un territorio ───────────────────────────────────────────

export type EstadoTerritorio = 'asignado' | 'descanso' | 'libre';

const ESTADO_TEXTO: Record<EstadoTerritorio, string> = {
  asignado: 'Asignado',
  descanso: 'En descanso',
  libre: 'Libre',
};

const ESTADO_COLOR: Record<EstadoTerritorio, 'orange' | 'grey' | 'green'> = {
  asignado: 'orange',
  descanso: 'grey',
  libre: 'green',
};

/**
 * "Asignado" / "Libre" / "En descanso". Estaba escrito cuatro veces, cada una
 * con su `fontSize: 0.75rem` y su borde a base de `rgba(...)`, y en dos de
 * ellas los colores no coincidían entre sí.
 */
export const EstadoBadge = ({ estado }: { estado: EstadoTerritorio }) => (
  <Badge size="small" color={ESTADO_COLOR[estado]} text={ESTADO_TEXTO[estado]} />
);

/** El estado de un territorio a partir de los dos datos que lo deciden. */
export const estadoDeTerritorio = (
  asignado: boolean,
  enDescanso: boolean
): EstadoTerritorio => (asignado ? 'asignado' : enDescanso ? 'descanso' : 'libre');

// ─── El par etiqueta / valor ──────────────────────────────────────────────

/**
 * Un dato con su rótulo. Las fechas ("Asignado", "Vence") iban sueltas como
 * `Asignado: 10-07-2026` en una línea de texto corrido: el rótulo pesaba lo
 * mismo que el dato y no se podía barrer la lista con la vista. Es el mismo
 * par que ya se usa en Responsabilidades.
 */
export const MetaItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger';
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
    <Typography className="label-small-semibold" color="var(--ink-3)">
      {label}
    </Typography>
    <Typography
      className="body-small-regular"
      color={tone === 'danger' ? 'var(--red-main)' : 'var(--ink)'}
    >
      {value}
    </Typography>
  </Box>
);
