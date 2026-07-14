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
            borderRadius: 'var(--radius-xl)',
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
            <Typography className="h4" sx={{ fontWeight: 700 }}>
              {equipo.nombre}
            </Typography>
            {equipo.zona && (
              <Box
                className="label-small-semibold"
                sx={{
                  color: '#fff',
                  backgroundColor: equipo.color,
                  borderRadius: 'var(--radius-max)',
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
                      className="label-small-semibold"
                      sx={{
                        minWidth: '28px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-m)',
                        backgroundColor: equipo.color,
                        color: '#fff',
                        padding: '0 6px',
                      }}
                    >
                      {m.posicion}
                    </Box>
                  )}
                  <Typography className="body-small-regular">{m.nombre}</Typography>
                  {i === 0 && equipo.miembros.length > 1 && m.posicion && (
                    <Typography
                      className="label-small-regular"
                      sx={{ color: 'var(--grey-350, #64748B)' }}
                    >
                      · Responsable
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {areaPorEquipo[equipo.id] && (
              <Typography
                className="body-small-regular"
                sx={{
                  marginTop: '10px',
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
