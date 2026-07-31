import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import Typography from '@components/typography';
import accentSurface from '@components/accent_surface';
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
  // Encuadra una sola vez, al tener geometría por primera vez. Antes se
  // reencuadraba cada vez que cambiaba la identidad del array de bounds, y
  // ese array se reconstruye con CADA snapshot de Firestore: bastaba con que
  // otro responsable asignara un territorio para que el mapa saltara al
  // encuadre general y te tirara el zoom y el desplazamiento que tenías.
  const done = useRef(false);
  useEffect(() => {
    if (!bounds || done.current) return;
    done.current = true;
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);
  return null;
};

// ─── Control de Zoom personalizado (estilo glass) ───────────────────────────
const zoomBtnSx = {
  appearance: 'none',
  border: 'none',
  background: 'none',
  padding: 0,
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '20px',
  fontWeight: 300,
  // Negro literal a propósito: estos controles van SOBRE las teselas del
  // mapa, que siempre son claras, no sobre el fondo del tema.
  color: 'rgba(0,0,0,0.75)',
  borderBottom: '0.5px solid rgba(0,0,0,0.1)',
  transition: 'background-color var(--motion-fast) var(--ease-standard)',
  '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
  '&:focus-visible': {
    outline: '2px solid var(--accent-main)',
    outlineOffset: '-2px',
  },
} as const;

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
        borderRadius: 'var(--shape-md)',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '0.5px solid rgba(255, 255, 255, 0.6)',
        boxShadow:
          '0 4px 20px rgba(0,0,0,0.13), inset 0 0.5px 0 rgba(255,255,255,0.9)',
      }}
    >
      {/* Botones de verdad, con nombre. Eran `<Box onClick>` con un "+" y un
          "−" escritos como texto: no se podía acercar el mapa con el teclado y
          un lector de pantalla no los anunciaba. El mapa de un territorio
          suelto (TerritoryMap) ya lo hacía bien; este se había quedado atrás. */}
      <Box
        component="button"
        type="button"
        onClick={() => map.zoomIn()}
        aria-label="Acercar"
        sx={zoomBtnSx}
      >
        <span aria-hidden="true">+</span>
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => map.zoomOut()}
        aria-label="Alejar"
        sx={{ ...zoomBtnSx, borderBottom: 'none' }}
      >
        <span aria-hidden="true">−</span>
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
    // Incluye las de campaña: un territorio ocupado por una campaña ESTÁ
    // ocupado. Excluyéndolas, el mapa los pintaba en verde como "Libre" en
    // plena campaña y un responsable que repartiera desde aquí asignaba
    // encima de otro hermano. Mismo arreglo que ya se hizo en Asignaciones
    // y en Estadísticas.
    const map = new Map<string, (typeof openAssignments)[number]>();
    for (const a of openAssignments) map.set(a.territoryId, a);
    return map;
  }, [openAssignments]);

  const overallBounds = useMemo(() => {
    let south = Infinity,
      west = Infinity,
      north = -Infinity,
      east = -Infinity;
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
    return any
      ? ([
          [south, west],
          [north, east],
        ] as LatLngBoundsExpression)
      : null;
  }, [withGeometry]);

  // Posición e icono se memorizan por territorio. Antes se creaban objetos
  // nuevos en CADA render, y react-leaflet llama entonces setLatLng/setIcon
  // en los 130 marcadores; dentro del agrupador, cada setLatLng provoca un
  // quitar+añadir capa completo. Un simple toque en el mapa disparaba ~260
  // operaciones de reagrupado y congelaba la interfaz en móviles normales.
  const markers = useMemo(() => {
    const out: { t: Territory; center: [number, number]; icon: L.DivIcon }[] =
      [];
    for (const t of withGeometry) {
      const center = t.geometry ? geometryCenter(t.geometry) : null;
      if (!center) continue;
      out.push({
        t,
        center,
        icon: dotIcon(
          assignmentByTerritory.has(t.id) ? ASSIGNED_COLOR : FREE_COLOR
        ),
      });
    }
    return out;
  }, [withGeometry, assignmentByTerritory]);

  const selectedAssignment = selected
    ? assignmentByTerritory.get(selected.id)
    : undefined;

  if (withGeometry.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="var(--ink-2)">
          Todavía no hay territorios con geometría importada para mostrar en el
          mapa.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        // `dvh` y no `vh`: en Safari de iOS, `100vh` es el viewport GRANDE —
        // el que habría si la barra de direcciones estuviera oculta—, así que
        // el mapa salía más alto que lo que se ve y su borde inferior quedaba
        // cortado por debajo de la pantalla. `dvh` sigue al viewport real.
        height: { mobile: 'calc(100dvh - 150px)', tablet600: '70vh' },
        borderRadius: 'var(--shape-sm)',
        overflow: 'hidden',
        '& .leaflet-container': { height: '100%', width: '100%' },
      }}
    >
      <MapContainer
        center={[40.4168, -3.7038]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
      >
        <CustomZoomControl />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {withGeometry.map((t) => (
          <GeoJSON
            // La prop `data` de react-leaflet NO es reactiva (su updateGeoJSON
            // solo atiende `style`), así que con una key fija el mapa seguía
            // pintando el polígono viejo tras editarlo, y el responsable creía
            // que no se había guardado. Incluyendo la geometría en la key, el
            // componente se remonta cuando de verdad cambia la forma.
            key={`${t.id}-${JSON.stringify(t.geometry)}`}
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
          {markers.map(({ t, center, icon }) => (
            <Marker
              key={`${t.id}-dot`}
              position={center}
              icon={icon}
              eventHandlers={{ click: () => setSelected(t) }}
            />
          ))}
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
          borderRadius: 'var(--shape-sm)',
          px: '12px',
          py: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <Stack direction="row" spacing={2}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: 'var(--shape-full)',
                backgroundColor: ASSIGNED_COLOR,
              }}
            />
            <Typography
              className="label-small-regular"
              sx={{ color: 'var(--ink-2)' }}
            >
              Asignado
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: 'var(--shape-full)',
                backgroundColor: FREE_COLOR,
              }}
            />
            <Typography
              className="label-small-regular"
              sx={{ color: 'var(--ink-2)' }}
            >
              Libre
            </Typography>
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
            borderRadius: 'var(--shape-lg)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
            padding: '16px',
            ...(accentSurface(getZoneColor(selected.zoneId, zones), {
              tint: false,
            }) as object),
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Typography
                className="body-regular-semibold"
                sx={{ color: 'var(--ink)' }}
              >
                {selected.nombre
                  ? `${selected.numero} — ${selected.nombre}`
                  : selected.numero}
              </Typography>
              <Typography
                className="body-small-regular"
                sx={{ color: 'var(--ink-2)' }}
              >
                {getZoneName(selected.zoneId, zones)}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
              sx={{
                appearance: 'none',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                p: '4px',
                color: 'inherit',
                display: 'flex',
                '&:focus-visible': {
                  outline: '2px solid var(--accent-main)',
                  outlineOffset: '2px',
                },
              }}
            >
              <IconClose width={16} height={16} />
            </Box>
          </Stack>

          <Box sx={{ mt: '10px' }}>
            {selectedAssignment ? (
              <Typography
                className="body-small-regular"
                sx={{ color: 'var(--ink)' }}
              >
                <strong>{resolveName(selectedAssignment.personUid)}</strong> ·
                desde{' '}
                {formatTerritoryDate(
                  selectedAssignment.assignedAt,
                  settings.dateFormat
                )}
              </Typography>
            ) : (
              <Typography
                className="body-small-semibold"
                sx={{ color: FREE_COLOR }}
              >
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
