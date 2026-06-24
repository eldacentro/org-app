import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import Typography from '@components/typography';

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
  icon: string;
  title: string;
  subtitle?: string;
  iconBg: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      borderRadius: '16px',
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
        background: 'linear-gradient(to right, rgba(0,0,0,0.02), transparent)',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)', lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.3 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>

    {/* ── Contenido (sin padding vertical propio — lo da cada consumidor) ── */}
    <Box sx={{ px: { mobile: 2, tablet600: 2.5 } }}>{children}</Box>
  </Box>
);

/** Selector de opciones en forma de píldoras. */
export const PillGroup = ({
  value,
  onChange,
  options,
  accent = 'var(--accent-main)',
}: {
  value: string;
  onChange: (val: string) => void;
  options: PillOption[];
  accent?: string;
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <Box
          component="button"
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          sx={{
            appearance: 'none',
            border: 'none',
            background: 'none',
            font: 'inherit',
            px: '12px',
            py: '6px',
            borderRadius: '999px',
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor: active ? accent : 'var(--line)',
            backgroundColor: active ? `${accent}15` : 'transparent',
            color: active ? accent : 'var(--ink-2)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.15s ease',
            userSelect: 'none',
            '&:hover': {
              borderColor: active ? accent : 'var(--ink-3)',
              backgroundColor: active ? `${accent}22` : 'var(--bg-hover)',
            },
            '&:active': { transform: 'scale(0.96)' },
            '&:focus-visible': {
              outline: '2px solid #007AFF',
              outlineOffset: '2px',
            },
          }}
        >
          {opt.label}
        </Box>
      );
    })}
  </Box>
);

/** Fila toggle: label + descripción a la izquierda, interruptor iOS a la
 *  derecha. `divider` controla dónde va la línea separadora (cada consumidor
 *  la necesitaba en un lado distinto según si la fila va antes o después de
 *  otro contenido). */
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
    component="button"
    type="button"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    sx={{
      appearance: 'none',
      border: 'none',
      background: 'none',
      font: 'inherit',
      textAlign: 'inherit',
      width: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 2,
      py: '14px',
      cursor: 'pointer',
      borderBottom: divider === 'bottom' ? '0.5px solid var(--line)' : 'none',
      borderTop: divider === 'top' ? '0.5px solid var(--line)' : 'none',
      WebkitTapHighlightColor: 'transparent',
      '&:active': { backgroundColor: 'rgba(0,0,0,0.03)' },
      '&:focus-visible': {
        outline: '2px solid #007AFF',
        outlineOffset: '2px',
      },
      mx: -0.5,
      px: 0.5,
      borderRadius: '8px',
      transition: 'background 0.1s ease',
    }}
  >
    <Box sx={{ flex: 1 }}>
      <Typography
        sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', mt: '3px', lineHeight: 1.4 }}>
          {description}
        </Typography>
      )}
    </Box>

    {/* Interruptor iOS */}
    <Box
      sx={{
        width: 44,
        height: 26,
        borderRadius: '13px',
        backgroundColor: checked ? 'var(--green-main)' : 'var(--grey-300)',
        position: 'relative',
        flexShrink: 0,
        mt: '2px',
        transition: 'background 0.22s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: 'var(--white)',
          top: 2,
          left: checked ? 20 : 2,
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.22)',
          transition: 'left 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      />
    </Box>
  </Box>
);
