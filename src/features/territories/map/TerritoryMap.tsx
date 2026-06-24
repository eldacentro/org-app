import { useEffect, useMemo, useRef, useState } from 'react';
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
import DirectionsIcon from '@mui/icons-material/Directions';
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
  borderRadius?: string | number;
  onGeometryChange?: (geo: Polygon | MultiPolygon | null) => void;
  /** Espacio (px) a reservar abajo al encuadrar/centrar — para que un panel
   *  flotante (p.ej. el bottom sheet de DialogVerTerritorio) no tape el
   *  territorio. */
  bottomInset?: number;
  onNavigate?: () => void;
};

// ─── Ajuste de bounds ─────────────────────────────────────────────────────────
// `bounds` expuesto con ref para que los botones (recentrar) puedan
// reutilizar exactamente el mismo encuadre sin recalcularlo.
const FitBounds = ({
  bounds,
  bottomInset,
  onReady,
}: {
  bounds: LatLngBoundsExpression | null;
  bottomInset: number;
  onReady: (fit: () => void) => void;
}) => {
  const map = useMap();

  const fit = useRef(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        paddingTopLeft: [24, 24],
        paddingBottomRight: [24, 24 + bottomInset],
      });
    }
  });
  fit.current = () => {
    if (bounds) {
      map.fitBounds(bounds, {
        paddingTopLeft: [24, 24],
        paddingBottomRight: [24, 24 + bottomInset],
      });
    }
  };

  useEffect(() => {
    onReady(() => fit.current());
    // Solo cuando cambia la geometría de fondo (bounds ya viene memorizado
    // por valor desde el padre — no se recrea en cada render) o el espacio
    // reservado abajo (p.ej. el sheet cambia de alto al cambiar de pestaña).
    fit.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, bottomInset]);

  return null;
};

