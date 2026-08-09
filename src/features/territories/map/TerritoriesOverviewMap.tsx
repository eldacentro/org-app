import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  territoryTagsState,
} from '@states/territories';
import {
  getZoneColor,
  getZoneName,
  geometryBounds,
  geometryCenter,
  formatTerritoryDate,
  isInCooldown,
} from '@services/app/territories';
import {
  EstadoBadge,
  TagChip,
  ViviendasTag,
  estadoDeTerritorio,
} from '@features/territories/ui';
import { usePersonName } from '../usePersonName';

type Props = {
  onViewTerritory: (territory: Territory) => void;
};

const ASSIGNED_COLOR = '#F97316';
const FREE_COLOR = '#22C55E';

/** Por debajo de esto el mapa deja de ser útil, aunque la pantalla sea baja. */
const ALTO_MINIMO = 320;

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

// ─── Avisa a Leaflet de que su caja ha cambiado de tamaño ───────────────────
// Leaflet mide el contenedor UNA vez y cachea el resultado. Al ajustar el alto
// del mapa a la pantalla (o al girar el móvil) se quedaba pintando las teselas
// del tamaño anterior y aparecían franjas grises.
const AjustarAlContenedor = ({ alto }: { alto: number | null }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [alto, map]);
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
  const tags = useAtomValue(territoryTagsState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [selected, setSelected] = useState<Territory | null>(null);

  // ── El mapa cabe en la pantalla ────────────────────────────────────────
  //
  // Iba a `calc(100dvh - 150px)`, un número a ojo que no acertaba: el mapa
  // se salía por debajo y había que bajar la PÁGINA para verlo entero. Y como
  // la ficha del territorio elegido va pegada al fondo del mapa, tocar un
  // territorio no parecía hacer nada — la ficha aparecía fuera de la
  // pantalla. Ahora se mide dónde empieza el mapa de verdad y se le da lo que
  // queda; el desplazamiento pasa a ser del mapa, no de la página.
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);
  const ajustes = useRef(0);

  useLayoutEffect(() => {
    const medir = () => {
      const el = contenedorRef.current;
      if (!el) return;
      const desdeArriba = el.getBoundingClientRect().top + window.scrollY;
      ajustes.current = 0;
      setAlto(Math.max(ALTO_MINIMO, window.innerHeight - desdeArriba));
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Segunda pasada: lo que sobre por debajo (el relleno del panel de
  // pestañas, el de la página) se le descuenta al mapa. Se mide en vez de
  // restar una constante, que es justo lo que estaba mal antes. Converge en
  // una pasada; el tope está por si algún día algo de fuera crece solo.
  useEffect(() => {
    if (alto === null || ajustes.current >= 3) return;
    const sobra =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    if (sobra <= 1) return;
    ajustes.current += 1;
    setAlto((actual) => Math.max(ALTO_MINIMO, (actual ?? 0) - sobra));
  }, [alto]);

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

  const etiquetasDelSeleccionado = selected
    ? (selected.tags ?? [])
        .map((id) => tags.find((t) => t.id === id))
        .filter(Boolean)
    : [];

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
      ref={contenedorRef}
      sx={{
        position: 'relative',
        width: '100%',
        // Mientras no se ha medido, `dvh` como red — y `dvh`, no `vh`, porque
        // en Safari de iOS `100vh` es el viewport GRANDE (el que habría con la
        // barra de direcciones oculta) y el mapa saldría más alto que lo que
        // se ve.
        height: alto ? `${alto}px` : 'calc(100dvh - 200px)',
        borderRadius: 'var(--shape-md)',
        overflow: 'hidden',
        // El dedo mueve el mapa, no la página de debajo.
        overscrollBehavior: 'contain',
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
        <AjustarAlContenedor alto={alto} />
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
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--shape-lg)',
            boxShadow: 'var(--pop-up-shadow)',
            padding: '16px',
            ...(accentSurface(getZoneColor(selected.zoneId, zones), {
              tint: false,
            }) as object),
            // DESPUÉS del reparto, no antes: `accentSurface` trae su propio
            // `position: relative` para colgar la cápsula de color, y puesto
            // encima dejaba esta ficha en el flujo normal — o sea, DEBAJO del
            // mapa, recortada por su `overflow: hidden`. Eso era lo que hacía
            // que tocar un territorio no pareciera hacer nada.
            position: 'absolute',
            bottom: 12,
            left: 12,
            // En el móvil ocupa el ancho; en una pantalla grande, estirada a
            // 1.200px, el botón de dentro medía lo mismo que la barra de
            // título y la ficha parecía un pie de página.
            right: { mobile: 12, tablet600: 'auto' },
            width: { mobile: 'auto', tablet600: 380 },
            zIndex: 1000,
            // Con muchas etiquetas la ficha podría comerse el mapa entero.
            maxHeight: 'calc(100% - 24px)',
            overflowY: 'auto',
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

          {/* Lo importante del territorio, aquí mismo: quién lo tiene desde
              cuándo, cuántas viviendas y sus etiquetas. Antes solo decía el
              nombre y la zona, así que para saber cualquier otra cosa había
              que abrir la ficha entera. */}
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
              // La misma etiqueta de estado que las fichas de la pestaña
              // "Territorios", no un texto verde con el color a pelo: el
              // significado es fijo, así que le toca `Badge` (§6.4). De paso,
              // un territorio en descanso ya no se anuncia como "Libre".
              // El `inline-flex` no sobra: el Badge es un bloque y aquí, sin
              // nada que lo ciña, se estiraba a todo el ancho de la ficha.
              <Box sx={{ display: 'inline-flex' }}>
                <EstadoBadge
                  estado={estadoDeTerritorio(
                    false,
                    isInCooldown(selected, settings.daysUntilReassignable)
                  )}
                />
              </Box>
            )}
          </Box>

          {(selected.numeroViviendas ||
            etiquetasDelSeleccionado.length > 0) && (
            <Box
              sx={{
                mt: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {selected.numeroViviendas ? (
                <ViviendasTag count={selected.numeroViviendas} />
              ) : null}
              {etiquetasDelSeleccionado.map((tag) => (
                <TagChip key={tag!.id} label={tag!.nombre} color={tag!.color} />
              ))}
            </Box>
          )}

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
