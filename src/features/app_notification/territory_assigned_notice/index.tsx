import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { TerritoryAssignedNotificationType } from '@definition/notification';
import Button from '@components/button';

import { useNavigate } from 'react-router';
import {
  markNoticeRead,
  responderCierreCampana,
} from '@services/firebase/territories';
import { useAtomValue } from 'jotai';
import { congIDState } from '@states/settings';
import useAppNotification from '@features/app_notification/useAppNotification';
import {
  AVISO_ATRASADO_TITULO,
  AVISO_CAMPANA_TITULO,
  esAvisoInformativo,
} from '@services/app/territories';

const TerritoryAssignedNotice = ({
  notification,
}: {
  notification: TerritoryAssignedNotificationType;
}) => {
  const navigate = useNavigate();
  const congId = useAtomValue(congIDState);
  const { handleCloseNotification } = useAppNotification();
  const notice = notification.notice;

  // Un aviso de territorio ATRASADO no se lee para mirar el mapa: se lee
  // porque te están pidiendo que lo devuelvas. Así que el botón lleva
  // directamente al diálogo de entrega, en vez de dejar al hermano en la
  // ficha buscando por dónde se hace.
  const esAtrasado = notice.title === AVISO_ATRASADO_TITULO;

  // Y los que le llegan a un RESPONSABLE —"X devolvió el 12 sin trabajar",
  // "X añadió una dirección"— son un parte de lo que ha pasado: no hay nada
  // que hacer. Ofrecerle "Ver territorio" es mandarle a un sitio al que no
  // iba; lo único que quiere es darse por enterado y quitárselo de encima.
  const soloEnterarse = esAvisoInformativo(notice.title);

  // Y el de "campaña terminada" no lleva a ningún sitio: pregunta algo, y se
  // contesta aquí mismo con dos botones. Mandarle a la ficha del territorio
  // sería mandarle a mirar un mapa cuando lo que hay que decir es sí o no.
  const preguntaDeCampana =
    notice.title === AVISO_CAMPANA_TITULO && Boolean(notice.assignmentId);
  const [respondiendo, setRespondiendo] = useState(false);

  const responder = async (trabajado: boolean) => {
    if (!notice.assignmentId) return;
    setRespondiendo(true);
    try {
      await responderCierreCampana(
        congId,
        {
          assignmentId: notice.assignmentId,
          territoryId: notice.territoryId,
          returnedAt: notice.createdAt,
        },
        trabajado,
        notice.id
      );
    } catch (e) {
      console.error('No se pudo responder al cierre de campaña', e);
    } finally {
      setRespondiendo(false);
    }
  };

  const handleMarcarLeido = async () => {
    if (!notice.id) return;
    try {
      await markNoticeRead(congId, notice.id);
    } catch (e) {
      console.error('Failed to mark notice as read', e);
    }
  };

  const handleVerTerritorio = async () => {
    await handleMarcarLeido();

    // Navegar a la página de territorios con el parámetro view
    if (notice.territoryId) {
      handleCloseNotification();
      navigate(
        esAtrasado
          ? `/congregation/territories?entregar=${notice.territoryId}`
          : `/congregation/territories?view=${notice.territoryId}`
      );
    }
  };

  return (
    <Box
      sx={{
        mt: '12px',
        p: '16px',
        borderRadius: 'var(--shape-md)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--white)',
        boxShadow: 'var(--small-card-shadow)',
      }}
    >
      <Stack direction="row" justifyContent="flex-start" spacing={1}>
        {preguntaDeCampana && (
          <>
            <Button
              variant="main"
              disabled={respondiendo}
              onClick={() => responder(true)}
              sx={{ height: '38px', minHeight: '38px', px: '20px' }}
            >
              Sí, lo trabajé
            </Button>
            <Button
              variant="secondary"
              disabled={respondiendo}
              onClick={() => responder(false)}
              sx={{ height: '38px', minHeight: '38px', px: '20px' }}
            >
              No lo trabajé
            </Button>
          </>
        )}
        {!preguntaDeCampana && (
          <Button
            variant={soloEnterarse ? 'tertiary' : 'main'}
            onClick={soloEnterarse ? handleMarcarLeido : handleVerTerritorio}
            sx={{
              height: '38px',
              minHeight: '38px',
              px: '20px',
              borderRadius: 'var(--shape-sm)',
              fontWeight: 600,
              fontSize: '13px',
              letterSpacing: '0.01em',
              boxShadow: 'var(--btn-shadow)',
              transition:
                'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 'var(--hover-shadow)',
              },
            }}
          >
            {soloEnterarse
              ? 'Entendido'
              : esAtrasado
                ? 'Entregar territorio'
                : 'Ver territorio'}
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default TerritoryAssignedNotice;
