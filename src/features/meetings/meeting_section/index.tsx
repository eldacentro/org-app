import { PropsWithChildren } from 'react';
import { Box, Collapse } from '@mui/material';
import { MeetingSectionType } from './index.types';
import { IconExpand } from '@components/icons';
import Typography from '@components/typography';

const MeetingSection = ({
  color,
  icon,
  part,
  expanded,
  onToggle,
  children,
  alwaysExpanded,
  actionButton,
}: MeetingSectionType & PropsWithChildren) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--shape-md)',
        boxShadow: 'var(--small-card-shadow)',
        // La cabecera de color va a sangre y la recorta esta esquina, así que
        // no hay radio que calcular dentro: lo hace el `overflow`.
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: color,
          padding: '12px 16px',
          cursor: onToggle ? 'pointer' : 'default',
          transition: 'filter var(--motion-fast) var(--ease-standard)',
          // Reacciona SOLO la cabecera, que es lo único que se pulsa. Antes la
          // sombra de la tarjeta entera cambiaba al pasar por encima de
          // cualquier punto, así que el bloque completo parecía pulsable
          // cuando en realidad solo lo es esta franja.
          // `brightness` y no un color: la cabecera es de un color distinto en
          // cada sección y un tinte fijo encima quedaría mal en unas u otras.
          ...(onToggle && {
            '&:hover': { filter: 'brightness(0.94)' },
            '&:active': { filter: 'brightness(0.90)' },
          }),
        }}
      >
        {/* La cabecera era un `div` con `onClick`: se plegaba con el ratón y
            con el teclado no había manera. Y esta sección la usan CATORCE
            pantallas —Programas semanales entero, Responsabilidades, la visita
            del superintendente, Departamentos, los editores—, así que era el
            plegable más copiado de la app y ninguna copia funcionaba.

            El disparador va como una capa que cubre toda la franja, y no
            envolviendo el contenido, por una razón concreta: una de las
            secciones (el editor de fin de semana) mete un BOTÓN dentro de la
            cabecera, y un botón dentro de otro botón no es HTML válido. Con la
            capa debajo, ese botón sigue siendo suyo —le basta con
            `position: relative` para quedar por encima— y el resto de la
            franja sigue plegando al pulsarla, como antes. */}
        {onToggle && (
          <Box
            component="button"
            type="button"
            aria-expanded={expanded}
            aria-label={typeof part === 'string' ? part : undefined}
            onClick={onToggle}
            sx={{
              position: 'absolute',
              inset: 0,
              appearance: 'none',
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              '&:focus-visible': {
                outline: '2px solid var(--always-white)',
                outlineOffset: '-3px',
              },
            }}
          />
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
          }}
        >
          {icon}
          <Typography
            className="h2-caps"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--always-white)',
            }}
          >
            {part}
          </Typography>
        </Box>
        {actionButton && (
          /* `position: relative` para quedar POR ENCIMA de la capa de arriba;
             si no, la capa se comería sus pulsaciones. */
          <Box
            sx={{
              position: 'relative',
              marginRight: alwaysExpanded ? 0 : '12px',
            }}
          >
            {actionButton}
          </Box>
        )}
        {!alwaysExpanded && (
          <IconExpand
            color="var(--always-white)"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--motion-medium) var(--ease-spring)',
            }}
          />
        )}
      </Box>
      <Collapse in={alwaysExpanded || expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '16px',
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export default MeetingSection;
