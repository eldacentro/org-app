import { useMemo, useState } from 'react';
import { Box, Collapse, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { useConfirm } from '@components/confirm_dialog';
import { congIDState, userLocalUIDState } from '@states/settings';
import Badge from '@components/badge';
import { IconChevronRight } from '@components/icons';
import { TagChip, NotaPeticion } from '@features/territories/ui';
import {
  territoriesState,
  territoryCampaignsState,
  territoryZonesSortedState,
  territoryPendingRequestsState,
  territoryRequestsState,
  territoriesLoadingState,
} from '@states/territories';
import { TerritoryRequest } from '@definition/territories';
import { atenderRequest } from '@services/firebase/territories';
import { formatTerritoryDate, territoryLabel } from '@services/app/territories';
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
  const todas = useAtomValue(territoryRequestsState);
  const campaigns = useAtomValue(territoryCampaignsState);
  const zonas = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [verPasadas, setVerPasadas] = useState(false);

  /**
   * Las ya cerradas, de la más reciente a la más antigua.
   *
   * Se guardan siempre (atender una solicitud la marca, no la borra), pero
   * hasta ahora no se veían por ningún sitio: en cuanto alguien la atendía
   * desaparecía de la pantalla y no quedaba forma de comprobar qué se había
   * hecho con ella ni quién.
   */
  const pasadas = useMemo(
    () =>
      todas
        .filter((r) => r.atendidaPor)
        .sort((a, b) =>
          (b.atendidaAt ?? b.createdAt).localeCompare(
            a.atendidaAt ?? a.createdAt
          )
        ),
    [todas]
  );

  // Un puñado basta: esto es para comprobar lo de estos días, no un archivo.
  const pasadasVisibles = pasadas.slice(0, 15);

  const handleDescartar = async (req: TerritoryRequest) => {
    const ok = await confirm({
      message: '¿Descartar esta solicitud sin asignar territorio?',
      confirmLabel: 'Descartar',
      destructive: true,
    });
    if (ok && uid) await atenderRequest(congId, req.id, uid, 'descartada');
  };

  /**
   * Las solicitudes ya cerradas, plegadas.
   *
   * Discreto a propósito: esto no es trabajo pendiente, es para mirar atrás
   * de vez en cuando. Cerrado no ocupa más que una línea, y quien no lo
   * necesite no lo ve.
   */
  const bloquePasadas = pasadas.length > 0 && (
    <Box sx={{ mt: pending.length > 0 ? 3 : 0 }}>
      <Button
        variant="small"
        disableAutoStretch
        onClick={() => setVerPasadas((v) => !v)}
        startIcon={
          // El mismo chevrón, girado: es el gesto de "esto se despliega" que
          // usa el resto de la app. El giro va en una caja porque el
          // componente de icono solo acepta color y medidas.
          <Box
            sx={{
              display: 'flex',
              transform: verPasadas ? 'rotate(90deg)' : 'none',
              transition: 'transform var(--motion-fast) var(--ease-standard)',
            }}
          >
            <IconChevronRight
              color="var(--accent-dark)"
              width={18}
              height={18}
            />
          </Box>
        }
      >
        {`Solicitudes atendidas (${pasadas.length})`}
      </Button>

      <Collapse in={verPasadas} unmountOnExit>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {pasadasVisibles.map((req) => {
            const asignada = req.atendidaComo === 'asignada';
            const descartada = req.atendidaComo === 'descartada';
            const campana = campaigns.find((c) => c.id === req.campaignId);
            const zona = zonas.find((z) => z.id === req.zoneId);

            return (
              <TerritoryCard
                key={req.id}
                // Atenuadas: son historia, no tienen que competir con lo que
                // sí está esperando arriba.
                // Verde SOLO si consta que se le dio territorio. Sin el dato
                // —las cerradas antes de que se guardara— va en gris: no se
                // sabe qué pasó, y pintarlas de verde diría que sí se asignó.
                accent={asignada ? 'var(--green-main)' : 'var(--grey-400)'}
                sx={{ padding: '12px 16px' }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                >
                  <Typography
                    className="body-small-semibold"
                    color="var(--ink)"
                  >
                    {resolveName(req.personUid)}
                  </Typography>
                  <Badge
                    size="small"
                    color={asignada ? 'green' : 'grey'}
                    text={
                      asignada
                        ? 'Se le asignó'
                        : descartada
                          ? 'Descartada'
                          : // Las cerradas antes de que se guardara el cómo.
                            'Atendida'
                    }
                  />
                  {campana && (
                    <Badge size="small" color="accent" text={campana.nombre} />
                  )}
                  {zona && <TagChip label={zona.nombre} color={zona.color} />}
                </Stack>

                <Typography
                  className="label-small-regular"
                  color="var(--ink-3)"
                >
                  Pidió el{' '}
                  {formatTerritoryDate(req.createdAt, settings.dateFormat)}
                  {req.atendidaAt && (
                    <>
                      {' · '}
                      {descartada ? 'Descartada' : 'Atendida'} por{' '}
                      {resolveName(req.atendidaPor!)} el{' '}
                      {formatTerritoryDate(req.atendidaAt, settings.dateFormat)}
                    </>
                  )}
                </Typography>

                {req.nota && (
                  <Box sx={{ mt: 0.5 }}>
                    <NotaPeticion nota={req.nota} variant="discreta" />
                  </Box>
                )}

                {/* Y QUÉ se le dio. Con la zona delante, que es lo que se
                    compara con la que pidió: "quería Salinas y se le dio un
                    rural" es la conversación que esta lista tiene que
                    permitir tener. */}
                {req.territoriosAsignados &&
                  req.territoriosAsignados.length > 0 && (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                      sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: '4px' }}
                    >
                      <Typography
                        className="label-small-regular"
                        color="var(--ink-3)"
                      >
                        Se le dio:
                      </Typography>
                      {req.territoriosAsignados.map((id) => {
                        const t = territories.find((x) => x.id === id);
                        if (!t) return null;
                        const z = zonas.find((x) => x.id === t.zoneId);
                        return (
                          <TagChip
                            key={id}
                            label={`${z?.nombre ?? ''} ${territoryLabel(t)}`.trim()}
                            color={z?.color ?? 'var(--grey-400)'}
                          />
                        );
                      })}
                    </Stack>
                  )}
              </TerritoryCard>
            );
          })}

          {pasadas.length > pasadasVisibles.length && (
            <Typography className="label-small-regular" color="var(--ink-3)">
              Se muestran las {pasadasVisibles.length} más recientes de{' '}
              {pasadas.length}.
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  );

  if (pending.length === 0) {
    return (
      <>
        {ConfirmDialogNode}
        <Typography className="body-small-regular" color="var(--ink-2)">
          {loading
            ? 'Cargando solicitudes…'
            : 'No hay solicitudes de territorio pendientes.'}
        </Typography>
        {bloquePasadas}
      </>
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
                    {/* Y de qué zona lo prefiere, en el color de esa zona.
                        Es lo primero que se mira al decidir qué darle, y el
                        asignador ya se abre por ahí. */}
                    {(() => {
                      const z = zonas.find((x) => x.id === req.zoneId);
                      return z ? (
                        <TagChip label={z.nombre} color={z.color} />
                      ) : null;
                    })()}
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
                  {req.nota && <NotaPeticion nota={req.nota} />}
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

      {bloquePasadas}
    </>
  );
};

export default SolicitudesTab;
