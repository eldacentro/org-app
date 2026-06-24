import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import Typography from '@components/typography';
import Button from '@components/button';
import { IconClose } from '@components/icons';
import { Territory } from '@definition/territories';
import {
  territoriesState,
  territoryZonesState,
  territoryOpenAssignmentsState,
  territorySettingsState,
} from '@states/territories';
import {
  getZoneColor,
  getZoneName,
  geometryBounds,
  geometryCenter,
  formatTerritoryDate,
} from '@services/app/territories';
import { usePersonName } from '../usePersonName';

type Props = {
  onViewTerritory: (territory: Territory) => void;
};

const ASSIGNED_COLOR = '#F97316';
const FREE_COLOR = '#22C55E';

// Antes cada territorio pintaba su propio CircleMarker siempre, sin agrupar
// — con muchos territorios juntos (zoom alejado) se amontonaban en un lío de
// puntos indistinguibles y de paso pesaba más en móviles de gama baja.
// CircleMarker no es compatible con el agrupado de leaflet.markercluster (no
// es un L.Marker), así que se reconstruye el mismo punto como un ícono
// divIcon — visualmente idéntico — para poder agruparlo.
const dotIcon = (color: string) =>
  L.divIcon({
    className: 'territory-dot-icon',
    html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.15);"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

// ─── Encuadra el mapa para mostrar todos los territorios a la vez ───────────
const FitAll = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);
  return null;
};

// ─── Control de Zoom personalizado (estilo glass) ───────────────────────────
const CustomZoomControl = () => {
  const map = useMap();
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '0.5px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.13), inset 0 0.5px 0 rgba(255,255,255,0.9)',
      }}
    >
      <Box
        onClick={() => map.zoomIn()}
        sx={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 300,
          color: 'rgba(0,0,0,0.75)',
          borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          transition: 'background 0.15s ease',
          '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
        }}
      >
        +
      </Box>
      <Box
        onClick={() => map.zoomOut()}
        sx={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 300,
          color: 'rgba(0,0,0,0.75)',
          transition: 'background 0.15s ease',
          '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
        }}
      >
        −
      </Box>
    </Box>
  );
};

/**
 * Mapa con todos los territorios de la congregación a la vez, coloreados por
 * zona (relleno/borde del polígono) y por estado (punto central naranja =
 * asignado, verde = libre). Solo para responsables — la lista completa de
 * "quién tiene qué" no debe ser visible para publicadores normales.
 */
const TerritoriesOverviewMap = ({ onViewTerritory }: Props) => {
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [selected, setSelected] = useState<Territory | null>(null);

  const withGeometry = useMemo(
    () => territories.filter((t) => t.geometry),
    [territories]
  );

  const assignmentByTerritory = useMemo(() => {
    const map = new Map<string, (typeof openAssignments)[number]>();
    for (const a of openAssignments) {
      if (!a.isCampaign) map.set(a.territoryId, a);
    }
    return map;
  }, [openAssignments]);

  const overallBounds = useMemo(() => {
    let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
    let any = false;
    for (const t of withGeometry) {
      const b = t.geometry ? geometryBounds(t.geometry) : null;
      if (!b) continue;
      any = true;
      if (b[0][0] < south) south = b[0][0];
      if (b[0][1] < west) west = b[0][1];
      if (b[1][0] > north) north = b[1][0];
      if (b[1][1] > east) east = b[1][1];
    }
    return any ? ([[south, west], [north, east]] as LatLngBoundsExpression) : null;
  }, [withGeometry]);

  const selectedAssignment = selected ? assignmentByTerritory.get(selected.id) : undefined;

  if (withGeometry.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="var(--ink-2)">
          Todavía no hay territorios con geometría importada para mostrar en el mapa.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: { mobile: 'calc(100vh - 150px)', tablet600: '70vh' },
        borderRadius: 'var(--radius-l, 16px)',
        overflow: 'hidden',
        '& .leaflet-container': { height: '100%', width: '100%' },
      }}
    >
      <MapContainer center={[40.4168, -3.7038]} zoom={13} scrollWheelZoom zoomControl={false}>
        <CustomZoomControl />
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {withGeometry.map((t) => (
          <GeoJSON
            key={t.id}
            data={t.geometry!}
            style={{
              color: getZoneColor(t.zoneId, zones),
              weight: selected?.id === t.id ? 4 : 2,
              fillOpacity: assignmentByTerritory.has(t.id) ? 0.32 : 0.1,
            }}
            eventHandlers={{ click: () => setSelected(t) }}
          />
        ))}

        <MarkerClusterGroup
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {withGeometry.map((t) => {
            const center = t.geometry ? geometryCenter(t.geometry) : null;
            if (!center) return null;
            const assigned = assignmentByTerritory.has(t.id);
            return (
              <Marker
                key={`${t.id}-dot`}
                position={center}
                icon={dotIcon(assigned ? ASSIGNED_COLOR : FREE_COLOR)}
                eventHandlers={{ click: () => setSelected(t) }}
              />
            );
          })}
        </MarkerClusterGroup>

        <FitAll bounds={overallBounds} />
      </MapContainer>

      {/* Leyenda */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '10px',
          px: '12px',
          py: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <Stack direction="row" spacing={2}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: ASSIGNED_COLOR }} />
            <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)' }}>Asignado</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: FREE_COLOR }} />
            <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)' }}>Libre</Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Tarjeta del territorio seleccionado */}
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            zIndex: 1000,
            backgroundColor: 'var(--white)',
            borderRadius: '16px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
            p: '16px',
            borderLeft: `5px solid ${getZoneColor(selected.zoneId, zones)}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
                {selected.nombre ? `${selected.numero} — ${selected.nombre}` : selected.numero}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'var(--ink-2)' }}>
                {getZoneName(selected.zoneId, zones)}
              </Typography>
            </Box>
            <Box onClick={() => setSelected(null)} sx={{ cursor: 'pointer', p: '4px' }}>
              <IconClose width={16} height={16} />
            </Box>
          </Stack>

          <Box sx={{ mt: '10px' }}>
            {selectedAssignment ? (
              <Typography sx={{ fontSize: '13px', color: 'var(--ink)' }}>
                <strong>{resolveName(selectedAssignment.personUid)}</strong> · desde{' '}
                {formatTerritoryDate(selectedAssignment.assignedAt, settings.dateFormat)}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: '13px', color: FREE_COLOR, fontWeight: 600 }}>
                Libre — sin asignar
              </Typography>
            )}
          </Box>

          <Button
            variant="main"
            onClick={() => onViewTerritory(selected)}
            sx={{ width: '100%', mt: '12px', height: '40px' }}
          >
            Ver territorio completo
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TerritoriesOverviewMap;
