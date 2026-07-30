import { useState } from 'react';
import { Box } from '@mui/material';
import ScrollableTabs from '@components/scrollable_tabs';
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
        border: '1px solid var(--line)',
        borderRadius: 'var(--shape-lg)',
        backgroundColor: 'var(--card)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 16px',
      }}
    >
      <ScrollableTabs
        value={tab}
        onChange={setTab}
        indicatorMode
        tabs={[
          {
            label: 'Estructura de mando',
            Component: (
              <EstructuraMando estructuraMando={plan.estructuraMando} />
            ),
          },
          {
            label: 'Equipos',
            Component: <EquiposCard equipos={plan.equipos} />,
          },
          {
            label: 'Procedimientos',
            Component: (
              <Procedimientos
                estructuraMando={plan.estructuraMando}
                equipos={plan.equipos}
              />
            ),
          },
          {
            label: 'Reglas del plan',
            Component: <NormasGenerales normas={plan.reglasEspeciales} />,
          },
        ]}
      />
    </Box>
  );
};

export default PanelInformacion;