// ─── Captura de referencia al mapa ───────────────────────────────────────────
// Necesitamos la instancia de L.Map fuera del MapContainer para poder
// controlar zoom desde los botones que están FUERA del MapContainer.
const MapInstanceCapture = ({ onReady }: { onReady: (m: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    // Solución robusta para cuando el mapa está en un Dialog con transición o cambia de tamaño
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) observer.observe(container);
    
    // Fallback: invalidate tras 200 y 400ms por si el observer no pilla el fin de una animación de MUI
    setTimeout(() => map.invalidateSize(), 250);
    setTimeout(() => map.invalidateSize(), 500);

    return () => {
      if (container) observer.unobserve(container);
      observer.disconnect();
    };
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

// Reset de estilos nativos de <button> — los controles del mapa usan
// component="button" (en vez de un Box con onClick) para que lectores de
// pantalla y navegación por teclado los reconozcan como botones reales.
const mapButtonReset = {
  appearance: 'none',
  border: 'none',
  background: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  '&:focus-visible': {
    outline: '2px solid #007AFF',
    outlineOffset: '2px',
  },
  '&:disabled': {
    cursor: 'default',
  },
} as const;

// ─── Componente principal ─────────────────────────────────────────────────────
const TerritoryMap = ({
  geometry,
  color = '#306CB4',
  showLiveLocation = false,
  height = 360,
  editable = false,
  borderRadius,
  onGeometryChange,
  bottomInset = 0,
  onNavigate,
}: TerritoryMapProps) => {
  // Memorizado por VALOR (no por referencia de `geometry`, que llega como un
  // objeto nuevo en cada snapshot de Firestore aunque el polígono no haya
  // cambiado) — si no, FitBounds se vuelve a disparar y recentra el mapa
  // cada vez que CUALQUIER territorio de la congregación cambia, no solo este.
  const geometryKey = JSON.stringify(geometry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => (geometry ? geometryBounds(geometry) : null), [geometryKey]);
  const center = (geometry && geometryCenter(geometry)) || [40.4168, -3.7038];
  const livePos = useLiveLocation(showLiveLocation);
  const [isSatellite, setIsSatellite] = useState(false);

  // Referencia al mapa Leaflet para controlar zoom desde fuera del MapContainer
  const mapRef = useRef<L.Map | null>(null);
  const fitFnRef = useRef<() => void>(() => {});

  return (
    <Box
      sx={{
        width: '100%',
        height,
        borderRadius: borderRadius ?? 'var(--radius-l, 16px)',
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

        <FitBounds
          bounds={bounds}
          bottomInset={bottomInset}
          onReady={(fit) => { fitFnRef.current = fit; }}
        />
      </MapContainer>

      {/* ─── Controles flotantes FUERA del MapContainer ────────────────────
          Posicionados relativos al wrapper Box → sin problemas de z-index
          ni de contexto de posicionamiento.                                */}
      <Box
        sx={{
          position: 'absolute',
          // Antes era un `top: 14` fijo, sin contar la zona segura del
          // dispositivo — en móvil (notch / isla dinámica / barra de
          // estado) quedaba pegado casi al borde de la pantalla. En
          // escritorio `env(safe-area-inset-top)` es 0, así que no cambia
          // nada ahí.
          top: 'max(14px, env(safe-area-inset-top))',
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          pointerEvents: 'none', // el wrapper no bloquea clicks del mapa
          '& > *': { pointerEvents: 'auto' }, // sí los hijos
        }}
      >
        {/* Toggle Satélite / Mapa */}
        <Box
          component="button"
          type="button"
          onClick={() => setIsSatellite(!isSatellite)}
          aria-pressed={isSatellite}
          aria-label={isSatellite ? 'Cambiar a vista de mapa' : 'Cambiar a vista satélite'}
          sx={{
            ...mapButtonReset,
            ...glass,
            borderRadius: '999px',
            px: '16px',
            py: '10px',
            cursor: 'pointer',
            fontSize: '14px',
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
          <span aria-hidden="true" style={{ fontSize: 15 }}>{isSatellite ? '🗺' : '🛰'}</span>
          {isSatellite ? 'Mapa' : 'Satélite'}
        </Box>

        {/* Recentrar territorio / Mi ubicación — agrupados como un solo
            bloque junto al zoom, en vez de 4 elementos flotantes sueltos. */}
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
            component="button"
            type="button"
            onClick={() => fitFnRef.current()}
            title="Recentrar territorio"
            aria-label="Recentrar territorio"
            sx={{
              ...mapButtonReset,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '0.5px solid rgba(0,0,0,0.1)',
              transition: 'background 0.15s ease',
              '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 18,
                height: 18,
                borderRadius: '3px',
                border: '2px solid rgba(0,0,0,0.7)',
              }}
            />
          </Box>
          <Box
            component="button"
            type="button"
            disabled={!livePos}
            onClick={() => {
              if (livePos) mapRef.current?.setView(livePos, 17);
            }}
            title="Mi ubicación"
            aria-label="Mi ubicación"
            sx={{
              ...mapButtonReset,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: livePos ? 'pointer' : 'default',
              opacity: livePos ? 1 : 0.35,
              transition: 'background 0.15s ease',
              '&:active': livePos ? { backgroundColor: 'rgba(0,0,0,0.08)' } : undefined,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid #007AFF',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#007AFF',
                },
              }}
            />
          </Box>
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
            component="button"
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Acercar"
            sx={{
              ...mapButtonReset,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '22px',
              fontWeight: 300,
              color: 'rgba(0,0,0,0.75)',
              borderBottom: '0.5px solid rgba(0,0,0,0.1)',
              transition: 'background 0.15s ease',
              '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
            }}
          >
            <span aria-hidden="true">+</span>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Alejar"
            sx={{
              ...mapButtonReset,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '22px',
              fontWeight: 300,
              color: 'rgba(0,0,0,0.75)',
              transition: 'background 0.15s ease',
              '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
            }}
          >
            <span aria-hidden="true">−</span>
          </Box>
        </Box>

        {/* Navegación */}
        {onNavigate && (
          <Box
            component="button"
            type="button"
            onClick={onNavigate}
            title="Cómo llegar"
            aria-label="Cómo llegar"
            sx={{
              ...mapButtonReset,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '12px',
              overflow: 'hidden',
              color: 'rgba(0,0,0,0.75)',
              ...glass,
              transition: 'background 0.15s ease',
              '&:active': { backgroundColor: 'rgba(0,0,0,0.08)' },
            }}
          >
            <DirectionsIcon sx={{ fontSize: 24 }} />
          </Box>
        )}
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
