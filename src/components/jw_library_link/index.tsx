import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * El enlace a JW Library, igual en todas partes.
 *
 * Sale en tres sitios —"Mis asignaciones", la reunión de entre semana y la de
 * fin de semana— y son el mismo gesto, así que tienen que verse iguales. Es
 * discreto a propósito: acompaña al programa, no compite con él.
 */
const JwLibraryLink = ({
  href,
  label = 'JW Library',
  variant = 'subtle',
  sx,
}: {
  href: string;
  label?: string;
  /**
   * 'subtle' acompaña a una asignación concreta (en "Mis asignaciones" hay uno
   * por fila y no deben competir con el texto). 'solid' es la acción de la
   * pestaña en el programa semanal: hay una sola y tiene que verse.
   */
  variant?: 'subtle' | 'solid';
  sx?: object;
}) => (
  <Box
    component="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    sx={{
      alignSelf: 'flex-start',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      px: '9px',
      py: '3px',
      borderRadius: 'var(--radius-max)',
      textDecoration: 'none',
      // Sin relleno: se apoya en el borde y en el color del texto. Con fondo
      // pedía demasiada atención al lado del programa, que es lo que se viene
      // a leer. Al pasar por encima sí se rellena, para que siga sintiéndose
      // como algo que se pulsa.
      ...(variant === 'solid'
        ? {
            px: '12px',
            py: '6px',
            border: 'none',
            backgroundColor: 'var(--accent-main)',
            '&:hover': { backgroundColor: 'var(--accent-dark)' },
            '&:active': { backgroundColor: 'var(--accent-dark)' },
          }
        : {
            border: '1px solid var(--accent-200)',
            backgroundColor: 'transparent',
            '&:hover': { backgroundColor: 'var(--accent-100)' },
            '&:active': { backgroundColor: 'var(--accent-200)' },
          }),
      transition: 'background-color 0.2s ease',
      ...sx,
    }}
  >
    {/* La clase manda sobre el `sx`: las tipográficas globales de la app
        tienen más especificidad, así que poner aquí fontSize/fontWeight no
        hacía nada y el texto salía a 15 px con el peso normal. Se usa la clase
        que toca —la misma familia que los demás enlaces pequeños— y el color
        es lo único que se ajusta. */}
    <Typography
      component="span"
      className={
        variant === 'solid' ? 'label-small-semibold' : 'label-small-medium'
      }
      color={variant === 'solid' ? 'var(--always-white)' : 'var(--accent-main)'}
    >
      {label} ↗
    </Typography>
  </Box>
);

export default JwLibraryLink;
