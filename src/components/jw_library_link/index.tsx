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
  sx,
}: {
  href: string;
  label?: string;
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
      px: '10px',
      py: '4px',
      borderRadius: 'var(--radius-max)',
      textDecoration: 'none',
      border: '1px solid var(--accent-200)',
      backgroundColor: 'var(--accent-100)',
      transition: 'background-color 0.2s ease',
      '&:hover': { backgroundColor: 'var(--accent-200)' },
      '&:active': { backgroundColor: 'var(--accent-200)' },
      ...sx,
    }}
  >
    <Typography
      component="span"
      sx={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--accent-main)',
        lineHeight: 1.2,
        letterSpacing: '0.2px',
      }}
    >
      {label} ↗
    </Typography>
  </Box>
);

export default JwLibraryLink;
