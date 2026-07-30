import { Box, Stack } from '@mui/material';
import Typography from '@components/typography';
import { EmptyStateProps } from './index.types';

/**
 * "Aquí todavía no hay nada."
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Había SIETE dibujos distintos para decir lo mismo, y no diferían en un
 * detalle: diferían en todo.
 *
 *   · Documentos — caja de borde PUNTEADO, radio 28, icono de 48, texto de
 *     cuerpo, y un `backdropFilter: blur(8px)` que no hace nada porque el
 *     fondo de debajo es opaco.
 *   · Inicio — caja punteada también, pero radio 20 y el borde en
 *     `rgba(59,114,196,.15)`: el azul del tema por defecto CONGELADO. Con
 *     cualquier otro tema, el recuadro se quedaba azul. Y el icono era un
 *     `<svg>` escrito a mano, no uno de los 308 de la app.
 *   · Oradores salientes — `Card` de borde SÓLIDO, radio 28, el texto en `h2`.
 *   · Exhibidores — caja sólida, radio 20, y en HORIZONTAL: icono al lado del
 *     texto en vez de encima.
 *   · Mis asignaciones — sin caja: una ilustración grande al lado de un
 *     título y una explicación.
 *   · Avisos — sin caja tampoco, pero con el icono dentro de un círculo de
 *     96px con un lavado del acento.
 *   · Territorios (elegir) — un `Typography` a secas, centrado.
 *
 * Siete formas de decir "no hay nada" en la misma app.
 *
 * ── Lo que se queda ──────────────────────────────────────────────────────
 *
 * El círculo de Avisos, que es el mejor de los siete: el lavado del acento
 * hace de mancha amable donde debería haber contenido, y no es una caja vacía
 * dibujando un rectángulo alrededor de la nada.
 *
 * El borde PUNTEADO se va. Un recuadro punteado significa "aquí se suelta algo"
 * (una zona de arrastrar y soltar); para una lista vacía es ruido, y encima
 * tres de los siete lo llevaban y cuatro no.
 *
 * `compact` es para cuando esto va DENTRO de un diálogo o de una lista con
 * scroll: ahí un bloque de 200px de alto no cabe, así que se queda en el
 * icono, el texto y nada más.
 */
const EmptyState = ({
  icon,
  title,
  description,
  action,
  compact,
  surface = true,
  sx,
}: EmptyStateProps) => {
  return (
    <Box
      sx={{
        // La caja NO es adorno: este bloque ocupa el sitio de la tarjeta que
        // habría si hubiese contenido, así que hereda su superficie. Sin ella
        // el círculo del icono —que es un lavado del acento— queda casi del
        // mismo color que el fondo de la página y no se ve, y el texto flota
        // en medio de la nada sin nada que lo sujete.
        // Las de pantalla completa (Avisos, Mis asignaciones) sí la quitan:
        // ahí no sustituyen a una tarjeta, son la pantalla entera.
        ...(surface &&
          !compact && {
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--shape-lg)',
            boxShadow: 'var(--shadow-sm)',
          }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: compact ? '8px' : '16px',
        padding: compact ? '20px 16px' : '40px 24px',
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: compact ? '48px' : '80px',
            height: compact ? '48px' : '80px',
            borderRadius: 'var(--shape-full)',
            backgroundColor: 'var(--accent-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': {
              width: compact ? '24px' : '36px',
              height: compact ? '24px' : '36px',
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Stack spacing="4px" alignItems="center">
        <Typography
          className={compact ? 'body-regular-semibold' : 'h3'}
          color="var(--ink)"
        >
          {title}
        </Typography>

        {description && (
          <Typography
            className="body-small-regular"
            color="var(--ink-2)"
            // Una línea de explicación a lo ancho de la pantalla se lee mal:
            // el ojo pierde el renglón al volver. Se acota para que caiga en
            // dos o tres líneas cortas, centradas bajo el título.
            sx={{ maxWidth: '38ch' }}
          >
            {description}
          </Typography>
        )}
      </Stack>

      {action && <Box sx={{ marginTop: '8px' }}>{action}</Box>}
    </Box>
  );
};

export default EmptyState;
