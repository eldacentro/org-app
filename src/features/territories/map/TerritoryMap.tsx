import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  useMap,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { MultiPolygon, Polygon } from 'geojson';
import { Box } from '@mui/material';
import { geometryBounds, geometryCenter } from '@services/app/territories';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

type TerritoryMapProps = {
  geometry: Polygon | MultiPolygon | null;
  color?: string;
  showLiveLocation?: boolean;
  height?: number | string;
  editable?: boolean;
  onGeometryChange?: (geo: Polygon | MultiPolygon | null) => void;
};

// ─── Ajuste de bounds ─────────────────────────────────────────────────────────
const FitBounds = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);
  return null;
};

// ─── Captura de referencia al mapa ───────────────────────────────────────────
// Necesitamos la instancia de L.Map fuera del MapContainer para poder
// controlar zoom desde los botones que están FUERA del MapContainer.
const MapInstanceCapture = ({
  onReady,
}: {
  onReady: (map: L.Map) => void;
}) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
};

// ─── Geolocalización en vivo ──────────────────────────────────────────────────
const useLiveLocation = (enabled: boolean) => {
  const [pos, setPos] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      (err) => console.warn('Geolocalización no disponible:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return pos;
};

// ─── Editor de polígonos (Geoman) ─────────────────────────────────────────────
const GeomanControl = ({
  geometry,
  color,
  onChange,
}: {
  geometry: Polygon | MultiPolygon | null;
  color: string;
  onChange: (geo: Polygon | MultiPolygon | null) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: true,
      removalMode: true,
      drawPolygon: true,
    });
    map.pm.setLang('es');

    const fg = new L.FeatureGroup();
    fg.addTo(map);

    if (geometry) {
      const geojsonLayer = L.geoJSON(geometry, {
        style: { color, weight: 2, fillOpacity: 0.18, pmIgnore: false },
      });
      geojsonLayer.eachLayer((layer) => fg.addLayer(layer));
    }

    const handleChange = () => {
      const layers = fg.getLayers() as L.Polygon[];
      if (layers.length === 0) { onChange(null); return; }
      if (layers.length === 1) {
        onChange(layers[0].toGeoJSON().geometry as Polygon);
      } else {
        const coords = layers.map((l) => (l.toGeoJSON().geometry as Polygon).coordinates);
        onChange({ type: 'MultiPolygon', coordinates: coords });
      }
    };

    map.on('pm:create', (e) => {
      fg.addLayer(e.layer);
      e.layer.on('pm:edit', handleChange);
      handleChange();
    });
    fg.on('pm:edit', handleChange);
    fg.on('layerremove', handleChange);
    fg.on('pm:cut', () => setTimeout(handleChange, 50));
    map.on('pm:remove', (e) => {
      if (fg.hasLayer(e.layer)) { fg.removeLayer(e.layer); handleChange(); }
    });

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
      fg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
};

// ─── Estilo glassmorphism compartido ─────────────────────────────────────────
const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '0.5px solid rgba(255, 255, 255, 0.6)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.13), inset 0 0.5px 0 rgba(255,255,255,0.9)',
} as const;

// ─── Componente principal ─────────────────────────────────────────────────────
const TerritoryMap = ({
  geometry,
  color = '#306CB4',
  showLiveLocation = false,
  height = 360,
  editable = false,
  onGeometryChange,
}: TerritoryMapProps) => {
  const bounds = geometry ? geometryBounds(geometry) : null;
  const center = (geometry && geometryCenter(geometry)) || [40.4168, -3.7038];
  const livePos = useLiveLocation(showLiveLocation);
  const [isSatellite, setIsSatellite] = useState(false);

  // Referencia al mapa Leaflet para controlar zoom desde fuera del MapContainer
  const mapRef = useRef<L.Map | null>(null);

  return (
    <Box
      sx={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-l, 16px)',
        overflow: 'hidden',
        position: 'relative',
        '& .leaflet-container': { height: '100%', width: '100%' },
      }}
    >
      {/* ─── Mapa Leaflet ─────────────────────────────────────────────────── */}
      <MapContainer center={center} zoom={15} scrollWheelZoom zoomControl={false}>
        {isSatellite ? (
          <TileLayer
            attribution="&copy; Esri World Imagery"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* Captura la instancia del mapa para el zoom externo */}
        <MapInstanceCapture onReady={(m) => { mapRef.current = m; }} />

        {editable && onGeometryChange ? (
          <GeomanControl geometry={geometry} color={color} onChange={onGeometryChange} />
        ) : geometry ? (
          <GeoJSON
            key={JSON.stringify(bounds)}
            data={geometry}
            style={{ color, weight: 3, fillOpacity: 0.13, interactive: false }}
          />
        ) : null}

        {livePos && (
          <CircleMarker
            center={livePos}
            radius={8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#007AFF', fillOpacity: 1 }}
          >
            <Tooltip>Tu ubicación</Tooltip>
          </CircleMarker>
        )}

        <FitBounds bounds={bounds} />
      </MapContainer>

      {/* ─── Controles flotantes FUERA del MapContainer ────────────────────
          Posicionados relativos al wrapper Box → sin problemas de z-index
          ni de contexto de posicionamiento.                                */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          pointerEvents: 'none', // el wrapper no bloquea clicks del mapa
          '& > *': { pointerEvents: 'auto' }, // sí los hijos
        }}
      >
        {/* Toggle Satélite / Mapa */}
        <Box
          onClick={() => setIsSatellite(!isSatellite)}
          sx={{
            ...glass,
            borderRadius: '999px',
            px: '14px',
            py: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(0,0,0,0.78)',
            letterSpacing: '-0.1px',
            transition: 'transform 0.1s ease, background 0.2s ease',
            '&:active': { transform: 'scale(0.94)' },
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: 14 }}>{isSatellite ? '🗺' : '🛰'}</span>
          {isSatellite ? 'Mapa' : 'Satélite'}
        </Box>

        {/* Zoom +/- */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
            ...glass,
          }}
        >
          <Box
            onClick={() => mapRef.current?.zoomIn()}
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
            onClick={() => mapRef.current?.zoomOut()}
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
      </Box>

      {/* Sombra interior sutil */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), inset 0 2px 12px rgba(0,0,0,0.06)',
          pointerEvents: 'none',
          zIndex: 500,
        }}
      />
    </Box>
  );
};

export default TerritoryMap;
