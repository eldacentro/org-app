import { useEffect, useState } from "react";

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
  /** Muestra la ubicación del usuario en tiempo real. */
  showLiveLocation?: boolean;
  height?: number | string;
  editable?: boolean;
  onGeometryChange?: (geo: Polygon | MultiPolygon | null) => void;
};

/** Ajusta la vista del mapa a los límites de la geometría del territorio. */
const FitBounds = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);
  return null;
};

/** Sigue la posición del usuario con watchPosition (limpieza al desmontar). */
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

/** Control de Leaflet Geoman para edición de polígonos */
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
    // Enable geoman controls
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
        style: { color, weight: 2, fillOpacity: 0.18, pmIgnore: false }
      });
      geojsonLayer.eachLayer((layer) => {
        fg.addLayer(layer);
      });
    }

    const handleChange = () => {
      const layers = fg.getLayers() as L.Polygon[];
      if (layers.length === 0) {
        onChange(null);
        return;
      }
      if (layers.length === 1) {
        onChange(layers[0].toGeoJSON().geometry as Polygon);
      } else {
        const coords = layers.map(l => (l.toGeoJSON().geometry as Polygon).coordinates);
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
    fg.on('pm:cut', () => {
       // When cut happens, Geoman might replace layers
       // We'll just wait a tick for layers to update
       setTimeout(handleChange, 50);
    });
    map.on('pm:remove', (e) => {
      if (fg.hasLayer(e.layer)) {
        fg.removeLayer(e.layer);
        handleChange();
      }
    });

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
      fg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // intentionally ignoring geometry and color to prevent remounting and losing state

  return null;
};

/** Controles flotantes Premium sobre el mapa */
const PremiumControls = ({ isSatellite, setIsSatellite }: { isSatellite: boolean; setIsSatellite: (v: boolean) => void }) => {
  const map = useMap();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box
        onClick={(e) => {
          e.stopPropagation();
          setIsSatellite(!isSatellite);
        }}
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '999px',
          padding: '8px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          border: '1px solid rgba(0,0,0,0.05)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          transition: 'transform 0.1s ease, background 0.2s',
          '&:active': { transform: 'scale(0.95)' },
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
        }}
      >
        {isSatellite ? 'Vista Mapa' : 'Vista Satélite'}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', mt: 1 }}>
        <Box
          onClick={(e) => {
            e.stopPropagation();
            map.zoomIn();
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px 12px 4px 4px',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--ink)',
            '&:active': { backgroundColor: '#f0f0f0' }
          }}
        >
          +
        </Box>
        <Box
          onClick={(e) => {
            e.stopPropagation();
            map.zoomOut();
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '4px 4px 12px 12px',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--ink)',
            '&:active': { backgroundColor: '#f0f0f0' }
          }}
        >
          -
        </Box>
      </Box>
    </Box>
  );
};

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
        
        <PremiumControls isSatellite={isSatellite} setIsSatellite={setIsSatellite} />

        {editable && onGeometryChange ? (
          <GeomanControl geometry={geometry} color={color} onChange={onGeometryChange} />
        ) : geometry && (
          <GeoJSON
            key={JSON.stringify(bounds)}
            data={geometry}
            style={{ 
              color, 
              weight: 3, 
              fillOpacity: 0.12, 
              interactive: false,
              className: 'premium-polygon-shadow'
            }}
          />
        )}

        {livePos && (
          <CircleMarker
            center={livePos}
            radius={8}
            pathOptions={{
              color: '#fff',
              weight: 3,
              fillColor: '#007AFF', // iOS Blue
              fillOpacity: 1,
            }}
          >
            <Tooltip>Tu ubicación</Tooltip>
          </CircleMarker>
        )}

        <FitBounds bounds={bounds} />
      </MapContainer>
      
      {/* Sombra interna sobre el mapa para mayor profundidad */}
      <Box sx={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), inset 0 2px 12px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
        zIndex: 1000
      }} />
    </Box>
  );
};

export default TerritoryMap;
