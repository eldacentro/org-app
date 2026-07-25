import { useMemo, useState } from 'react';
import { Box, Stack, Grid, Badge } from '@mui/material';
import ScrollableTabs from '@components/scrollable_tabs';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Checkbox from '@components/checkbox';
import { IconAdd, IconMapOverview, IconCustom } from '@components/icons';
import Accordion from '@components/accordion';
import {
  territoriesState,
  territoryZonesSortedState,
  territoryAssignedIdsState,
  territoryPendingRequestsState,
  territorySettingsState,
  territoryTagsState,
  territoriesLoadingState,
} from '@states/territories';
import { congIDState } from '@states/settings';
import { useConfirm } from '@components/confirm_dialog';
import { displaySnackNotification } from '@services/states/app';
import { deleteTerritoryCompleto } from '@services/firebase/territories';
import { Territory, TerritoryAssignment, TerritoryRequest, TerritoryZone, TerritoryTag } from '@definition/territories';
import { isInCooldown, territoryLabel } from '@services/app/territories';
import AsignacionesTab from './AsignacionesTab';
import SolicitudesTab from './SolicitudesTab';
import HistorialTab from './HistorialTab';
import EstadisticasTab from './EstadisticasTab';
import ConfiguracionTab from './ConfiguracionTab';
import CampanasTab from './CampanasTab';
import ImportExportTab from './ImportExportTab';
import TerritoriesOverviewMap from '../map/TerritoriesOverviewMap';

type Props = {
  onView: (t: Territory) => void;
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
  onAsignarParaSolicitud: (req: TerritoryRequest) => void;
  onAsignarCampana: (t: Territory, campaignId: string) => void;
  /** Asigna varios territorios de una vez al mismo publicador — usado desde
   *  la selección múltiple de la pestaña "Territorios", para no tener que
   *  asignar uno a uno durante una campaña grande. */
  onAsignarBulk: (territories: Territory[]) => void;
  /** Pestaña inicial. Se usa para abrir en "Solicitudes" cuando se entra
   *  desde la insignia roja del engranaje. */
  initialTab?: number;
  onOpenZonas: () => void;
  onOpenEtiquetas: () => void;
  onOpenImport: () => void;
};

