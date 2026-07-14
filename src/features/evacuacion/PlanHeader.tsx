import { Box, Typography } from '@mui/material';
import { IconE911Emergency, IconClock } from '@components/icons';
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
          Plan de evacuación
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-max)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              backgroundColor: COLORES.emergencia,
            }}
          >
            <IconE911Emergency width={14} height={14} color="#fff" />
            Emergencia
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-max)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--grey-400, #475569)',
              backgroundColor: 'var(--accent-150, #F1F5F9)',
              border: '1px solid var(--accent-200, #E2E8F0)',
            }}
          >
            <IconClock width={14} height={14} color="var(--grey-400)" />
            {tiempoMaximo} min máx.
          </Box>
        </Box>
      </Box>

      <TogglePlano modo={modo} onChange={onChangeModo} />
    </Box>
  );
};

export default PlanHeader;
