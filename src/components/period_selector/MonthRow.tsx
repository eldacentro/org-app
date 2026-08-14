import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { IconExpand } from '@components/icons';
import Typography from '@components/typography';

/**
 * La fila de un MES dentro de un selector de semanas: se pulsa y despliega sus
 * semanas.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Había TRES selectores de semana en la app —Reunión de entre semana y de fin
 * de semana, Departamentos, y Oradores salientes— y los tres pintaban esta
 * fila a su manera: uno con la clase `h4` y el año pegado ("Enero 2026"), otro
 * con `h4` y sin año ("Enero"), y el tercero en versalitas y sin año. Tres
 * copias del mismo dibujo es exactamente la razón por la que se separaban.
 *
 * El dibujo que se queda es el de Oradores salientes, que era el más contenido:
 * el mes en versalitas pequeñas —es un SEPARADOR de la lista, no un título— y
 * el chevrón a la derecha.
 *
 * **Sin el año**: el año ya lo dice la pestaña que hay justo encima, y
 * repetirlo en cada una de las doce filas es ruido.
 */
const MonthRow = ({
  label,
  expanded,
  onToggle,
  trailing,
}: {
  /** El nombre del mes, sin año. Se pinta en versalitas. */
  label: string;
  expanded: boolean;
  onToggle: () => void;
  /** Algo a la derecha, antes del chevrón (la marca de "mes completo"). */
  trailing?: ReactNode;
}) => (
  <Box
    component="button"
    type="button"
    aria-expanded={expanded}
    onClick={onToggle}
    sx={{
      width: '100%',
      appearance: 'none',
      background: 'none',
      border: 'none',
      font: 'inherit',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      cursor: 'pointer',
      py: 1,
      px: 1,
      // Es una fila que se pulsa para desplegar el mes: le toca el mínimo de
      // 48 de Material. Se dibujaba a 34.
      //
      // Con `minHeight` y no con un `::after` invisible porque estas filas van
      // pegadas unas a otras en una lista: un área que se derrame hacia fuera
      // le quitaría el borde a la fila de al lado.
      minHeight: '48px',
      boxSizing: 'border-box',
      borderRadius: 'var(--shape-sm)',
      '&:hover': { backgroundColor: 'var(--accent-100)' },
      '&:focus-visible': {
        outline: '2px solid var(--accent-main)',
        outlineOffset: '-2px',
      },
    }}
  >
    <Typography
      className="label-small-semibold"
      sx={{
        color: 'var(--grey-600)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </Typography>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {trailing}
      <IconExpand
        color="var(--ink-2)"
        width={18}
        height={18}
        sx={{
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform var(--motion-medium) var(--ease-spring)',
        }}
      />
    </Box>
  </Box>
);

export default MonthRow;
