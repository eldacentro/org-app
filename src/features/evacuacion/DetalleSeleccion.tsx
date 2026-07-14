import { Box, Typography } from '@mui/material';
import { IconClose, IconError } from '@components/icons';
import { PlanEvacuacion } from '@definition/evacuacion';

export type Seleccion =
  | { tipo: 'zona'; equipoId: string }
  | { tipo: 'extintor'; id: number }
  | null;

type Props = {
  plan: PlanEvacuacion;
  seleccion: Seleccion;
  onClose: () => void;
};

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <Box
    onClick={onClose}
    aria-label="Cerrar"
    sx={{
      cursor: 'pointer',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.04)',
      flexShrink: 0,
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.08)',
      },
    }}
  >
    <IconClose width={14} height={14} color="#475569" />
  </Box>
);

/**
 * Panel lateral/inferior que muestra el detalle del objeto seleccionado.
 * En móvil se comporta como un Bottom Sheet y en desktop como Sidebar interactiva.
 * Presenta una UI Light "Apple/Glassmorphism".
 */
const DetalleSeleccion = ({ plan, seleccion, onClose }: Props) => {
  if (!seleccion) return null;

  const wrapperSx = {
    position: 'absolute' as const,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(24px)',
    color: '#0F172A',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '24px 20px',
    overflowY: 'auto' as const,
    top: 'auto',
    bottom: 0,
    right: 0,
    left: 0,
    width: '100%',
    height: 'auto',
    maxHeight: '65%',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    borderLeft: 'none',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.08)',
    
    '@media (min-width: 900px)': {
      top: 0,
      bottom: 'auto',
      left: 'auto',
      width: 'min(340px, 45%)',
      height: '100%',
      maxHeight: '100%',
      borderTopLeftRadius: '0',
      borderTopRightRadius: '0',
      borderLeft: '1px solid rgba(0, 0, 0, 0.05)',
      borderTop: 'none',
      boxShadow: '-10px 0 40px rgba(0,0,0,0.08)',
    },
  };

  if (seleccion.tipo === 'extintor') {
    const ext = plan.extintores.find((e) => e.id === seleccion.id);
    return (
      <Box sx={wrapperSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconError width={22} height={22} color="var(--red-main)" /> Extintor {seleccion.id}
          </Typography>
          <CloseButton onClose={onClose} />
        </Box>
        <Box
          sx={{
            border: `1px solid rgba(0,0,0,0.05)`,
            borderRadius: 'var(--radius-xxl)',
            padding: '18px',
            backgroundColor: `rgba(0,0,0,0.02)`,
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <Typography sx={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Tipo de Agente
          </Typography>
          <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
            {ext?.tipo ?? 'Desconocido'}
          </Typography>
        </Box>
        <Typography className="body-small-regular" sx={{ color: '#475569', lineHeight: 1.5 }}>
          Ubicación estratégica señalada en el plano para uso inmediato en caso de conato de incendio.
        </Typography>
      </Box>
    );
  }

  // tipo === 'zona'
  const equipo = plan.equipos.find((e) => e.id === seleccion.equipoId);
  if (!equipo) return null;

  return (
    <Box sx={wrapperSx}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <Box>
          {equipo.zona && (
            <Box sx={{ display: 'inline-block', padding: '4px 10px', borderRadius: '100px', backgroundColor: `${equipo.color}1A`, border: `1px solid ${equipo.color}33`, marginBottom: '8px' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 800, color: equipo.color, letterSpacing: '1px' }}>
                ZONA {equipo.zona}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '20px', lineHeight: 1.2, color: '#0F172A' }}>
            {equipo.nombre}
          </Typography>
        </Box>
        <CloseButton onClose={onClose} />
      </Box>

      {/* Equipo */}
      <Box sx={{ marginTop: '4px' }}>
        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Personal Asignado
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {equipo.miembros.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(0,0,0,0.03)' }}>
              {m.posicion && (
                <Box
                  sx={{
                    minWidth: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-l)',
                    backgroundColor: equipo.color,
                    boxShadow: `0 4px 12px ${equipo.color}40`,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  {m.posicion}
                </Box>
              )}
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>{m.nombre}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Procedimiento */}
      <Box sx={{ marginTop: '8px' }}>
        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Protocolo de Acción
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {equipo.procedimiento.map((paso, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  color: equipo.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: `1px solid ${equipo.color}33`,
                }}
              >
                {i + 1}
              </Box>
              <Typography className="body-small-medium" sx={{ color: '#475569', lineHeight: 1.6, paddingTop: '1px' }}>
                {paso}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default DetalleSeleccion;
