import { Box } from '@mui/material';

type Props = {
  tabs: string[];
  active: number;
  onChange: (idx: number) => void;
  /** Nombre accesible del grupo (p. ej. "Vistas del territorio"). */
  ariaLabel?: string;
  /**
   * Un contador por pestaña, en el mismo orden que `tabs`. Cero o ausente = sin
   * marca. Es para lo que hay que ver SÍ O SÍ aunque no se abra esa pestaña —
   * las direcciones de «No visitar» de un territorio—, no para decorar.
   */
  counts?: (number | undefined)[];
  /** El color de la marca. Por defecto, el rojo de aviso. */
  countColor?: string;
};

/** Pill segmented control estilo iOS, reutilizable. */
const SegmentedControl = ({
  tabs,
  active,
  onChange,
  ariaLabel,
  counts,
  countColor = 'var(--red-main)',
}: Props) => (
  <Box
    role="tablist"
    aria-label={ariaLabel}
    sx={{
      display: 'flex',
      // El carril, en un tinte más suave que antes (`--accent-200` competía
      // con el propio segmento elegido) y con forma de píldora: el 10px suelto
      // que tenía no pertenecía a ninguna escala.
      backgroundColor: 'var(--accent-100)',
      borderRadius: 'var(--shape-full)',
      p: '4px',
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
          py: '8px',
          borderRadius: 'var(--shape-full)',
          // El MISMO lenguaje de "elegido" que las pestañas y los chips de
          // semana: tinte de marca y texto en azul oscuro. Antes era una
          // pastilla blanca con sombra propia —un tercer dibujo para la misma
          // idea— y encima esa sombra no se adaptaba al tema oscuro.
          backgroundColor:
            active === i ? 'var(--state-selected)' : 'transparent',
          color: active === i ? 'var(--state-selected-ink)' : 'var(--ink-2)',
          fontWeight: active === i ? 600 : 400,
          fontSize: '13px',
          // Sin partir palabras: una opción en dos líneas y la de al lado en
          // una hacen que el control se vea desequilibrado.
          whiteSpace: 'nowrap',
          // Con contador el rótulo deja de ser una cadena suelta y pasa a ser
          // texto + marca, así que la caja tiene que colocarlos.
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition:
            'background-color var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          letterSpacing: '-0.1px',
          '&:hover': {
            backgroundColor:
              active === i ? 'var(--state-selected)' : 'var(--state-hover)',
          },
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      >
        {t}
        {counts?.[i] ? (
          <Box
            component="span"
            aria-label={`${counts[i]} sin ver`}
            sx={{
              minWidth: '16px',
              height: '16px',
              px: '4px',
              borderRadius: 'var(--shape-full)',
              backgroundColor: countColor,
              color: 'var(--always-white)',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            {counts[i] > 9 ? '9+' : counts[i]}
          </Box>
        ) : null}
      </Box>
    ))}
  </Box>
);

export default SegmentedControl;
