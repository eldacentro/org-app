import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  useMap,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { MultiPolygon, Polygon } from 'geojson';
import { Box } from '@mui/material';
import DirectionsIcon from '@mui/icons-material/Directions';
import { IconMapView, IconGlobe, IconCompassOn } from '@components/icons';
import { geometryBounds, geometryCenter } from '@services/app/territories';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
// Side-effect: parchea L.Map con soporte de rotación (bearing) y el gesto
// táctil de dos dedos para rotar, igual que un mapa nativo.
import 'leaflet-rotate';

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

  // fitBounds calcula el encuadre asumiendo el mapa "recto" (sin rotar), así
  // que con el plugin de rotación activo hay que poner el norte arriba
  // ANTES de encuadrar para que el cálculo sea correcto — pero esta función
  // se dispara también automáticamente (ver el efecto de abajo, cuando
  // cambia bottomInset por algo tan ajeno como cambiar de pestaña en el
  // diálogo), así que resetear el bearing SIN RESTAURARLO después tiraría
  // la rotación del usuario sin que él hiciera nada. Por eso se restaura el
  // bearing original justo después — como los tres pasos son síncronos, no
  // llega a pintarse el fotograma intermedio "norte arriba". Volver a
  // "norte arriba" de verdad es cosa solo del botón de brújula.
  const doFit = () => {
    if (!bounds) return;
    // El relleno inferior lo marca el alto del panel deslizante, que puede
    // llegar al 90% de la pantalla. Si relleno superior + inferior supera el
    // alto útil, Leaflet calcula un tamaño NEGATIVO y el zoom sale NaN: el
    // mapa se queda sin teselas. Se limita a dejar siempre al menos 80px de
    // ventana visible (y en ese caso ya no tiene sentido tanto margen).
    const usable = map.getSize().y;
    const maxBottom = Math.max(0, usable - 24 - 80);
    const safeBottom = Math.min(24 + bottomInset, maxBottom);

    const startBearing = map.getBearing?.() ?? 0;
    map.setBearing?.(0);
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, safeBottom],
    });
    if (startBearing) map.setBearing?.(startBearing);
  };

  const fit = useRef(doFit);
  fit.current = doFit;

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
  // `onReady` llega como función inline desde el padre, así que cambia de
  // identidad en CADA render. Estando en las dependencias del efecto, este
  // se desmontaba y volvía a montar continuamente (el seguimiento de
  // ubicación en vivo repinta ~1 vez por segundo mientras se predica),
  // recreando el ResizeObserver y encolando dos temporizadores más cada vez.
  // Con una ref, el efecto corre una sola vez por mapa.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current(map);
    // Solución robusta para cuando el mapa está en un Dialog con transición o cambia de tamaño
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) observer.observe(container);

    // Fallback por si el observer no pilla el fin de una animación de MUI.
    // Se guardan los ids para CANCELARLOS al desmontar: si el usuario cierra
    // el territorio antes de que salten, `invalidateSize()` corría sobre un
    // mapa ya destruido y lanzaba un TypeError sin capturar.
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (container) observer.unobserve(container);
      observer.disconnect();
    };
  }, [map]);
  return null;
};

