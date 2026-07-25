import { Box } from '@mui/material';

type Props = {
  tabs: string[];
  active: number;
  onChange: (idx: number) => void;
  /** Nombre accesible del grupo (p. ej. "Vistas del territorio"). */
  ariaLabel?: string;
};

/** Pill segmented control estilo iOS, reutilizable. */
const SegmentedControl = ({ tabs, active, onChange, ariaLabel }: Props) => (
  <Box
    role="tablist"
    aria-label={ariaLabel}
    sx={{
      display: 'flex',
      backgroundColor: 'var(--accent-200)',
      borderRadius: '10px',
      p: '3px',
    }}
  >
    {tabs.map((t, i) => (
      <Box
        key={t}
        // Antes era un <Box onClick>: invisible para lectores de pantalla y
        // sin acceso por teclado. Como <button> real conserva el mismo
        // aspecto (gracias al reset) y funciona con tabulador y Enter.
        component="button"
        type="button"
        role="tab"
        aria-selected={active === i}
        onClick={() => onChange(i)}
        sx={{
          appearance: 'none',
          border: 'none',
          font: 'inherit',
          flex: 1,
          textAlign: 'center',
          py: '6px',
          borderRadius: 'var(--radius-l)',
          // Tokens en vez de blanco/negro literales: sobre los 4 temas
          // oscuros, la pestaña activa quedaba blanca y las inactivas
          // negro-sobre-negro (ilegibles).
          backgroundColor: active === i ? 'var(--card)' : 'transparent',
          boxShadow:
            active === i
              ? '0 1px 3px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.05)'
              : 'none',
          color: active === i ? 'var(--ink)' : 'var(--ink-2)',
          fontWeight: active === i ? 600 : 400,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          letterSpacing: '-0.1px',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      >
        {t}
      </Box>
    ))}
  </Box>
);

export default SegmentedControl;