type ZoneSectionProps = {
  zone: TerritoryZone;
  items: Territory[];
  assignedIds: Set<string>;
  daysUntilReassignable: number;
  tags: TerritoryTag[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onView: (t: Territory) => void;
};

const ZoneSection = ({ zone, items, assignedIds, daysUntilReassignable, tags, selectionMode, selectedIds, onToggleSelect, onView }: ZoneSectionProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const label = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
      <Box
        sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: zone.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}
      />
      <Typography className="h2" sx={{ color: 'var(--ink)', fontSize: '1.1rem' }}>
        {zone.nombre}
      </Typography>
      <Box sx={{ backgroundColor: 'var(--accent-150)', px: 1.5, py: 0.5, borderRadius: '24px' }}>
        <Typography className="label-small-semibold" sx={{ color: 'var(--ink-2)', fontSize: '0.85rem' }}>
          {items.length} territorios
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion
        id={zone.id}
        label={label}
        expanded={expanded}
        onChange={(val) => setExpanded(val !== false)}
        sx={{
          backgroundColor: 'var(--card)',
          borderRadius: '16px !important',
          border: '1px solid var(--line)',
          boxShadow: 'var(--small-card-shadow)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:before': { display: 'none' },
          '&:hover': {
            boxShadow: 'var(--hover-shadow)',
          },
        }}
        summaryProps={{
          sx: {
            p: 2,
            px: 2.5,
            minHeight: '64px !important',
            borderBottom: expanded ? '1px solid var(--line)' : 'none',
          }
        }}
        detailsProps={{
          sx: {
            pt: 2, pb: 1, pl: 2, pr: 2
          }
        }}
      >
        <Grid container spacing={1.5}>
            {items.map((t: Territory) => {
              const assigned = assignedIds.has(t.id);
              const resting = !assigned && isInCooldown(t, daysUntilReassignable);
              const selected = selectedIds.has(t.id);
              return (
                <Grid size={{ mobile: 6, tablet600: 4, laptop: 3 }} key={t.id}>
                  <Box
                    // Botón real: antes era un Box con onClick, así que no se
                    // podía abrir ningún territorio con el teclado y para un
                    // lector de pantalla era un div mudo.
                    component="button"
                    type="button"
                    aria-label={
                      selectionMode
                        ? `Seleccionar ${territoryLabel(t)}`
                        : `Ver ${territoryLabel(t)}`
                    }
                    aria-pressed={selectionMode ? selected : undefined}
                    onClick={() => selectionMode ? onToggleSelect(t.id) : onView(t)}
                    className="active-press"
                    sx={{
                      appearance: 'none',
                      font: 'inherit',
                      textAlign: 'left',
                      width: '100%',
                      '&:focus-visible': {
                        outline: '2px solid var(--accent-main)',
                        outlineOffset: '2px',
                      },
                      p: 2,
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--line)',
                      borderLeft: `5px solid ${zone.color}`,
                      cursor: 'pointer',
                      backgroundColor: selected ? 'var(--accent-150)' : 'var(--card)',
                      boxShadow: 'var(--small-card-shadow)',
                      transition: 'box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: 'var(--hover-shadow)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {selectionMode && (
                      <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                        {/* Decorativo: el estado real lo anuncia el
                            aria-pressed del botón que lo contiene. */}
                        <Box aria-hidden sx={{ pointerEvents: 'none' }}>
                          <Checkbox checked={selected} readOnly sx={{ p: 0.5 }} />
                        </Box>
                      </Box>
                    )}
                    <Typography className="body-regular" sx={{ color: 'var(--ink)', fontWeight: 500, mb: 1, pr: selectionMode ? 3 : 0 }}>
                      {territoryLabel(t)}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                      <Box
                        sx={
                          resting
                            ? {
                                px: 1,
                                py: 0.25,
                                borderRadius: 'var(--radius-xl)',
                                backgroundColor: 'var(--grey-100)',
                                color: 'var(--grey-600)',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                border: '1px solid var(--line)',
                              }
                            : {
                                px: 1,
                                py: 0.25,
                                borderRadius: 'var(--radius-xl)',
                                backgroundColor: assigned ? 'var(--orange-secondary)' : 'var(--green-secondary)',
                                color: assigned ? 'var(--orange-dark)' : 'var(--green-main)',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                border: `1px solid ${assigned ? 'var(--orange-main)' : 'var(--green-main)'}33`,
                              }
                        }
                      >
                        {resting ? 'En descanso' : assigned ? 'Asignado' : 'Libre'}
                      </Box>
                      
                      {/* Tags indicators */}
                      {t.tags && t.tags.length > 0 && (
                        <Stack direction="row" spacing={0.5}>
                          {t.tags.map((tagId) => {
                            const tag = tags.find((tt: TerritoryTag) => tt.id === tagId);
                            if (!tag) return null;
                            return (
                              <Box
                                key={tag.id}
                                title={tag.nombre}
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: tag.color,
                                }}
                              />
                            );
                          })}
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
      </Accordion>
    </Box>
  );
};

const ResponsablesPanel = ({
  onView,
  onAsignar,
  onEntregar,
  onAsignarParaSolicitud,
  onAsignarCampana,
  onAsignarBulk,
  initialTab,
  onOpenZonas,
  onOpenEtiquetas,
  onOpenImport,
}: Props) => {
  const congId = useAtomValue(congIDState);
  const loading = useAtomValue(territoriesLoadingState);

  const zones = useAtomValue(territoryZonesSortedState);
  const tags = useAtomValue(territoryTagsState);
  const territories = useAtomValue(territoriesState);
  const assignedIds = useAtomValue(territoryAssignedIdsState);
  const settings = useAtomValue(territorySettingsState);
  const pending = useAtomValue(territoryPendingRequestsState);
  // Si se entra con solicitudes pendientes, abrir directamente en
  // "Solicitudes" (pestaña 2). La insignia roja del engranaje solo se
  // enciende por eso, y antes te dejaba en "Estadísticas": había que
  // descubrir y deslizar hasta la tercera pestaña de nueve cada vez.
  const [tab, setTab] = useState(() => (initialTab ?? 0));

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAsignar = () => {
    if (selectedIds.size === 0) return;

    const selected = territories.filter((t) => selectedIds.has(t.id));
    const toAssign = selected.filter((t) => !assignedIds.has(t.id));
    const skipped = selected.length - toAssign.length;

    if (toAssign.length === 0) {
      displaySnackNotification({
        severity: 'error',
        header: 'Acción no permitida',
        message: 'Todos los territorios seleccionados ya están asignados.',
      });
      return;
    }

    if (skipped > 0) {
      // No 'success': la acción se completó SOLO A MEDIAS y en verde pasaba
      // desapercibido. La app solo tiene 'success' y 'error', así que se usa
      // 'error' — es lo que de verdad transmite "revisa esto".
      displaySnackNotification({
        severity: 'error',
        header: 'Algunos territorios se omitieron',
        message:
          skipped === 1
            ? '1 territorio ya estaba asignado y no se incluyó.'
            : `${skipped} territorios ya estaban asignados y no se incluyeron.`,
      });
    }

    onAsignarBulk(toAssign);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedArr = Array.from(selectedIds);
    // Filtrar los que tienen asignación abierta
    const toDelete = selectedArr.filter(id => !assignedIds.has(id));
    const skipped = selectedArr.length - toDelete.length;

    if (toDelete.length === 0) {
      displaySnackNotification({
        severity: 'error',
        header: 'Acción no permitida',
        message: 'Todos los territorios seleccionados están asignados. No se pueden borrar.',
      });
      return;
    }

    // La confirmación DEBE decir que se lleva el historial por delante:
    // borrar un territorio borra todas sus asignaciones (el registro del
    // S-13) y sus direcciones "No visitar". Antes solo hablaba del
    // territorio, así que quien limpiaba territorios obsoletos destruía
    // años de registro creyendo que solo borraba un polígono.
    let msg =
      toDelete.length === 1
        ? '¿Eliminar este territorio? Se borrarán también todo su historial de asignaciones (el registro del S-13) y sus direcciones de "No visitar". No se puede deshacer.'
        : `¿Eliminar estos ${toDelete.length} territorios? Se borrarán también todo su historial de asignaciones (el registro del S-13) y sus direcciones de "No visitar". No se puede deshacer.`;
    if (skipped > 0) {
      msg +=
        skipped === 1
          ? ' Se omitirá 1 territorio porque está asignado ahora mismo.'
          : ` Se omitirán ${skipped} territorios porque están asignados ahora mismo.`;
    }

    const ok = await confirm({
      message: msg,
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!ok) return;

    setDeleting(true);
    try {
      await Promise.all(toDelete.map(id => deleteTerritoryCompleto(congId, id)));
      displaySnackNotification({
        severity: 'success',
        header: 'Territorios eliminados',
        message:
          toDelete.length === 1
            ? 'Se ha eliminado 1 territorio correctamente.'
            : `Se han eliminado ${toDelete.length} territorios correctamente.`,
      });
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudieron eliminar todos los territorios.' });
    } finally {
      setDeleting(false);
    }
  };

  const byZone = useMemo(
    () =>
      zones.map((zone) => ({
        zone,
        items: territories
          .filter((t) => t.zoneId === zone.id)
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          ),
      })),
    [zones, territories]
  );

  return (
    <Box>
      {ConfirmDialogNode}
      <ScrollableTabs
        value={tab}
        onChange={setTab}
        indicatorMode
        tabs={[
          {
            label: 'Estadísticas',
            Component: (
              <EstadisticasTab onAsignar={onAsignar} onEntregar={onEntregar} />
            ),
          },
          {
            label: 'Asignaciones',
            Component: (
              <AsignacionesTab onView={onView} onAsignar={onAsignar} onEntregar={onEntregar} />
            ),
          },
          {
            label: (
              <Badge badgeContent={pending.length} color="primary">
                <span style={{ paddingRight: pending.length ? 12 : 0 }}>Solicitudes</span>
              </Badge>
            ),
            Component: (
              <SolicitudesTab onAsignarParaSolicitud={onAsignarParaSolicitud} />
            ),
          },
          {
            label: 'Historial',
            Component: <HistorialTab />,
          },
          {
            label: 'Territorios',
            Component: (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                  <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                    <Button variant="tertiary" onClick={onOpenZonas} disableAutoStretch>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconMapOverview width={18} height={18} /> Zonas
                      </Box>
                    </Button>
                    <Button variant="tertiary" onClick={onOpenEtiquetas} disableAutoStretch>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconCustom width={18} height={18} /> Etiquetas
                      </Box>
                    </Button>
                    <Button variant="main" onClick={onOpenImport} disableAutoStretch>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconAdd width={18} height={18} /> Importar KML
                      </Box>
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {selectionMode && selectedIds.size > 0 && (
                      <Button
                        variant="main"
                        disableAutoStretch
                        onClick={handleBulkAsignar}
                        disabled={deleting}
                      >
                        Asignar ({selectedIds.size})
                      </Button>
                    )}
                    {selectionMode && selectedIds.size > 0 && (
                      <Button
                        variant="tertiary"
                        disableAutoStretch
                        onClick={handleBulkDelete}
                        disabled={deleting}
                        sx={{ color: 'var(--red-main)', '&:hover': { backgroundColor: 'rgba(var(--red-main-base), 0.1)' } }}
                      >
                        Eliminar ({selectedIds.size})
                      </Button>
                    )}
                    <Button
                      variant={selectionMode ? 'main' : 'tertiary'}
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) setSelectedIds(new Set());
                      }}
                    >
                      {selectionMode ? 'Hecho' : 'Seleccionar'}
                    </Button>
                  </Stack>
                </Stack>

                {territories.length === 0 && (
                  <Typography className="body-small-regular" color="var(--ink-2)">
                    {loading
                      ? 'Cargando territorios…'
                      : 'Aún no hay territorios. Crea una zona e importa tu archivo KML.'}
                  </Typography>
                )}

                {byZone.map(({ zone, items }) => (
                  <ZoneSection
                    key={zone.id}
                    zone={zone}
                    items={items}
                    assignedIds={assignedIds}
                    daysUntilReassignable={settings.daysUntilReassignable}
                    tags={tags}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onView={onView}
                  />
                ))}
              </Box>
            ),
          },
          {
            label: 'Mapa',
            Component: <TerritoriesOverviewMap onViewTerritory={onView} />,
          },
          {
            label: 'Campañas',
            Component: <CampanasTab onAsignarCampana={onAsignarCampana} />,
          },
          {
            label: 'Importar/Exportar',
            Component: <ImportExportTab />,
          },
          {
            label: 'Configuración',
            Component: <ConfiguracionTab />,
          },
        ]}
      />
    </Box>
  );
};

export default ResponsablesPanel;
