import { Box } from '@mui/material';
import { CardButtonProps } from './index.types';

/**
 * Una tarjeta que se pulsa: una fila de lista que abre algo.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Había DOS `styled(Box)` idénticos byte a byte —uno en Registros de
 * publicadores, otro en Informes de predicación—, los dos llamados `UserCard`,
 * y los dos tapando con ese nombre al `@components/user_card` de verdad. Tres
 * cosas distintas con el mismo nombre en la misma app.
 *
 * ── Y por qué es un <button> ─────────────────────────────────────────────
 *
 * Los dos eran un `Box` con `onClick`: con el ratón abrían la ficha del
 * hermano y con el teclado no existían. En Registros de publicadores eso son
 * NOVENTA filas seguidas a las que no se llega tabulando — la pantalla entera
 * es inalcanzable.
 *
 * Un `<button>` trae de fábrica fondo gris, borde, su propia fuente y
 * `width: auto` (un control de formulario NO se estira al ancho del padre
 * aunque sea `display: flex`). Todo eso se resetea aquí, una vez, para que
 * quien lo use no tenga que acordarse.
 */
const CardButton = ({ children, onClick, sx, ariaLabel }: CardButtonProps) => {
  return (
    <Box
      component="button"
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{
        // Reset del botón
        appearance: 'none',
        font: 'inherit',
        color: 'inherit',
        textAlign: 'left',
        width: '100%',

        border: '1px solid var(--line)',
        borderRadius: 'var(--shape-sm)',
        display: 'flex',
        gap: '16px',
        backgroundColor: 'var(--card)',
        cursor: 'pointer',
        padding: '24px',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition:
          'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
        '&:hover': {
          background: 'var(--accent-100)',
          borderColor: 'var(--accent-350)',
          boxShadow: 'var(--hover-shadow)',
        },
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '2px',
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default CardButton;
