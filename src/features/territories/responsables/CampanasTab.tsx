import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack, Collapse } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconDelete } from '@components/icons';
import { congIDState, congMasterKeyState } from '@states/settings';
import {
  territoriesState,
  territoryCampaignsState,
  territoryAssignmentsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryCampaign } from '@definition/territories';
import {
  saveCampaign,
  deleteCampaign,
  saveAssignment,
  saveTerritory,
} from '@services/firebase/territories';
import { formatTerritoryDate, territoryLabel } from '@services/app/territories';
import { territorySettingsState } from '@states/territories';
import DialogCrearCampana from './DialogCrearCampana';
import DialogSeleccionarTerritorios from './DialogSeleccionarTerritorios';
import { displaySnackNotification } from '@services/states/app';

type Props = {
  onAsignarCampana: (territory: Territory, campaignId: string) => void;
};

const estadoColor: Record<string, string> = {
  activa: 'var(--green-main)',
  planificada: 'var(--blue-main)',
  pasada: 'var(--ink-2)',
};

const CampanasTab = ({ onAsignarCampana }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const campaigns = useAtomValue(territoryCampaignsState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);

  const [openCrear, setOpenCrear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<TerritoryCampaign | null>(null);
  const { confirm, ConfirmDialogNode } = useConfirm();

  // Para cada territorio, fecha desde la que está libre (la `returnedAt` de
  // su asignación más reciente) — para mostrar "Sin asignar desde" al
  // elegir territorios para una campaña. `null` si nunca se ha asignado.
  const unassignedSince = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of territories) {
      const last = assignments
        .filter((a) => a.territoryId === t.id)
        .sort(
          (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
        )[0];
      map.set(t.id, last?.returnedAt ?? null);
    }
    return map;
  }, [territories, assignments]);

  // IDs de campañas cuyo cierre automático ya está en vuelo — evita escrituras
  // duplicadas cuando onSnapshot dispara en ráfaga antes de que el estado se
  // actualice a 'pasada' en Firestore.
  const closingRef = useRef(new Set<string>());

  const closeCampaign = useCallback(
    async (c: TerritoryCampaign) => {
      const key = masterKey ?? '';
      const now = new Date().toISOString();
      const open = assignments.filter((a) => a.campaignId === c.id && !a.returnedAt);

      // Escribir todas las asignaciones y territorios en paralelo para evitar
      // fallos parciales por tiempo de espera y límites de escritura por segundo.
      await Promise.all(
        open.flatMap((a) => {
          const ops: Promise<void>[] = [
            saveAssignment(
              congId,
              { ...a, returnedAt: c.fechaFin, status: 'trabajado', updatedAt: now },
              key
            ),
          ];
          const t = territories.find((x) => x.id === a.territoryId);
          if (t) {
            ops.push(
              saveTerritory(
                congId,
                { ...t, lastWorkedAt: c.fechaFin, updatedAt: now },
                key
              )
            );
          }
          return ops;
        })
      );

      await saveCampaign(congId, { ...c, estado: 'pasada', updatedAt: now });
    },
    [assignments, territories, congId, masterKey]
  );

  // Auto-cierre de campañas terminadas (fechaFin pasada y aún no 'pasada').
  // El Set `closingRef` evita que un burst de snapshots lance el cierre varias
  // veces sobre la misma campaña antes de que Firestore actualice el estado.
  useEffect(() => {
    const now = new Date();
    campaigns
      .filter(
        (c) =>
          c.estado !== 'pasada' &&
          new Date(c.fechaFin) < now &&
          !closingRef.current.has(c.id)
      )
      .forEach((c) => {
        closingRef.current.add(c.id);
        closeCampaign(c)
          .catch(console.error)
          .finally(() => closingRef.current.delete(c.id));
      });
  }, [campaigns, closeCampaign]);

  const sorted = useMemo(() => {
    const order = { activa: 0, planificada: 1, pasada: 2 } as const;
    return [...campaigns].sort(
      (a, b) =>
        order[a.estado] - order[b.estado] ||
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
    );
  }, [campaigns]);

  const handleAddTerritories = async (c: TerritoryCampaign, territoryIds: string[]) => {
    const newIds = territoryIds.filter((id) => !c.territoryIds.includes(id));
    if (newIds.length === 0) return;
    try {
      await saveCampaign(congId, {
        ...c,
        territoryIds: [...c.territoryIds, ...newIds],
        updatedAt: new Date().toISOString(),
      });
      displaySnackNotification({
        severity: 'success',
        header: 'Territorios añadidos',
        message: `${newIds.length} territorio(s) añadido(s) a "${c.nombre}".`,
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudieron añadir los territorios a la campaña.' });
    }
  };

  const handleRemoveTerritory = async (c: TerritoryCampaign, territoryId: string) => {
    try {
      await saveCampaign(congId, {
        ...c,
        territoryIds: c.territoryIds.filter((id) => id !== territoryId),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo quitar el territorio de la campaña.' });
    }
  };

  const handleFinalizeCampaign = async (c: TerritoryCampaign) => {
    const ok = await confirm({
      title: 'Finalizar campaña',
      message: `¿Finalizar la campaña "${c.nombre}"? Se devolverán todos los territorios abiertos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Finalizar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await closeCampaign(c);
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo finalizar la campaña.' });
    }
  };

  const handleDelete = async (c: TerritoryCampaign) => {
    const ok = await confirm({
      title: 'Borrar campaña',
      message: `¿Borrar la campaña "${c.nombre}"? Esto también borra sus registros de asignación del S-13. No se debe hacer sin permiso del superintendente de servicio.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCampaign(congId, c.id);
      displaySnackNotification({ severity: 'success', header: 'Campaña eliminada', message: `La campaña "${c.nombre}" ha sido eliminada.` });
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo eliminar la campaña.' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}
      <Box>
        <Button variant="main" onClick={() => setOpenCrear(true)} disableAutoStretch>
          Crear campaña
        </Button>
      </Box>

      {sorted.length === 0 && (
        <Typography variant="body2" color="var(--ink-2)">
          No hay campañas. Crea una para empezar.
        </Typography>
      )}

      {sorted.map((c) => {
        const campTerritories = c.territoryIds
          .map((id) => territories.find((t) => t.id === id))
          .filter((t): t is Territory => Boolean(t));
        const isOpen = expanded === c.id;
        const addable = territories.filter((t) => !c.territoryIds.includes(t.id));

        return (
          <Box
            key={c.id}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '1px solid var(--line)',
              borderLeft: `5px solid ${estadoColor[c.estado]}`,
              backgroundColor: 'var(--card)',
              boxShadow: 'var(--small-card-shadow)',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              '&:hover': {
                boxShadow: 'var(--hover-shadow)'
              }
            }}
          >
            <Stack direction={{ mobile: 'column', tablet600: 'row' }} alignItems={{ mobile: 'flex-start', tablet600: 'center' }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                    {c.nombre}
                  </Typography>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: '12px',
                      backgroundColor: `${estadoColor[c.estado]}1A`,
                      color: estadoColor[c.estado],
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      border: `1px solid ${estadoColor[c.estado]}33`,
                      textTransform: 'capitalize'
                    }}
                  >
                    {c.estado}
                  </Box>
                </Stack>
                <Typography variant="caption" color="var(--ink-2)">
                  {formatTerritoryDate(c.fechaInicio, settings.dateFormat)} →{' '}
                  {formatTerritoryDate(c.fechaFin, settings.dateFormat)} ·{' '}
                  <span style={{ color: 'var(--ink)' }}>{c.territoryIds.length} territorios</span>
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="small"
                  disableAutoStretch
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {isOpen ? 'Cerrar' : 'Gestionar'}
                </Button>
                {c.estado === 'activa' && (
                  <Button variant="small" color="orange" disableAutoStretch onClick={() => handleFinalizeCampaign(c)}>
                    Finalizar
                  </Button>
                )}
                <Button
                  variant="small"
                  disableAutoStretch
                  onClick={() => handleDelete(c)}
                  ariaLabel="Borrar campaña"
                >
                  <IconDelete color="var(--red-main)" width={20} height={20} />
                </Button>
              </Stack>
            </Stack>

            <Collapse in={isOpen}>
              <Box sx={{ mt: 2 }}>
                {c.estado !== 'pasada' && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => setSelectingFor(c)}
                      disabled={addable.length === 0}
                    >
                      Añadir territorios
                    </Button>
                  </Box>
                )}

                <Stack spacing={1}>
                  {campTerritories.length === 0 ? (
                    <Typography variant="caption" color="var(--ink-2)">
                      Sin territorios en la campaña.
                    </Typography>
                  ) : (
                    campTerritories.map((t) => {
                      const open = assignments.some(
                        (a) =>
                          a.campaignId === c.id &&
                          a.territoryId === t.id &&
                          !a.returnedAt
                      );
                      return (
                        <Stack
                          key={t.id}
                          direction={{ mobile: 'column', tablet600: 'row' }}
                          alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                          justifyContent="space-between"
                          spacing={1}
                          sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            backgroundColor: open ? 'var(--orange-secondary)' : 'transparent',
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ color: 'var(--ink)', fontWeight: 500 }}>
                              {territoryLabel(t)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: open
                                  ? 'var(--orange-dark)'
                                  : 'var(--ink-2)',
                              }}
                            >
                              {open ? 'Asignado (campaña)' : 'Libre en campaña'}
                              {t.lastWorkedAt
                                ? ` · últ. ${formatTerritoryDate(t.lastWorkedAt, settings.dateFormat)}`
                                : ' · nunca trabajado'}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            {c.estado !== 'pasada' && !open && (
                              <Button
                                variant="small"
                                disableAutoStretch
                                onClick={() => onAsignarCampana(t, c.id)}
                              >
                                Asignar
                              </Button>
                            )}
                            {c.estado !== 'pasada' && (
                              <Button
                                variant="small"
                                color="orange"
                                disableAutoStretch
                                onClick={() => handleRemoveTerritory(c, t.id)}
                              >
                                Quitar
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        );
      })}

      <DialogCrearCampana open={openCrear} onClose={() => setOpenCrear(false)} />

      <DialogSeleccionarTerritorios
        open={!!selectingFor}
        onClose={() => setSelectingFor(null)}
        territories={
          selectingFor
            ? territories.filter((t) => !selectingFor.territoryIds.includes(t.id))
            : []
        }
        zones={zones}
        unassignedSince={unassignedSince}
        dateFormat={settings.dateFormat}
        onConfirm={(ids) => {
          if (selectingFor) handleAddTerritories(selectingFor, ids);
        }}
      />
    </Box>
  );
};

export default CampanasTab;
