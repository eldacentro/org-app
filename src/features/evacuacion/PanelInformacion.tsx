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
        border: '1px solid var(--accent-200)',
        borderRadius: 'var(--radius-xxl)',
        backgroundColor: 'var(--white)',
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
            label: 'Normas generales',
            Component: <NormasGenerales normas={plan.normasGenerales} />,
          },
        ]}
      />
    </Box>
  );
};

export default PanelInformacion;
