import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { useConfirm } from '@components/confirm_dialog';
import { congIDState, userLocalUIDState } from '@states/settings';
import Badge from '@components/badge';
import {
  territoryCampaignsState,
  territoryPendingRequestsState,
  territoriesLoadingState,
} from '@states/territories';
import { TerritoryRequest } from '@definition/territories';
import { atenderRequest } from '@services/firebase/territories';
import { formatTerritoryDate } from '@services/app/territories';
import { territorySettingsState } from '@states/territories';
import { usePersonName } from '@features/territories/usePersonName';
import { TerritoryCard } from '@features/territories/ui';

type Props = {
  /** Abre el asignador preseleccionando al solicitante y marcando la solicitud
   *  como atendida tras asignar. */
  onAsignarParaSolicitud: (req: TerritoryRequest) => void;
};

const SolicitudesTab = ({ onAsignarParaSolicitud }: Props) => {
  const congId = useAtomValue(congIDState);
  const loading = useAtomValue(territoriesLoadingState);
  const uid = useAtomValue(userLocalUIDState);
  const pending = useAtomValue(territoryPendingRequestsState);
  const campaigns = useAtomValue(territoryCampaignsState);
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
      <Typography className="body-small-regular" color="var(--ink-2)">
        {loading
          ? 'Cargando solicitudes…'
          : 'No hay solicitudes de territorio pendientes.'}
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
            <TerritoryCard key={req.id} accent="var(--accent-main)">
              <Stack
                direction={{ mobile: 'column', tablet600: 'row' }}
                alignItems={{ mobile: 'stretch', tablet600: 'center' }}
                spacing={2}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                  >
                    <Typography
                      className="body-regular-semibold"
                      color="var(--ink)"
                    >
                      {resolveName(req.personUid)} pidió un territorio
                    </Typography>
                    {/* Para qué lo pidió. Se sabe ANTES de abrir el asignador
                        —que ya se abre acotado a esa campaña— porque cambia lo
                        que hay que darle. */}
                    {req.campaignId && (
                      <Badge
                        size="small"
                        color="accent"
                        text={
                          campaigns.find((c) => c.id === req.campaignId)
                            ?.nombre ?? 'Campaña'
                        }
                      />
                    )}
                  </Stack>
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-3)"
                  >
                    {formatTerritoryDate(req.createdAt, settings.dateFormat)}
                  </Typography>
                  {/* La nota del hermano es lo único que ayuda a decidir qué
                      territorio darle, y estaba con el mismo peso que la
                      fecha. Va entrecomillada y sobre su propio fondo para
                      que se lea como una cita suya, no como texto de la app. */}
                  {req.nota && (
                    <Typography
                      className="body-small-regular"
                      color="var(--ink)"
                      sx={{
                        mt: 1,
                        // Se ajusta al texto: como bloque ocupaba los ochocientos
                        // píxeles de la columna y una frase de diez palabras
                        // quedaba flotando en una franja larguísima.
                        display: 'inline-block',
                        padding: '8px 12px',
                        borderRadius: 'var(--shape-sm)',
                        backgroundColor: 'var(--accent-100)',
                        fontStyle: 'italic',
                      }}
                    >
                      &laquo;{req.nota}&raquo;
                    </Typography>
                  )}
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexShrink: 0, alignItems: 'center' }}
                >
                  <Button
                    variant="main"
                    disableAutoStretch
                    onClick={() => onAsignarParaSolicitud(req)}
                  >
                    Asignar territorio
                  </Button>
                  <Button
                    variant="tertiary"
                    disableAutoStretch
                    onClick={() => handleDescartar(req)}
                  >
                    Descartar
                  </Button>
                </Stack>
              </Stack>
            </TerritoryCard>
          ))}
      </Stack>
    </>
  );
};

export default SolicitudesTab;
