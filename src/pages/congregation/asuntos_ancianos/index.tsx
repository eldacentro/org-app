import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { IconAdd } from '@components/icons';
import AsuntosAncianos from '@features/congregation/asuntos_ancianos';
import backupWorker from '@services/worker/backupWorker';

/**
 * El tablón del cuerpo de ancianos.
 *
 * Al entrar se pide una sincronización: se abre justo antes de una reunión de
 * ancianos, y lo peor que podría pasar es tratar una lista a la que le falta lo
 * último que apuntó otro.
 */
const AsuntosAncianosPage = () => {
  const [pedirNuevo, setPedirNuevo] = useState(0);

  useEffect(() => {
    backupWorker.postMessage('startWorker');
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle
        title="Asuntos del cuerpo de ancianos"
        buttons={
          <NavBarButton
            text="Apuntar"
            main
            icon={<IconAdd color="var(--always-white)" />}
            onClick={() => setPedirNuevo((n) => n + 1)}
          />
        }
      />

      <AsuntosAncianos pedirNuevo={pedirNuevo} />
    </Box>
  );
};

export default AsuntosAncianosPage;
