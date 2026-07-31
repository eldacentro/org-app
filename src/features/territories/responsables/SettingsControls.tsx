import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import Typography from '@components/typography';
import FilterChip from '@components/filter_chip';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * Piezas de UI compartidas entre ConfiguracionTab e ImportExportTab — antes
 * cada archivo reimplementaba su propia copia casi idéntica de estas tres
 * (mismo look & feel, pequeñas diferencias de espaciado), así que cualquier
 * cambio de estilo había que repetirlo dos veces.
 */

export type PillOption = { value: string; label: string };

/** Tarjeta de sección con cabecera (icono + título + subtítulo opcional). */
export const SectionCard = ({
  icon,
  title,
  subtitle,
  iconBg,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconBg: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      borderRadius: 'var(--shape-lg)',
      border: '1px solid var(--line)',
      backgroundColor: 'var(--card)',
      boxShadow: 'var(--small-card-shadow)',
      overflow: 'hidden',
    }}
  >
    {/* ── Cabecera ── */}
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: { mobile: 2, tablet600: 2.5 },
        py: '14px',
        borderBottom: '1px solid var(--line)',
        // Era un degradado de negro al 2% hacia transparente. En modo oscuro
        // eso es echar negro sobre una tarjeta ya oscura: no se ve nada y, si
        // se ve, ensucia. Un tinte plano del tema hace el mismo trabajo de
        // separar la cabecera del cuerpo, y funciona en los dos temas.
        backgroundColor: 'var(--accent-100)',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 'var(--shape-sm)',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          className="body-small-semibold"
          sx={{ color: 'var(--ink)', lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            className="label-small-regular"
            sx={{ color: 'var(--ink-2)', lineHeight: 1.3 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>

    {/* ── Contenido (sin padding vertical propio — lo da cada consumidor) ── */}
    <Box sx={{ px: { mobile: 2, tablet600: 2.5 } }}>{children}</Box>
  </Box>
);

/**
 * Selector de opciones en forma de píldoras.
 *
 * Es el `FilterChip` compartido, el mismo dibujo de "elegido" que las
 * pestañas, la tira de semanas y los filtros de Historial. Antes tenía el
 * suyo: borde de 1,5px, fondo hecho pegando `15` y `22` al final del color
 * (que solo funciona si el color es un HEX literal), 13px de letra y un
 * `scale(0.96)` al pulsar. Con eso, dos filtros con la misma función se
 * pintaban distinto según en qué pestaña estuvieras.
 *
 * `accent` desaparece a propósito: el color de "elegido" es UNO en toda la
 * app, no una decisión por pantalla.
 */
export const PillGroup = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: PillOption[];
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {options.map((opt) => (
      <FilterChip
        key={opt.value}
        label={opt.label}
        selected={opt.value === value}
        onClick={() => onChange(opt.value)}
      />
    ))}
  </Box>
);

/**
 * Fila de interruptor.
 *
 * Es `SwitchWithLabel`, EL MISMO componente que usa Ajustes en toda la app.
 * Aquí había uno propio, y no se parecía en dos cosas de fondo:
 *
 *  1. El interruptor estaba dibujado a mano — una caja de 44×26 con un
 *     círculo blanco de 22 deslizándose por dentro, y en verde. El único de
 *     la aplicación con esa forma y ese color.
 *  2. El interruptor iba a la DERECHA y la etiqueta a la izquierda; en
 *     Ajustes es al contrario (interruptor primero en escritorio, y solo en
 *     móvil se da la vuelta, que es lo que hace `SwitcherContainer`). Con lo
 *     cual, al pasar de Ajustes a esta pantalla, todos los interruptores
 *     saltaban de lado.
 *
 * `divider` se queda: cada consumidor necesita la línea separadora en un lado
 * distinto según si la fila va antes o después de otro contenido.
 */
export const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  divider = 'bottom',
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  divider?: 'top' | 'bottom' | 'none';
}) => (
  <Box
    sx={{
      py: '14px',
      borderBottom: divider === 'bottom' ? '0.5px solid var(--line)' : 'none',
      borderTop: divider === 'top' ? '0.5px solid var(--line)' : 'none',
    }}
  >
    <SwitchWithLabel
      label={label}
      helper={description}
      checked={checked}
      onChange={onChange}
    />
  </Box>
);
