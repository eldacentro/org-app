import { Box, Typography } from '@mui/material';
import { EquipoEvacuacion } from '@definition/evacuacion';

type Props = {
  equipos: EquipoEvacuacion[];
};

const areaPorEquipo: Record<string, string> = {
  sanitario: 'Atención a heridos y personas con movilidad reducida en todo el salón.',
  'evacuacion-a': 'Sala B + aseos + auditorio principal desde la última fila.',
  'evacuacion-b':
    'Auditorio a la izquierda de la plataforma (de delante hacia atrás) + plataforma hasta la 3ª fila.',
};

const EquiposCard = ({ equipos }: Props) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {equipos.map((equipo) => (
        <Box
          key={equipo.id}
          sx={{
            border: '1px solid var(--accent-200, #E2E8F0)',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--white, #fff)',
          }}
        >
          <Box
            sx={{
              padding: '10px 16px',
              backgroundColor: `${equipo.color}1A`,
              borderBottom: `2px solid ${equipo.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '15px' }}>
              {equipo.nombre}
            </Typography>
            {equipo.zona && (
              <Box
                sx={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: equipo.color,
                  borderRadius: '999px',
                  padding: '2px 10px',
                }}
              >
                Zona {equipo.zona}
              </Box>
            )}
          </Box>

          <Box sx={{ padding: '12px 16px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {equipo.miembros.map((m, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {m.posicion && (
                    <Box
                      sx={{
                        minWidth: '28px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        backgroundColor: equipo.color,
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '0 6px',
                      }}
                    >
                      {m.posicion}
                    </Box>
                  )}
                  <Typography sx={{ fontSize: '14px' }}>{m.nombre}</Typography>
                  {i === 0 && equipo.miembros.length > 1 && m.posicion && (
                    <Typography
                      sx={{ fontSize: '12px', color: 'var(--grey-350, #64748B)' }}
                    >
                      · Responsable
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {areaPorEquipo[equipo.id] && (
              <Typography
                sx={{
                  marginTop: '10px',
                  fontSize: '13px',
                  color: 'var(--grey-400, #475569)',
                  fontStyle: 'italic',
                }}
              >
                {areaPorEquipo[equipo.id]}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default EquiposCard;
