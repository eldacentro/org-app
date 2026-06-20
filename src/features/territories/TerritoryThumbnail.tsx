import { useMemo } from 'react';
import { Box } from '@mui/material';
import type { MultiPolygon, Polygon } from 'geojson';
import { geometryBounds } from '@services/app/territories';

type Props = {
  geometry: Polygon | MultiPolygon | null | undefined;
  color: string;
  size?: number;
};

const VIEWBOX = 64;
const PADDING = 6;

/**
 * Vista previa ligera de la forma de un territorio — un "sneak peek" sin
 * cargar Leaflet ni pedir tiles de mapa. Pensada para listas con varias
 * tarjetas a la vez (Mis Territorios), donde un mapa real por tarjeta sería
 * caro de renderizar.
 */
const TerritoryThumbnail = ({ geometry, color, size = 56 }: Props) => {
  const paths = useMemo(() => {
    if (!geometry) return [];

    const bounds = geometryBounds(geometry);
    if (!bounds) return [];

    const [[south, west], [north, east]] = bounds;
    const lngSpan = east - west || 1;
    const latSpan = north - south || 1;
    const scale = (VIEWBOX - PADDING * 2) / Math.max(lngSpan, latSpan);
    const offsetX = (VIEWBOX - lngSpan * scale) / 2;
    const offsetY = (VIEWBOX - latSpan * scale) / 2;

    const project = (lng: number, lat: number): [number, number] => [
      offsetX + (lng - west) * scale,
      // Y invertido: la latitud crece hacia el norte, el SVG crece hacia abajo
      VIEWBOX - (offsetY + (lat - south) * scale),
    ];

    const ringToPath = (ring: number[][]) =>
      ring
        .map(([lng, lat], i) => {
          const [x, y] = project(lng, lat);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + ' Z';

    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

    return polygons.map((rings) => rings.map(ringToPath).join(' '));
  }, [geometry]);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        backgroundColor: `${color}14`,
        border: `1px solid ${color}33`,
        overflow: 'hidden',
      }}
    >
      {paths.length > 0 ? (
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width="100%" height="100%">
          {paths.map((d, i) => (
            <path key={i} d={d} fill={color} fillOpacity={0.28} stroke={color} strokeWidth={1.5} />
          ))}
        </svg>
      ) : null}
    </Box>
  );
};

export default TerritoryThumbnail;