// ─── Seguimiento de rotación (bearing) ────────────────────────────────────────
// Para saber cuándo mostrar el botón de brújula (solo si el mapa está
// rotado) — separado de MapInstanceCapture para no tocar su efecto ya
// existente (ResizeObserver) con una dependencia que cambia cada render.
const BearingTracker = ({ onChange }: { onChange: (bearing: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    const handleRotate = () => onChange(map.getBearing?.() ?? 0);
    map.on('rotate', handleRotate);
    return () => {
      map.off('rotate', handleRotate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
};

// ─── Saneado del gesto de dos dedos ───────────────────────────────────────
// Parche defensivo para un fallo de leaflet-rotate: su `_onTouchEnd` sale
// antes de tiempo cuando el gesto no llegó a moverse
// (`if (!this._moved || ...) { this._zooming = false; return; }`), y en esa
// rama NO limpia `_rotating` ni desengancha sus listeners de `document`.
// Basta con posar dos dedos y levantarlos sin arrastrar — o que llegue un
// `touchcancel` — para que `_rotating` se quede en `true`: a partir de ahí
// `_onTouchStart` aborta siempre por su propia guarda y el mapa se queda SIN
// pinch-zoom ni rotación hasta recargar la app, sin que el usuario pueda
// hacer nada. Aquí se limpia el estado cuando ya no quedan dedos en pantalla.
const TouchGestureRecovery = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const handler = (e: TouchEvent) => {
      if (e.touches.length > 0) return; // todavía hay dedos: gesto en curso
      const gestures = (map as unknown as Record<string, unknown>).touchGestures as
        | { _zooming?: boolean; _rotating?: boolean; _moved?: boolean }
        | undefined;
      if (!gestures) return;
      if (gestures._rotating || gestures._zooming) {
        gestures._rotating = false;
        gestures._zooming = false;
        gestures._moved = false;
      }
    };
    container.addEventListener('touchend', handler);
    container.addEventListener('touchcancel', handler);
    return () => {
      container.removeEventListener('touchend', handler);
      container.removeEventListener('touchcancel', handler);
    };
  }, [map]);
  return null;
};

// ─── El polígono, pegado al mapa durante el gesto ─────────────────────────
// Mientras se hace pinza o se rota, Leaflet no vuelve a proyectar los
// vectores: mueve y escala su contenedor SVG con una transformación CSS, que
// es barato y va suave. Pero con el mapa ROTADO esa transformación se calcula
// mal — el propio plugin lo admite en un `@FIXME` de su código, sobre
// `_updateTransform` y `_topLeft` —, así que el polígono se estira o se
// encoge respecto a las calles durante todo el gesto y solo cuadra al
// soltar, cuando Leaflet reproyecta de verdad.
//
// Aquí se reproyecta en CADA fotograma del gesto en vez de confiar en esa
// transformación. Es más trabajo, pero este mapa dibuja UN territorio (unas
// pocas decenas de vértices): ni se nota. El mapa general, que sí tiene 130
// polígonos, no lleva rotación y no pasa por aquí.
const VectorGestureSync = () => {
  const map = useMap();
  /** Valor original de la animación de zoom, para restaurarlo al salir. */
  const nativeZoomAnimated = useRef<boolean | null>(null);

  useEffect(() => {
    // Los renderizadores se cachean: recorrer todas las capas en cada
    // fotograma del gesto era trabajo repetido para siempre el mismo
    // resultado. Se recalcula solo cuando se añade o quita una capa.
    let renderers: { _reset: () => void }[] = [];
    const collect = () => {
      const found = new Set<{ _reset: () => void }>();
      map.eachLayer((layer) => {
        const r = (layer as unknown as { _renderer?: { _reset: () => void } })._renderer;
        if (r) found.add(r);
      });
      renderers = [...found];
    };
    collect();

    // SÍNCRONO, sin requestAnimationFrame propio. Leaflet ya agrupa el
    // gesto en un frame (su manejador táctil llama a `_move` dentro de un
    // requestAnimFrame), así que meter otro solo conseguía que el polígono
    // se dibujara UN FOTOGRAMA POR DETRÁS de las calles: se veía "nadar"
    // respecto al mapa durante todo el gesto.
    const sync = () => {
      for (const r of renderers) {
        try {
          r._reset();
        } catch {
          // Tocamos interiores de Leaflet: si una versión futura los
          // cambia, el mapa debe seguir funcionando (solo se recupera el
          // parpadeo de antes, no se rompe nada).
        }
      }
    };

    // Los botones +/− y el doble toque NO pasan por 'zoom' fotograma a
    // fotograma: Leaflet los resuelve con una transición CSS de ~250 ms
    // (`zoomanim`), y ahí vuelve a mandar la transformación defectuosa del
    // plugin, así que el polígono también se deformaba durante esa
    // animación. Con el mapa rotado se desactiva esa animación: el zoom pasa
    // a ser instantáneo y correcto, que se ve mucho mejor que un cuarto de
    // segundo de polígono descuadrado. Sin rotar (el caso normal) la
    // animación se mantiene intacta, porque ahí Leaflet acierta.
    const syncZoomAnimation = () => {
      const rotated = Math.round(map.getBearing?.() ?? 0) !== 0;
      const m = map as unknown as { _zoomAnimated: boolean };
      if (nativeZoomAnimated.current === null) {
        nativeZoomAnimated.current = m._zoomAnimated;
      }
      m._zoomAnimated = nativeZoomAnimated.current && !rotated;
    };

    map.on('zoom', sync);
    map.on('rotate', sync);
    map.on('rotate', syncZoomAnimation);
    map.on('layeradd', collect);
    map.on('layerremove', collect);
    syncZoomAnimation();

    return () => {
      map.off('zoom', sync);
      map.off('rotate', sync);
      map.off('rotate', syncZoomAnimation);
      map.off('layeradd', collect);
      map.off('layerremove', collect);
      // Dejar el mapa como estaba por si se reutiliza la instancia.
      if (nativeZoomAnimated.current !== null) {
        (map as unknown as { _zoomAnimated: boolean })._zoomAnimated =
          nativeZoomAnimated.current;
      }
    };
  }, [map]);

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

/**
 * Punto de "Tu ubicación" con cono de orientación, como en Google Maps.
 *
 * Es un `divIcon` en vez de un `CircleMarker` porque el cono hay que
 * ROTARLO, y los vectores de Leaflet no admiten rotación; con HTML basta un
 * `transform`. Cuando no se conoce el rumbo (dispositivo sin brújula o sin
 * permiso), se pinta solo el punto: mejor eso que una flecha apuntando a
 * cualquier sitio.
 */
const LocationMarker = ({
  position,
  color,
  heading,
}: {
  position: [number, number];
  color: string;
  heading: number | null;
}) => {
  const icon = useMemo(() => {
    const cono =
      heading === null
        ? ''
        : `<div style="
             position:absolute; left:50%; top:50%;
             width:0; height:0;
             transform: translate(-50%,-100%) rotate(${heading}deg);
             transform-origin: 50% 100%;
             border-left:11px solid transparent;
             border-right:11px solid transparent;
             border-bottom:20px solid ${color};
             opacity:.35;
           "></div>`;

    return L.divIcon({
      className: 'territory-location-marker',
      html: `<div style="position:relative;width:34px;height:34px;">
               ${cono}
               <div style="
                 position:absolute; left:50%; top:50%;
                 width:16px; height:16px; margin:-8px 0 0 -8px;
                 border-radius:50%;
                 background:${color};
                 border:3px solid #fff;
                 box-shadow:0 0 0 1px rgba(0,0,0,.18);
               "></div>
             </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, [color, heading]);

  return (
    <Marker position={position} icon={icon} keyboard={false}>
      <Tooltip>Tu ubicación</Tooltip>
    </Marker>
  );
};

/**
 * Hacia dónde está mirando el teléfono, en grados desde el norte.
 *
 * Devuelve `null` si el dispositivo no da brújula o si el usuario no ha dado
 * permiso: en ese caso el punto de ubicación se pinta sin flecha, que es
 * mejor que enseñar una flecha apuntando a cualquier sitio.
 *
 * En iOS 13+ hace falta pedir permiso explícitamente y SOLO desde un gesto
 * del usuario, por eso `request` se expone para engancharlo al botón de
 * "Mi ubicación".
 */
const useDeviceHeading = (enabled: boolean) => {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHeading(null);
      return;
    }

    const onOrientation = (e: DeviceOrientationEvent) => {
      // Safari da el rumbo ya corregido respecto al norte magnético.
      const webkit = (e as unknown as { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkit === 'number' && !Number.isNaN(webkit)) {
        setHeading(webkit);
        return;
      }
      // El resto: `alpha` va al revés (antihorario desde el norte).
      if (e.absolute && typeof e.alpha === 'number') {
        setHeading((360 - e.alpha) % 360);
      }
    };

    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener);
    window.addEventListener('deviceorientation', onOrientation as EventListener);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener);
      window.removeEventListener('deviceorientation', onOrientation as EventListener);
    };
  }, [enabled]);

  return heading;
};

/** Pide permiso de brújula en iOS. Debe llamarse DENTRO de un gesto. */
const requestHeadingPermission = async () => {
  const D = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof D?.requestPermission !== 'function') return; // no hace falta
  try {
    await D.requestPermission();
  } catch {
    // Si lo rechaza, simplemente no habrá flecha.
  }
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
    // Geoman calcula posiciones de vértices asumiendo un mapa sin rotar —
    // con el mapa girado, arrastrar/editar un polígono se desalinea (issue
    // conocido y sin soporte por parte de Geoman). Se bloquea la rotación
    // mientras se edita, y se restaura al salir del modo editable.
    map.setBearing?.(0);
    map.touchRotate?.disable();

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

      // Una capa de Leaflet puede ser Polygon O MultiPolygon (al reabrir un
      // territorio de varias piezas, Leaflet lo carga como UNA sola capa).
      // Antes se asumía que toda capa era Polygon y se cogían sus
      // `coordinates` tal cual: al mezclar los dos niveles de anidamiento se
      // guardaba una geometría malformada que dejaba el territorio sin
      // dibujar y rompía el encuadre del mapa — y se sincronizaba así a
      // todos los dispositivos de la congregación.
      const polygons: number[][][][] = [];
      for (const layer of layers) {
        const g = layer.toGeoJSON().geometry as Polygon | MultiPolygon;
        if (g.type === 'Polygon') polygons.push(g.coordinates);
        else if (g.type === 'MultiPolygon') polygons.push(...g.coordinates);
      }
      if (polygons.length === 0) { onChange(null); return; }

      onChange(
        polygons.length === 1
          ? { type: 'Polygon', coordinates: polygons[0] }
          : { type: 'MultiPolygon', coordinates: polygons }
      );
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
      map.touchRotate?.enable();
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
    outline: '2px solid var(--accent-main)',
    outlineOffset: '2px',
  },
  '&:disabled': {
    cursor: 'default',
  },
} as const;

// ─── Componente principal ─────────────────────────────────────────────────────
const TerritoryMap = ({
  geometry,
  color = 'var(--accent-main)',
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
  // Los tokens CSS hay que resolverlos a un color real para Leaflet (ver
  // más abajo, en el marcador de ubicación). Se recalcula en cada render:
  // es una lectura barata y así sigue el tema si el usuario lo cambia.
  const accentColor =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement)
          .getPropertyValue('--accent-main')
          .trim() || '#1f6fd0'
      : '#1f6fd0';

  const geometryKey = JSON.stringify(geometry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => (geometry ? geometryBounds(geometry) : null), [geometryKey]);
  const center = (geometry && geometryCenter(geometry)) || [40.4168, -3.7038];
  const livePos = useLiveLocation(showLiveLocation);
  const heading = useDeviceHeading(showLiveLocation);
  const [isSatellite, setIsSatellite] = useState(false);
  // Ángulo actual de rotación — solo para decidir cuándo mostrar el botón de
  // brújula (0 = norte arriba, igual que siempre). El mapa en sí no depende
  // de este estado para rotar (eso lo hace leaflet-rotate internamente).
  const [bearing, setBearing] = useState(0);
  const isRotated = Math.round(bearing) !== 0;

  // Referencia al mapa Leaflet para controlar zoom desde fuera del MapContainer
  const mapRef = useRef<L.Map | null>(null);
  const fitFnRef = useRef<() => void>(() => {});

  // Vuelve suavemente a "norte arriba" — leaflet-rotate no anima setBearing
  // por sí solo (salta de golpe), así que se interpola a mano por el camino
  // más corto (evita dar una vuelta entera si el bearing es, p.ej., 350°).
  const resetToNorth = () => {
    const map = mapRef.current;
    if (!map?.setBearing) return;
    const start = map.getBearing?.() ?? 0;
    if (start === 0) return;
    let delta = -start % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const target = start + delta;
    const duration = 250;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      map.setBearing(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(step);
      else map.setBearing(0);
    };
    requestAnimationFrame(step);
  };

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
      {/* ─── Mapa Leaflet ───────────────────────────────────────────────────
          rotate/touchRotate: gesto de dos dedos para rotar, como un mapa
          nativo — rotateControl={false} porque se usa un botón de brújula
          propio (más abajo) en vez del control nativo del plugin, para que
          combine con el resto de controles flotantes de esta pantalla. */}
      <MapContainer
        center={center}
        zoom={15}
        // Leaflet corta en 18 por defecto, que en una calle estrecha se queda
        // corto para distinguir portales. Las teselas de OpenStreetMap llegan
        // a 19 y las de satélite a 19 también; a partir de ahí el navegador
        // amplía la última tesela disponible (`maxNativeZoom`), que se ve algo
        // borroso pero permite acercarse de verdad al portal.
        maxZoom={21}
        scrollWheelZoom
        zoomControl={false}
        rotate
        bearing={0}
        rotateControl={false}
        touchRotate
      >
        {isSatellite ? (
          <TileLayer
            attribution="&copy; Esri World Imagery"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={21}
          />
        ) : (
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={19}
            maxZoom={21}
          />
        )}

        {/* Captura la instancia del mapa para el zoom externo */}
        <MapInstanceCapture onReady={(m) => { mapRef.current = m; }} />
        <BearingTracker onChange={setBearing} />
        <TouchGestureRecovery />
        <VectorGestureSync />

        {editable && onGeometryChange ? (
          <GeomanControl geometry={geometry} color={color} onChange={onGeometryChange} />
        ) : geometry ? (
          <GeoJSON
            // Por la geometría COMPLETA, no solo por el encuadre: `data` de
            // react-leaflet no es reactiva, así que una edición que no cambie
            // el rectángulo envolvente (mover un vértice hacia dentro, abrir
            // un hueco) no se reflejaba hasta cerrar y volver a abrir.
            key={geometryKey}
            data={geometry}
            style={{ color, weight: 3, fillOpacity: 0.13, interactive: false }}
          />
        ) : null}

        {livePos && (
          <LocationMarker
            position={livePos}
            color={accentColor}
            // El cono gira con el teléfono, pero el mapa también puede estar
            // rotado: hay que restar el rumbo del mapa para que la flecha
            // apunte al sitio real y no a "arriba de la pantalla".
            heading={heading === null ? null : heading - bearing}
          />
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
            borderRadius: 'var(--radius-max)',
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
          {isSatellite ? (
            <IconMapView width={16} height={16} color="rgba(0,0,0,0.78)" />
          ) : (
            <IconGlobe width={16} height={16} color="rgba(0,0,0,0.78)" />
          )}
          {isSatellite ? 'Mapa' : 'Satélite'}
        </Box>

        {/* Brújula: solo cuenta si el mapa está rotado (como en Google Maps)
            — tocarla lo devuelve suavemente a "norte arriba".

            NO se monta y desmonta: siempre está en el DOM y lo que se anima
            es su alto, su opacidad y su escala. Apareciendo y desapareciendo
            de golpe, los botones de abajo daban un salto seco cada vez que
            empezabas o terminabas de rotar. Así el hueco se abre y se cierra
            con la misma transición, y todo el grupo se desplaza suave. */}
        <Box
          aria-hidden={!isRotated}
          sx={{
            // 44 = alto del botón. Al ocultarlo no basta con poner el alto a
            // cero: el contenedor usa `gap: 10px`, y ese hueco seguiría ahí.
            // El margen negativo lo absorbe, así que el grupo de abajo sube
            // exactamente lo que ocupaba la brújula, ni un píxel más.
            height: isRotated ? 44 : 0,
            marginBottom: isRotated ? 0 : '-10px',
            opacity: isRotated ? 1 : 0,
            transform: isRotated ? 'scale(1)' : 'scale(0.8)',
            transformOrigin: 'center',
            overflow: 'hidden',
            // `visibility` (y no `pointerEvents`) porque el contenedor padre
            // fuerza `pointerEvents: auto` en todos sus hijos directos y
            // ganaría por especificidad. Además saca el botón del orden de
            // tabulación mientras está oculto. Se retrasa hasta el final de
            // la animación para que no desaparezca de golpe al empezar.
            visibility: isRotated ? 'visible' : 'hidden',
            transition: [
              'height 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              'margin-bottom 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              'opacity 0.18s ease',
              'transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1)',
              `visibility 0s linear ${isRotated ? '0s' : '0.22s'}`,
            ].join(', '),
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={resetToNorth}
            tabIndex={isRotated ? 0 : -1}
            title="Volver al norte"
            aria-label="Volver al norte"
            sx={{
              ...mapButtonReset,
              ...glass,
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-max)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.1s ease, background 0.2s ease',
              '&:active': { transform: 'scale(0.94)' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                transform: `rotate(${-bearing}deg)`,
                transition: 'transform 0.1s linear',
              }}
            >
              <IconCompassOn width={22} height={22} color="var(--red-main)" />
            </Box>
          </Box>
        </Box>

        {/* Recentrar territorio / Mi ubicación — agrupados como un solo
            bloque junto al zoom, en vez de 4 elementos flotantes sueltos. */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--radius-xl)',
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
              // iOS solo concede la brújula si se pide DENTRO de un gesto:
              // este toque es el momento natural para hacerlo, porque es
              // justo cuando el usuario quiere saber dónde está y hacia
              // dónde mira. Si la rechaza, el punto sale sin flecha.
              void requestHeadingPermission();
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
                border: '2px solid var(--accent-main)',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-main)',
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
            borderRadius: 'var(--radius-xl)',
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
              borderRadius: 'var(--radius-xl)',
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
