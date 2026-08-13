import { ReactNode } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * La fila de una SEMANA dentro de un selector: se pulsa y se elige esa semana.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Igual que `MonthRow`: los tres selectores de semana de la app la pintaban
 * cada uno a su manera, y encima con la fecha escrita de tres formas
 * distintas — "julio 2" (con el orden de las palabras del inglés), "5 Ene - 11
 * Ene" y "2 Jul".
 *
 * Se queda el dibujo de Oradores salientes: la fecha corta a la izquierda, lo
 * que haya que contar a la derecha, y lo elegido marcado con una superficie
 * suave y un borde — no con un relleno fuerte, que en una lista de cincuenta
 * semanas cansa.
 *
 * Y es un BOTÓN. Era un `Box` con `onClick` en los tres sitios: elegir semana
 * es LA acción de este panel y solo se podía con el ratón. No lo cazó ningún
 * barrido de teclado porque estas filas viven dentro de un `Collapse` — solo
 * existen con el mes desplegado, y lo que no está pintado no se puede medir.
 */
const WeekRow = ({
  label,
  selected,
  onSelect,
  trailing,
}: {
  /** La fecha, corta: "2 jul.". */
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Lo que va a la derecha: el contador de asignaciones, un aviso… */
  trailing?: ReactNode;
}) => (
  <Box
    component="button"
    type="button"
    aria-current={selected ? 'true' : undefined}
    onClick={onSelect}
    sx={{
      width: '100%',
      appearance: 'none',
      font: 'inherit',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '8px 12px',
      // Mismo motivo que en `MonthRow`: es una fila que se pulsa para elegir
      // la semana, así que le toca el mínimo de 48. Con `minHeight` y no con
      // un área que se derrame, porque van pegadas en una lista.
      minHeight: '48px',
      boxSizing: 'border-box',
      cursor: 'pointer',
      borderRadius: 'var(--shape-sm)',
      backgroundColor: selected ? 'var(--accent-100)' : 'transparent',
      // El borde existe siempre, transparente cuando no está elegida: si
      // apareciera solo al elegirla, la fila crecería 2px y la lista daría un
      // salto bajo el dedo.
      border: selected ? '1px solid var(--line)' : '1px solid transparent',
      transition:
        'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
      '&:hover': {
        backgroundColor: selected ? 'var(--accent-150)' : 'var(--state-hover)',
      },
      '&:focus-visible': {
        outline: '2px solid var(--accent-main)',
        outlineOffset: '-2px',
      },
    }}
  >
    <Typography
      className={selected ? 'body-small-semibold' : 'body-small-regular'}
      color={selected ? 'var(--accent-main)' : 'var(--black)'}
    >
      {label}
    </Typography>

    {trailing && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {trailing}
      </Box>
    )}
  </Box>
);

export default WeekRow;
