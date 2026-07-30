import { Box } from '@mui/material';
import { IconE911Emergency, IconClock } from '@components/icons';

type Props = {
  tiempoMaximo: number;
};

const PlanHeader = ({ tiempoMaximo }: Props) => {
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
      {/* Sin título propio: la barra de navegación ya pone "Plan de
          evacuación" justo encima, y repetirlo solo gastaba alto de pantalla
          en un móvil. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--shape-full)',
              color: 'var(--always-white)',
              backgroundColor: 'var(--red-main)',
            }}
          >
            <IconE911Emergency
              width={14}
              height={14}
              color="var(--always-white)"
            />
            Emergencia
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--shape-full)',
              color: 'var(--ink-2)',
              backgroundColor: 'var(--accent-150)',
              border: '1px solid var(--line)',
            }}
          >
            <IconClock width={14} height={14} color="var(--grey-400)" />
            {tiempoMaximo} min máx.
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PlanHeader;
