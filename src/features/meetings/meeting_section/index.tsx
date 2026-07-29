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
        onClick={onToggle}
      >
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
          <Box sx={{ marginRight: alwaysExpanded ? 0 : '12px' }}>
            {actionButton}
          </Box>
        )}
        {!alwaysExpanded && (
          <IconExpand
            color="var(--always-white)"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--motion-medium) var(--ease-emphasized)',
            }}
          />
        )}
      </Box>
      <Collapse in={alwaysExpanded || expanded} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export default MeetingSection;
