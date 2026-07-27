import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useCurrentUser } from '@hooks/index';
import NavBarButton from '@components/nav_bar_button';
import { IconSettings } from '@components/icons';
import PageTitle from '@components/page_title';
import PlanHeader from '@features/evacuacion/PlanHeader';
import Plano2D from '@features/evacuacion/Plano2D';
import PanelInformacion from '@features/evacuacion/PanelInformacion';
import DetalleSeleccion, { Seleccion } from '@features/evacuacion/DetalleSeleccion';
import { PLAN_EVACUACION } from '@features/evacuacion/data';
import { dbEvacuacionGetConfig } from '@services/dexie/evacuacion';
import { PlanEvacuacion } from '@definition/evacuacion';
import EvacuacionConfigDialog from '@features/evacuacion/EvacuacionConfigDialog';

const EvacuacionPage = () => {
  const { isElder, isAdmin } = useCurrentUser();
  const isManager = isElder || isAdmin;

  const [plan, setPlan] = useState<PlanEvacuacion>(PLAN_EVACUACION);
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
      <PageTitle
        title="Plan de evacuación"
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

      <PlanHeader tiempoMaximo={plan.tiempoMaximo} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { mobile: 'column', laptop: 'row' },
          gap: '16px',
          alignItems: 'flex-start',
          flex: 1,
        }}
      >
        {/* Columna del plano: el plano y, DEBAJO, el detalle de lo que se
            toque. Antes el detalle era una tercera columna del mismo flex y
            en escritorio quedaba estrujado en una tira de texto ilegible. */}
        <Box
          sx={{
            flex: { mobile: '0 0 auto', laptop: '1 1 auto' },
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <Plano2D seleccion={seleccion} onSelect={setSeleccion} />

          {seleccion && (
            <DetalleSeleccion
              plan={plan}
              seleccion={seleccion}
              onClose={() => setSeleccion(null)}
            />
          )}
        </Box>

        {/* Panel de información */}
        <Box
          sx={{
            flex: { mobile: '0 0 auto', laptop: '0 0 360px' },
            width: '100%',
            minWidth: 0,
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
