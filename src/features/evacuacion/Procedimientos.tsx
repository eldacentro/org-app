import { Box, Typography } from '@mui/material';
import { EquipoEvacuacion, RolEmergencia } from '@definition/evacuacion';
import { COLORES } from './data';

type Props = {
  estructuraMando: RolEmergencia[];
  equipos: EquipoEvacuacion[];
};

type Bloque = {
  titulo: string;
  color: string;
  pasos: string[];
};

const Procedimientos = ({ estructuraMando, equipos }: Props) => {
  // Normalizar para tolerar variantes de acento y capitalización
  const normalizeRol = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const intervencion = estructuraMando.find((r) =>
    normalizeRol(r.rol).includes('jefe de intervencion')
  );

  const bloques: Bloque[] = [];

  if (intervencion) {
    bloques.push({
      titulo: 'Intervención',
      color: COLORES.emergencia,
      pasos: intervencion.responsabilidades,
    });
  }

  for (const equipo of equipos) {
    bloques.push({
      titulo: equipo.nombre.replace('Equipo de ', '').replace('Equipo ', ''),
      color: equipo.color,
      pasos: equipo.procedimiento,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {bloques.map((bloque) => (
        <Box key={bloque.titulo}>
          <Typography
            className="body-regular-semibold"
            sx={{ marginBottom: '8px', color: bloque.color }}
          >
            {bloque.titulo}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bloque.pasos.map((paso, i) => (
              <Box
                key={i}
                sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--shape-full)',
                    backgroundColor: bloque.color,
                    color: 'var(--always-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography
                  className="body-small-regular"
                  color="var(--ink-2)"
                  sx={{ paddingTop: '2px' }}
                >
                  {paso}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Procedimientos;
