import { useMemo } from 'react';
import { Box } from '@mui/material';
import { IconNavigateLeft, IconNavigateRight } from '@components/icons';
import Typography from '@components/typography';

/**
 * "‹ Miércoles 6 de agosto ›" — la cabecera de la semana abierta.
 *
 * Estaba escrito suelto dentro del editor de entre semana y en ningún sitio
 * más, así que en el de fin de semana y en Departamentos había que volver a la
 * lista para pasar a la semana siguiente. Ahora lo comparten los tres.
 *
 * No lee ningún átomo: recibe la lista y el valor. Cada pantalla guarda la
 * semana elegida en un sitio distinto (`selectedWeekState` en reuniones,
 * `selectedDeptWeekState` en Departamentos), y atarlo a uno lo habría dejado
 * inservible para el otro — que es justo cómo se llega a tener tres versiones
 * de lo mismo.
 *
 * Las flechas se apagan, no se ocultan: si desaparecieran, el título saltaría
 * de sitio al llegar a la primera o a la última semana.
 */
const WeekNavigator = ({
  label,
  weeks,
  value,
  onChange,
}: {
  /** La semana abierta, ya escrita para leer. */
  label: string;
  /** Semanas por las que se puede navegar ('YYYY/MM/DD'). */
  weeks: string[];
  /** La semana abierta. */
  value: string;
  onChange: (week: string) => void;
}) => {
  // `weekOf` es 'YYYY/MM/DD', así que ordena bien como texto.
  const ordenadas = useMemo(() => [...weeks].sort(), [weeks]);

  const index = ordenadas.indexOf(value);

  // Si la semana abierta no está en la lista (pasa al borrar el programa con
  // ella abierta) no se enseña ninguna flecha, en vez de mandar a la primera o
  // a la última sin avisar.
  const canBack = index > 0;
  const canNext = index !== -1 && index < ordenadas.length - 1;

  const flecha = (activa: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    flexShrink: 0,
    borderRadius: 'var(--shape-full)',
    cursor: activa ? 'pointer' : 'default',
    transition: 'background-color var(--motion-fast) var(--ease-standard)',
    '&:hover': { backgroundColor: activa ? 'var(--accent-150)' : 'unset' },
  });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: '100%',
      }}
    >
      <Box
        onClick={canBack ? () => onChange(ordenadas[index - 1]) : undefined}
        sx={flecha(canBack)}
        role="button"
        aria-label="Semana anterior"
        aria-disabled={!canBack}
      >
        <IconNavigateLeft
          color={canBack ? 'var(--black)' : 'var(--grey-300)'}
        />
      </Box>

      <Typography className="h2" sx={{ textAlign: 'center', minWidth: 0 }}>
        {label}
      </Typography>

      <Box
        onClick={canNext ? () => onChange(ordenadas[index + 1]) : undefined}
        sx={flecha(canNext)}
        role="button"
        aria-label="Semana siguiente"
        aria-disabled={!canNext}
      >
        <IconNavigateRight
          color={canNext ? 'var(--black)' : 'var(--grey-300)'}
        />
      </Box>
    </Box>
  );
};

export default WeekNavigator;
