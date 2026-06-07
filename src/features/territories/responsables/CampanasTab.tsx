import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Autocomplete, Box, Stack, Collapse, TextField as MuiTextField } from '@mui/material';
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
import {
  formatTerritoryDate,
  getZoneName,
  territoryLabel,
} from '@services/app/territories';
import { territorySettingsState } from '@states/territories';
import DialogCrearCampana from './DialogCrearCampana';

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
  const { confirm, ConfirmDialogNode } = useConfirm();

  // IDs de campañas cuyo cierre automático ya está en vuelo — evita escrituras
  // duplicadas cuando onSnapshot dispara en ráfaga antes de que el estado se
  // actualice a 'pasada' en Firestore.
  const closingRef = useRef(new Set<string>());

  const closeCampaign = useCallback(
    async (c: TerritoryCampaign) => {
      const key = masterKey ?? '';
      const open = assignments.filter(
        (a) => a.campaignId === c.id && !a.returnedAt
      );
      for (const a of open) {
        await saveAssignment(
          congId,
          { ...a, returnedAt: c.fechaFin, status: 'trabajado', updatedAt: new Date().toISOString() },
          key
        );
        const t = territories.find((x) => x.id === a.territoryId);
        if (t) {
          await saveTerritory(
            congId,
            { ...t, lastWorkedAt: c.fechaFin, updatedAt: new Date().toISOString() },
            key
          );
        }
      }
      await saveCampaign(congId, {
        ...c,
        estado: 'pasada',
        updatedAt: new Date().toISOString(),
      });
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

  const handleAddTerritory = async (c: TerritoryCampaign, territoryId: string) => {
    if (c.territoryIds.includes(territoryId)) return;
    await saveCampaign(congId, {
      ...c,
      territoryIds: [...c.territoryIds, territoryId],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveTerritory = async (c: TerritoryCampaign, territoryId: string) => {
    await saveCampaign(congId, {
      ...c,
      territoryIds: c.territoryIds.filter((id) => id !== territoryId),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDelete = async (c: TerritoryCampaign) => {
    const ok = await confirm({
      title: 'Borrar campaña',
      message: `¿Borrar la campaña "${c.nombre}"? Esto también borra sus registros de asignación del S-13. No se debe hacer sin permiso del superintendente de servicio.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) await deleteCampaign(congId, c.id);
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
              <Stack direction="row" spacing={1}>
                <Button
                  variant="small"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {isOpen ? 'Cerrar' : 'Gestionar'}
                </Button>
                {c.estado !== 'pasada' && (
                  <Button variant="small" onClick={() => closeCampaign(c)}>
                    Finalizar
                  </Button>
                )}
                <Button
                  variant="small"
                  onClick={() => handleDelete(c)}
                  ariaLabel="Borrar campaña"
                >
                  <IconDelete color="var(--red-main)" width={16} height={16} />
                </Button>
              </Stack>
            </Stack>

            <Collapse in={isOpen}>
              <Box sx={{ mt: 2 }}>
                {c.estado !== 'pasada' && (
                  <Autocomplete
                    options={addable.map((t) => ({
                      id: t.id,
                      label: `${territoryLabel(t)} · ${getZoneName(t.zoneId, zones)}`,
                    }))}
                    value={null}
                    blurOnSelect
                    clearOnBlur
                    onChange={(_, v) => v && handleAddTerritory(c, v.id)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    renderInput={(params) => (
                      <MuiTextField
                        {...params}
                        label="Añadir territorio a la campaña"
                        size="small"
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
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
                          <Stack direction="row" spacing={1}>
                            {c.estado !== 'pasada' && !open && (
                              <Button
                                variant="small"
                                onClick={() => onAsignarCampana(t, c.id)}
                              >
                                Asignar
                              </Button>
                            )}
                            {c.estado !== 'pasada' && (
                              <Button
                                variant="small"
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
    </Box>
  );
};

export default CampanasTab;
