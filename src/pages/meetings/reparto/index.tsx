import { Box } from '@mui/material';
import PageTitle from '@components/page_title';
import Reparto from '@features/meetings/reparto';

/**
 * «Reparto de asignaciones».
 *
 * Una página aparte y no un trozo dentro del editor, a propósito: esto no se
 * mira mientras se programa, se mira de vez en cuando para confirmar que el
 * reparto va equitativo. Por eso está donde está —la última baldosa de
 * Reuniones— y no en la barra de ninguna pantalla de trabajo.
 */
const RepartoPage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle title="Reparto de asignaciones" />

      <Reparto />
    </Box>
  );
};

export default RepartoPage;
