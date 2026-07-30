import { useMemo, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack, Collapse } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import { IconDelete } from '@components/icons';
import { TerritoryCard } from '@features/territories/ui';
import { congIDState } from '@states/settings';
import {
  territoriesState,
  territoryCampaignsState,
  territoryAssignmentsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryAssignment, TerritoryCampaign } from '@definition/territories';
import {
  addCampaignTerritories,
  removeCampaignTerritory,
  deleteCampaign,
  closeCampaign,
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
  planificada: 'var(--accent-main)',
  pasada: 'var(--grey-400)',
};

/** El estado de la campaña, con la misma etiqueta que todo lo demás. Antes
 *  era una caja a medida que se pintaba mezclando el color con `1A` y `33`
 *  en hexadecimal — un truco que solo funciona si el color es un HEX
 *  literal, y `var(--ink-2)` no lo es: en las campañas pasadas el fondo
 *  salía transparente y el borde, invisible. */
const ESTADO_BADGE: Record<string, 'green' | 'accent' | 'grey'> = {
  activa: 'green',
  planificada: 'accent',
  pasada: 'grey',
};

const ESTADO_TEXTO: Record<string, string> = {
  activa: 'Activa',
  planificada: 'Planificada',
  pasada: 'Pasada',
};

const CampanasTab = ({ onAsignarCampana }: Props) => {
  const congId = useAtomValue(congIDState);
  const campaigns = useAtomValue(territoryCampaignsState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);

  const [openCrear, setOpenCrear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<TerritoryCampaign | null>(null);
  const { confirm, ConfirmDialogNode } = useConfirm();

  // Para cada territorio, determinamos su estado actual para mostrarlo
  // en el diálogo al elegir territorios para una campaña.
  const territoryStatusMap = useMemo(() => {
    const map = new Map<string, { status: 'assigned' | 'free' | 'never', date: string | null }>();
    for (const t of territories) {
      const isOpen = assignments.some((a) => a.territoryId === t.id && !a.returnedAt);
      if (isOpen) {
        map.set(t.id, { status: 'assigned', date: null });
      } else if (t.lastWorkedAt) {
        map.set(t.id, { status: 'free', date: t.lastWorkedAt });
      } else {
        map.set(t.id, { status: 'never', date: null });
      }
    }
    return map;
  }, [territories, assignments]);

  // El cierre (manual o automático al pasar fechaFin) vive centralizado en
  // services/firebase/territories.ts — el auto-cierre en sí corre en
  // useTerritories.tsx, para cualquier responsable con la app abierta, no
  // solo si tiene esta pestaña abierta. Aquí solo se usa para el botón
  // "Finalizar" manual.

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
      await addCampaignTerritories(congId, c.id, newIds);
      displaySnackNotification({
        severity: 'success',
        header: 'Territorios añadidos',
        message:
          newIds.length === 1
            ? `1 territorio añadido a "${c.nombre}".`
            : `${newIds.length} territorios añadidos a "${c.nombre}".`,
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudieron añadir los territorios a la campaña.' });
    }
  };

  const handleRemoveTerritory = async (c: TerritoryCampaign, territoryId: string) => {
    // Si el territorio está asignado dentro de esta campaña, quitarlo de la
    // lista lo dejaría asignado pero fuera de la campaña: nadie lo vería
    // aquí y el cierre de la campaña ya no lo devolvería. Hay que avisar.
    const openHere = assignments.some(
      (a) => a.campaignId === c.id && a.territoryId === territoryId && !a.returnedAt
    );
    if (openHere) {
      const t = territories.find((x) => x.id === territoryId);
      const ok = await confirm({
        title: 'Quitar territorio asignado',
        message: `${t ? territoryLabel(t) : 'Este territorio'} está asignado ahora mismo dentro de esta campaña. Si lo quitas, seguirá asignado pero ya no se devolverá al finalizar la campaña: tendrás que entregarlo a mano desde "Asignaciones". ¿Quitarlo igualmente?`,
        confirmLabel: 'Quitar',
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await removeCampaignTerritory(congId, c.id, territoryId);
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
      await closeCampaign(congId, c);
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
      await deleteCampaign(congId, c.id, territories);
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
        <Typography className="body-small-regular" color="var(--ink-2)">
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
          <TerritoryCard key={c.id} accent={estadoColor[c.estado]}>
            <Stack direction={{ mobile: 'column', tablet600: 'row' }} alignItems={{ mobile: 'flex-start', tablet600: 'center' }} justifyContent="space-between" spacing={1.5}>
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: '4px' }}
                >
                  <Typography className="body-regular-semibold" color="var(--ink)">
                    {c.nombre}
                  </Typography>
                  <Badge
                    size="small"
                    color={ESTADO_BADGE[c.estado]}
                    text={ESTADO_TEXTO[c.estado] ?? c.estado}
                  />
                </Stack>
                <Typography className="label-small-regular" color="var(--ink-2)">
                  {formatTerritoryDate(c.fechaInicio, settings.dateFormat)} →{' '}
                  {formatTerritoryDate(c.fechaFin, settings.dateFormat)} ·{' '}
                  <span style={{ color: 'var(--ink)' }}>
                    {c.territoryIds.length === 1
                      ? '1 territorio'
                      : `${c.territoryIds.length} territorios`}
                  </span>
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
                {/* También para las 'planificada': una campaña creada por
                    adelantado puede necesitar cerrarse antes de tiempo, y
                    antes el botón solo salía en las 'activa'. */}
                {c.estado !== 'pasada' && (
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
                    <Typography className="label-small-regular" color="var(--ink-2)">
                      Sin territorios en la campaña.
                    </Typography>
                  ) : (
                    campTerritories.map((t) => {
                      // Antes se usaba Territory.lastWorkedAt para mostrar la
                      // fecha de entrega — pero ese campo es del territorio
                      // (no de esta campaña en concreto) y no se actualiza si
                      // se devuelve "sin trabajar", así que una entrega
                      // individual dentro de la campaña podía no verse aquí
                      // en absoluto. Se busca en su lugar la asignación de
                      // ESTA campaña para ESTE territorio directamente.
                      const campaignAssignments = assignments
                        .filter((a) => a.campaignId === c.id && a.territoryId === t.id)
                        .sort(
                          (x, y) =>
                            new Date(y.assignedAt).getTime() - new Date(x.assignedAt).getTime()
                        );
                      const latest: TerritoryAssignment | undefined = campaignAssignments[0];
                      const open = Boolean(latest && !latest.returnedAt);
                      return (
                        <Stack
                          key={t.id}
                          direction={{ mobile: 'column', tablet600: 'row' }}
                          alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                          justifyContent="space-between"
                          spacing={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 'var(--shape-sm)',
                            border: '1px solid var(--line)',
                            backgroundColor: open ? 'var(--orange-secondary)' : 'transparent',
                          }}
                        >
                          <Box>
                            <Typography className="body-small-regular" sx={{ color: 'var(--ink)', fontWeight: 500 }}>
                              {territoryLabel(t)}
                            </Typography>
                            <Typography
                              className="label-small-regular"
                              sx={{
                                color: open
                                  ? 'var(--orange-dark)'
                                  : 'var(--ink-2)',
                              }}
                            >
                              {open
                                ? 'Asignado (campaña)'
                                : latest?.returnedAt
                                ? `Entregado el ${formatTerritoryDate(latest.returnedAt, settings.dateFormat)} (${
                                    latest.status === 'trabajado' ? 'trabajado' : 'sin trabajar'
                                  })`
                                : 'Sin asignar en esta campaña'}
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
          </TerritoryCard>
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
        territoryStatusMap={territoryStatusMap}
        dateFormat={settings.dateFormat}
        onConfirm={(ids) => {
          if (selectingFor) handleAddTerritories(selectingFor, ids);
        }}
      />
    </Box>
  );
};

export default CampanasTab;
