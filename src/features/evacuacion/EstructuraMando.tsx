import { Box, Typography } from '@mui/material';
import { RolEmergencia } from '@definition/evacuacion';
import accentSurface from '@components/accent_surface';

type Props = {
  estructuraMando: RolEmergencia[];
};

const EstructuraMando = ({ estructuraMando }: Props) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {estructuraMando.map((rol) => (
        <Box
          key={rol.rol}
          sx={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--shape-md)',
            padding: '16px',
            backgroundColor: 'var(--card)',
            // La cápsula, no la uñita: el borde de 4px iba pegado al canto y la
            // esquina redondeada lo cortaba. Ver DESIGN_SYSTEM §6.3.
            ...accentSurface('var(--red-main)', { tint: false }),
          }}
        >
          <Typography className="body-regular-semibold" color="var(--ink)">
            {rol.nombre}
          </Typography>
          <Typography
            className="body-small-semibold"
            color="var(--red-main)"
            sx={{ marginBottom: '8px' }}
          >
            {rol.rol}
          </Typography>
          <Box
            component="ul"
            sx={{
              margin: 0,
              paddingInlineStart: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {rol.responsabilidades.map((r, i) => (
              <Typography
                key={i}
                component="li"
                className="body-small-regular"
                color="var(--ink-2)"
              >
                {r}
              </Typography>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default EstructuraMando;
