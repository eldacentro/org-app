import { Box, Typography } from '@mui/material';
import { COLORES } from './data';
import TogglePlano, { ModoPlano } from './TogglePlano';

type Props = {
  tiempoMaximo: number;
  modo: ModoPlano;
  onChangeModo: (modo: ModoPlano) => void;
};

const PlanHeader = ({ tiempoMaximo, modo, onChangeModo }: Props) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography
          sx={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}
        >
          Plan de Evacuación
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              backgroundColor: COLORES.emergencia,
            }}
          >
            🚨 Emergencia
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--grey-400, #475569)',
              backgroundColor: 'var(--accent-150, #F1F5F9)',
              border: '1px solid var(--accent-200, #E2E8F0)',
            }}
          >
            ⏱ {tiempoMaximo} min máx.
          </Box>
        </Box>
      </Box>

      <TogglePlano modo={modo} onChange={onChangeModo} />
    </Box>
  );
};

export default PlanHeader;
