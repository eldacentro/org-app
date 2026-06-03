import { Box, Typography } from '@mui/material';
import { RolEmergencia } from '@definition/evacuacion';
import { COLORES } from './data';

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
            border: '1px solid var(--accent-200, #E2E8F0)',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: 'var(--white, #fff)',
            borderLeft: `4px solid ${COLORES.emergencia}`,
          }}
        >
          <Typography
            sx={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.3 }}
          >
            {rol.nombre}
          </Typography>
          <Typography
            sx={{
              fontSize: '13px',
              color: COLORES.emergencia,
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            {rol.rol}
          </Typography>
          <Box
            component="ul"
            sx={{ margin: 0, paddingInlineStart: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            {rol.responsabilidades.map((r, i) => (
              <Typography
                key={i}
                component="li"
                sx={{ fontSize: '13px', color: 'var(--grey-400, #475569)' }}
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
