import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { PlanEvacuacion } from '@definition/evacuacion';
import EstructuraMando from './EstructuraMando';
import EquiposCard from './EquiposCard';
import Procedimientos from './Procedimientos';
import NormasGenerales from './NormasGenerales';

type Props = {
  plan: PlanEvacuacion;
};

const PanelInformacion = ({ plan }: Props) => {
  const [tab, setTab] = useState(0);

  return (
    <Box
      sx={{
        border: '1px solid var(--accent-200, #E2E8F0)',
        borderRadius: 'var(--radius-xxl)',
        backgroundColor: 'var(--white, #fff)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: '1px solid var(--accent-200, #E2E8F0)',
          minHeight: '44px',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '13px',
            minHeight: '44px',
            padding: '8px 14px',
          },
        }}
      >
        <Tab label="Estructura de mando" />
        <Tab label="Equipos" />
        <Tab label="Procedimientos" />
        <Tab label="Normas generales" />
      </Tabs>

      <Box sx={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {tab === 0 && (
          <EstructuraMando estructuraMando={plan.estructuraMando} />
        )}
        {tab === 1 && <EquiposCard equipos={plan.equipos} />}
        {tab === 2 && (
          <Procedimientos
            estructuraMando={plan.estructuraMando}
            equipos={plan.equipos}
          />
        )}
        {tab === 3 && <NormasGenerales normas={plan.normasGenerales} />}
      </Box>
    </Box>
  );
};

export default PanelInformacion;
