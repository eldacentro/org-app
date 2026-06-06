import { useMemo, useState } from 'react';
import { Box, Stack, Grid, Tabs, Tab, Badge } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconAdd, IconMapOverview, IconCustom } from '@components/icons';
import Accordion from '@components/accordion';
import {
  territoriesState,
  territoryZonesSortedState,
  territoryAssignedIdsState,
  territoryPendingRequestsState,
  territoryTagsState,
} from '@states/territories';
import { Territory, TerritoryAssignment, TerritoryRequest, TerritoryZone, TerritoryTag } from '@definition/territories';
import { territoryLabel } from '@services/app/territories';
import AsignacionesTab from './AsignacionesTab';
import SolicitudesTab from './SolicitudesTab';
import EstadisticasTab from './EstadisticasTab';
import ConfiguracionTab from './ConfiguracionTab';
import CampanasTab from './CampanasTab';
import ImportExportTab from './ImportExportTab';

type Props = {
  onView: (t: Territory) => void;
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
  onAsignarParaSolicitud: (req: TerritoryRequest) => void;
  onAsignarCampana: (t: Territory, campaignId: string) => void;
  onOpenZonas: () => void;
  onOpenEtiquetas: () => void;
  onOpenImport: () => void;
};

type ZoneSectionProps = {
  zone: TerritoryZone;
  items: Territory[];
  assignedIds: Set<string>;
  tags: TerritoryTag[];
  onView: (t: Territory) => void;
};

const ZoneSection = ({ zone, items, assignedIds, tags, onView }: ZoneSectionProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const label = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
      <Box
        sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: zone.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}
      />
      <Typography variant="h6" sx={{ color: 'var(--ink)', fontWeight: 600, fontSize: '1.1rem' }}>
        {zone.nombre}
      </Typography>
      <Box sx={{ backgroundColor: 'var(--accent-150)', px: 1.5, py: 0.5, borderRadius: '24px' }}>
        <Typography variant="caption" sx={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: '0.85rem' }}>
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
              return (
                <Grid size={{ mobile: 6, tablet600: 4, laptop: 3 }} key={t.id}>
                  <Box
                    onClick={() => onView(t)}
                    className="active-press"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      border: '1px solid var(--line)',
                      borderLeft: `5px solid ${zone.color}`,
                      cursor: 'pointer',
                      backgroundColor: 'var(--card)',
                      boxShadow: 'var(--small-card-shadow)',
                      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                      '&:hover': {
                        boxShadow: 'var(--hover-shadow)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 500, mb: 1 }}>
                      {territoryLabel(t)}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: '12px',
                          backgroundColor: assigned ? 'var(--orange-secondary)' : 'var(--green-secondary)',
                          color: assigned ? 'var(--orange-dark)' : 'var(--green-main)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          border: `1px solid ${assigned ? 'var(--orange-main)' : 'var(--green-main)'}33`
                        }}
                      >
                        {assigned ? 'Asignado' : 'Libre'}
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
  onOpenZonas,
  onOpenEtiquetas,
  onOpenImport,
}: Props) => {
  const zones = useAtomValue(territoryZonesSortedState);
  const tags = useAtomValue(territoryTagsState);
  const territories = useAtomValue(territoriesState);
  const assignedIds = useAtomValue(territoryAssignedIdsState);
  const pending = useAtomValue(territoryPendingRequestsState);
  const [tab, setTab] = useState(0);

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
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: '1px solid var(--line)',
          mb: 3,
          '& .MuiTabs-indicator': {
            borderRadius: '2px 2px 0 0',
          },
          '& .MuiTab-root': {
            minHeight: '48px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '15px',
            transition: 'color 0.2s ease-in-out',
          },
        }}
      >
        <Tab label="Territorios" />
        <Tab label="Asignaciones" />
        <Tab
          label={
            <Badge badgeContent={pending.length} color="primary">
              <span style={{ paddingRight: pending.length ? 12 : 0 }}>Solicitudes</span>
            </Badge>
          }
        />
        <Tab label="Estadísticas" />
        <Tab label="Campañas" />
        <Tab label="Importar/Exportar" />
        <Tab label="Configuración" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

          {territories.length === 0 && (
            <Typography variant="body2" color="var(--ink-2)">
              Aún no hay territorios. Crea una zona e importa tu archivo KML.
            </Typography>
          )}

          {byZone.map(({ zone, items }) => (
            <ZoneSection
              key={zone.id}
              zone={zone}
              items={items}
              assignedIds={assignedIds}
              tags={tags}
              onView={onView}
            />
          ))}
        </Box>
      )}

      {tab === 1 && (
        <AsignacionesTab onView={onView} onAsignar={onAsignar} onEntregar={onEntregar} />
      )}
      {tab === 2 && (
        <SolicitudesTab onAsignarParaSolicitud={onAsignarParaSolicitud} />
      )}
      {tab === 3 && <EstadisticasTab onAsignar={onAsignar} onEntregar={onEntregar} />}
      {tab === 4 && <CampanasTab onAsignarCampana={onAsignarCampana} />}
      {tab === 5 && <ImportExportTab />}
      {tab === 6 && <ConfiguracionTab />}
    </Box>
  );
};

export default ResponsablesPanel;
