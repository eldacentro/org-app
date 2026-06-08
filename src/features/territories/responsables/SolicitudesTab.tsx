import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { useConfirm } from '@components/confirm_dialog';
import {
  congIDState,
  userLocalUIDState,
} from '@states/settings';
import { territoryPendingRequestsState } from '@states/territories';
import { TerritoryRequest } from '@definition/territories';
import { atenderRequest } from '@services/firebase/territories';
import { formatTerritoryDate } from '@services/app/territories';
import { territorySettingsState } from '@states/territories';
import { usePersonName } from '@features/territories/usePersonName';

type Props = {
  /** Abre el asignador preseleccionando al solicitante y marcando la solicitud
   *  como atendida tras asignar. */
  onAsignarParaSolicitud: (req: TerritoryRequest) => void;
};

const SolicitudesTab = ({ onAsignarParaSolicitud }: Props) => {
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const pending = useAtomValue(territoryPendingRequestsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const handleDescartar = async (req: TerritoryRequest) => {
    const ok = await confirm({
      message: '¿Descartar esta solicitud sin asignar territorio?',
      confirmLabel: 'Descartar',
      destructive: true,
    });
    if (ok && uid) await atenderRequest(congId, req.id, uid);
  };

  if (pending.length === 0) {
    return (
      <Typography variant="body2" color="var(--ink-2)">
        No hay solicitudes de territorio pendientes.
      </Typography>
    );
  }

  return (
    <>
      {ConfirmDialogNode}
      <Stack spacing={1.5}>
        {pending
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((req) => (
            <Box
              key={req.id}
              sx={{
                p: 1.5,
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--line)',
                borderLeft: '4px solid var(--blue-main)',
              }}
            >
              <Typography variant="body1" sx={{ color: 'var(--ink)' }}>
                {resolveName(req.personUid)} pidió un territorio
              </Typography>
              <Typography variant="caption" color="var(--ink-2)">
                {formatTerritoryDate(req.createdAt, settings.dateFormat)}
              </Typography>
              {req.nota && (
                <Typography variant="body2" sx={{ mt: 0.5, color: 'var(--ink)' }}>
                  &quot;{req.nota}&quot;
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="main" onClick={() => onAsignarParaSolicitud(req)}>
                  Asignar territorio
                </Button>
                <Button variant="tertiary" onClick={() => handleDescartar(req)}>
                  Descartar
                </Button>
              </Stack>
            </Box>
          ))}
      </Stack>
    </>
  );
};

export default SolicitudesTab;
