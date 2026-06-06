import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useCurrentUser } from '@hooks/index';
import NavBarButton from '@components/nav_bar_button';
import { IconSettings } from '@components/icons';
import PageTitle from '@components/page_title';
import PlanHeader from '@features/evacuacion/PlanHeader';
import Plano2D from '@features/evacuacion/Plano2D';
import Plano3D from '@features/evacuacion/Plano3D';
import PanelInformacion from '@features/evacuacion/PanelInformacion';
import { ModoPlano } from '@features/evacuacion/TogglePlano';
import { Seleccion } from '@features/evacuacion/DetalleSeleccion';
import { PLAN_EVACUACION } from '@features/evacuacion/data';
import { dbEvacuacionGetConfig } from '@services/dexie/evacuacion';
import { PlanEvacuacion } from '@definition/evacuacion';
import EvacuacionConfigDialog from '@features/evacuacion/EvacuacionConfigDialog';

const EvacuacionPage = () => {
  const { isElder, isAdmin } = useCurrentUser();
  const isManager = isElder || isAdmin;

  const [plan, setPlan] = useState<PlanEvacuacion>(PLAN_EVACUACION);
  const [modo, setModo] = useState<ModoPlano>('2D');
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await dbEvacuacionGetConfig();
        if (data) {
          setPlan(data);
        } else {
          // If no data in DB yet, fallback to the default static plan
          setPlan(PLAN_EVACUACION);
        }
      } catch (err) {
        console.error('Error loading evacuacion config:', err);
      }
    };
    loadConfig();
  }, []);

  // Al cambiar de modo se limpia la selección para evitar estados desincronizados.
  const handleModo = (m: ModoPlano) => {
    setSeleccion(null);
    setModo(m);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
      <PageTitle
        title="Plan de Evacuación"
        buttons={
          <>
            {isManager && (
              <NavBarButton
                text="Configuración"
                onClick={() => setIsConfigOpen(true)}
                icon={<IconSettings />}
              />
            )}
          </>
        }
      />

      <PlanHeader
        tiempoMaximo={plan.tiempoMaximo}
        modo={modo}
        onChangeModo={handleModo}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          '@media (min-width: 1024px)': {
            flexDirection: 'row',
          },
          gap: '16px',
          alignItems: 'stretch',
          flex: 1,
        }}
      >
        {/* Plano */}
        <Box
          sx={{
            flex: '0 0 auto',
            '@media (min-width: 1024px)': {
              flex: '0 0 65%',
              height: '600px',
            },
            width: '100%',
            height: '55vh',
            position: 'relative',
          }}
        >
          {modo === '2D' ? (
            <Plano2D plan={plan} seleccion={seleccion} onSelect={setSeleccion} />
          ) : (
            <Plano3D plan={plan} seleccion={seleccion} onSelect={setSeleccion} />
          )}
        </Box>

        {/* Panel de información */}
        <Box
          sx={{
            flex: '0 0 auto',
            '@media (min-width: 1024px)': {
              flex: '1 1 35%',
              minHeight: '600px',
            },
            width: '100%',
            minHeight: '450px',
          }}
        >
          <PanelInformacion plan={plan} />
        </Box>
      </Box>

      {isConfigOpen && (
        <EvacuacionConfigDialog
          open={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          currentPlan={plan}
          onSave={(newPlan) => setPlan(newPlan)}
        />
      )}
    </Box>
  );
};

export default EvacuacionPage;
