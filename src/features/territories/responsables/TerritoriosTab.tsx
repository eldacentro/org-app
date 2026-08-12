import { useMemo, useState } from 'react';
import { Box, Stack, Grid, Menu, Divider } from '@mui/material';
import Typography from '@components/typography';
import Badge from '@components/badge';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import MenuItem from '@components/menuitem';
import SearchBar from '@components/search_bar';
import IconButton from '@components/icon_button';
import FilterChip from '@components/filter_chip';
import Accordion from '@components/accordion';
import EmptyState from '@components/empty_state';
import accentSurface from '@components/accent_surface';
import {
  IconAdd,
  IconCheckboxMultiple,
  IconCustom,
  IconImportFile,
  IconInfo,
  IconMapOverview,
  IconMore,
} from '@components/icons';
import {
  EstadoBadge,
  TagChip,
  estadoDeTerritorio,
} from '@features/territories/ui';
import {
  Territory,
  TerritoryTag,
  TerritoryZone,
} from '@definition/territories';
import {
  daysInCooldown,
  isInCooldown,
  territoryLabel,
} from '@services/app/territories';
import { useBreakpoints } from '@hooks/index';

/**
 * La pestaña "Territorios" del panel de responsables.
 *
 * Vivía dentro de `ResponsablesPanel` y ocupaba su mejor franja con cuatro
 * botones —Zonas, Etiquetas, Añadir territorio, Importar KML— que se usan un
 * puñado de veces al año. Ahí arriba ahora va lo que se usa cada vez que se
 * abre la pantalla: buscar un territorio y filtrar por etiquetas. Las cuatro
 * acciones de mantenimiento se recogen en "Gestionar", igual que el engranaje
 * de la cabecera recoge la configuración de la pantalla.
 */

type EstadoFiltro = 'todos' | 'libre' | 'asignado' | 'descanso';

const ESTADO_FILTROS: { valor: EstadoFiltro; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'libre', texto: 'Libres' },
  { valor: 'asignado', texto: 'Asignados' },
  { valor: 'descanso', texto: 'En descanso' },
];

/**
 * Una fila de fichas de filtro.
 *
 * En el móvil se desliza en una sola línea en vez de partirse: con cuatro
 * estados y seis etiquetas, envolviendo se comía media pantalla y dejaba los
 * territorios —que son a lo que se viene— fuera de la vista. Los chips llegan
 * hasta el borde de la tarjeta (margen negativo + relleno) para que se vea que
 * la fila sigue. De tableta para arriba caben todos y envuelven como siempre.
 */
const rielSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: { mobile: 'nowrap', tablet600: 'wrap' },
  overflowX: { mobile: 'auto', tablet600: 'visible' },
  margin: { mobile: '0 -16px', tablet600: 0 },
  padding: { mobile: '0 16px', tablet600: 0 },
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

type ZoneSectionProps = {
  zone: TerritoryZone;
  items: Territory[];
  /** Cuántos hay en la zona sin contar el filtro, para poder decir "12 de 97". */
  total: number;
  filtrando: boolean;
  assignedIds: Set<string>;
  daysUntilReassignable: number;
  tags: TerritoryTag[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onView: (t: Territory) => void;
};

const ZoneSection = ({
  zone,
  items,
  total,
  filtrando,
  assignedIds,
  daysUntilReassignable,
  tags,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onView,
}: ZoneSectionProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Buscando o filtrando, la zona se abre sola: si no, el resultado de la
  // búsqueda queda escondido detrás de tres cabeceras plegadas y parece que
  // no hay nada.
  const abierta = filtrando ? true : expanded;

  const label = (
    // Ni `h2` con el tamaño pisado a mano (`1.1rem`, que no está en la escala
    // y por eso no seguía a ningún punto de ruptura), ni un contador con su
    // propio `0.85rem`: el título es el de una sección y el contador es la
    // misma etiqueta gris que se usa en el resto de la app.
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ width: '100%' }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: 'var(--shape-full)',
          flexShrink: 0,
          backgroundColor: zone.color,
          boxShadow: `0 0 0 3px color-mix(in srgb, ${zone.color} 20%, transparent)`,
        }}
      />
      <Typography className="h4" color="var(--ink)">
        {zone.nombre}
      </Typography>
      <Badge
        size="small"
        color={filtrando ? 'accent' : 'grey'}
        text={
          filtrando
            ? `${items.length} de ${total}`
            : total === 1
              ? '1 territorio'
              : `${total} territorios`
        }
      />
    </Stack>
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion
        id={zone.id}
        label={label}
        expanded={abierta}
        onChange={(val) => setExpanded(val !== false)}
        sx={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--shape-lg) !important',
          border: '1px solid var(--line)',
          boxShadow: 'var(--small-card-shadow)',
          overflow: 'hidden',
          '&:before': { display: 'none' },
        }}
        summaryProps={{
          sx: {
            padding: '12px 20px',
            minHeight: '64px !important',
            borderBottom: abierta ? '1px solid var(--line)' : 'none',
            // El hover vivía en la tarjeta ENTERA, cuerpo desplegado
            // incluido: al pasar el ratón por una lista de territorios se
            // encendía la sombra de todo el bloque. Lo que se pulsa es la
            // cabecera, así que la cabecera es lo que reacciona.
            transition:
              'background-color var(--motion-fast) var(--ease-standard)',
            '&:hover': { backgroundColor: 'var(--state-hover)' },
          },
        }}
        detailsProps={{
          sx: { padding: '16px 16px 12px' },
        }}
      >
        <Grid container spacing={1.5}>
          {items.map((t: Territory) => {
            const assigned = assignedIds.has(t.id);
            const resting = !assigned && isInCooldown(t, daysUntilReassignable);
            const selected = selectedIds.has(t.id);
            const misEtiquetas = (t.tags ?? [])
              .map((tagId) => tags.find((tt) => tt.id === tagId))
              .filter(Boolean) as TerritoryTag[];

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
                  onClick={() =>
                    selectionMode ? onToggleSelect(t.id) : onView(t)
                  }
                  className="active-press"
                  sx={{
                    appearance: 'none',
                    font: 'inherit',
                    textAlign: 'left',
                    width: '100%',
                    // Sin esto, en una fila con un territorio de nombre
                    // largo las demás fichas quedaban más bajas y la rejilla
                    // salía escalonada.
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    '&:focus-visible': {
                      outline: '2px solid var(--accent-main)',
                      outlineOffset: '2px',
                    },
                    padding: '14px 16px',
                    borderRadius: 'var(--shape-lg)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    boxShadow: 'var(--small-card-shadow)',
                    transition:
                      'background-color var(--motion-fast) var(--ease-standard)',
                    // La cápsula de la zona sí, el LAVADO de fondo no
                    // (`tint: false`). Aquí no aporta nada: estás dentro del
                    // desplegable de esa zona, así que todas las fichas que
                    // ves son de la misma — el fondo teñido no distingue una
                    // de otra, y en cambio ensuciaba todo lo que se pone
                    // encima. Con la tarjeta limpia, la única mancha de color
                    // fuerte vuelve a ser la etiqueta de estado.
                    ...(accentSurface(zone.color, { tint: false }) as object),
                    backgroundColor: 'var(--card)',
                    ...(selected && {
                      backgroundColor: 'var(--state-selected)',
                      borderColor: 'var(--accent-main)',
                    }),
                    // Esta sí se pulsa (abre el territorio o lo marca), así
                    // que sí reacciona — pero con la capa de estado del
                    // sistema, no levantándose 2px. El salto obligaba al ojo
                    // a recolocar toda la rejilla al pasar por encima.
                    '&:hover': {
                      backgroundColor: selected
                        ? 'var(--state-selected-strong)'
                        : 'var(--state-hover)',
                    },
                  }}
                >
                  {/* Arriba: el número a la izquierda y el estado a la
                      derecha. Los dos son la misma pregunta —"¿cuál es y
                      puedo darlo?"— y se leen de un vistazo en la misma
                      línea. El nombre baja a una segunda línea en vez de
                      partir el "7 — Centro" por la mitad, que es lo que
                      pasaba en una tarjeta de media pantalla. */}
                  <Box sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        // Envuelve en vez de desbordarse: en una tarjeta de
                        // media pantalla con la casilla de selección puesta,
                        // "Asignado" se salía 9px por el lado derecho.
                        flexWrap: 'wrap',
                        columnGap: '8px',
                        rowGap: '4px',
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        // `flexShrink: 0`, o en una tarjeta estrecha con la
                        // etiqueta "Asignado" al lado el número se encogía
                        // hasta desaparecer: quedaba la casilla y el estado,
                        // sin saber de qué territorio.
                        sx={{ flexShrink: 0 }}
                      >
                        {selectionMode && (
                          // A la izquierda del número, no encima de la
                          // esquina: ahí tapaba la etiqueta de estado, y
                          // justo mientras se elige a quién dar territorios
                          // es cuando hace falta ver cuáles están libres.
                          // Decorativa: el estado real lo anuncia el
                          // aria-pressed del botón que la contiene.
                          <Box
                            aria-hidden
                            sx={{ pointerEvents: 'none', ml: '-6px' }}
                          >
                            <Checkbox
                              checked={selected}
                              readOnly
                              sx={{ p: 0.25 }}
                            />
                          </Box>
                        )}
                        <Typography
                          className="body-regular-semibold"
                          sx={{ color: 'var(--ink)' }}
                        >
                          {t.numero}
                        </Typography>
                      </Stack>
                      {/* `marginLeft: auto` para que siga a la derecha
                          también cuando le toca bajar a su propia línea. */}
                      <Box sx={{ flexShrink: 0, marginLeft: 'auto' }}>
                        <EstadoBadge
                          estado={estadoDeTerritorio(assigned, resting)}
                          dias={resting ? daysInCooldown(t) : undefined}
                        />
                      </Box>
                    </Box>
                    {/* El nombre va en su propia línea, a todo lo ancho. En la
                        misma fila que la etiqueta de estado le quedaban 25px
                        en un móvil de dos columnas y "Centro" salía "Ce…". */}
                    {t.nombre && (
                      <Typography
                        className="body-small-regular"
                        sx={{
                          color: 'var(--ink-2)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          // La caja de una línea recorta los rabitos de la g y
                          // la p; el aire se gana con relleno, no subiendo el
                          // interlineado (§2.3).
                          paddingBottom: '2px',
                        }}
                      >
                        {t.nombre}
                      </Typography>
                    )}
                  </Box>

                  {/* Abajo y a la izquierda: las etiquetas, escritas. Eran
                      puntitos de color de 8px, así que para saber si un
                      territorio era grande o pequeño había que aprenderse el
                      código de colores — y con dos etiquetas, dos puntos
                      pegados que no decían nada. */}
                  {misEtiquetas.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        width: '100%',
                      }}
                    >
                      {misEtiquetas.map((tag) => (
                        <TagChip
                          key={tag.id}
                          label={tag.nombre}
                          color={tag.color}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Accordion>
    </Box>
  );
};

type Props = {
  zones: TerritoryZone[];
  territories: Territory[];
  tags: TerritoryTag[];
  assignedIds: Set<string>;
  daysUntilReassignable: number;
  loading: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  deleting: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectionMode: () => void;
  onBulkAsignar: () => void;
  onBulkDelete: () => void;
  onView: (t: Territory) => void;
  onOpenZonas: () => void;
  onOpenEtiquetas: () => void;
  onOpenImport: () => void;
  onOpenCrear: () => void;
};

const TerritoriosTab = ({
  zones,
  territories,
  tags,
  assignedIds,
  daysUntilReassignable,
  loading,
  selectionMode,
  selectedIds,
  deleting,
  onToggleSelect,
  onToggleSelectionMode,
  onBulkAsignar,
  onBulkDelete,
  onView,
  onOpenZonas,
  onOpenEtiquetas,
  onOpenImport,
  onOpenCrear,
}: Props) => {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoFiltro>('todos');
  const [etiquetasElegidas, setEtiquetasElegidas] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { tablet600Up } = useBreakpoints();

  const filtrando =
    busqueda.trim().length > 0 ||
    estado !== 'todos' ||
    etiquetasElegidas.length > 0;

  const toggleEtiqueta = (id: string) => {
    setEtiquetasElegidas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const limpiar = () => {
    setBusqueda('');
    setEstado('todos');
    setEtiquetasElegidas([]);
  };

  const coincide = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return (t: Territory) => {
      if (texto) {
        // Por número Y por nombre: quien busca "12" quiere el 12, y quien
        // busca "centro" quiere el que se llama así.
        const enNumero = t.numero.toLowerCase().includes(texto);
        const enNombre = (t.nombre ?? '').toLowerCase().includes(texto);
        if (!enNumero && !enNombre) return false;
      }

      if (estado !== 'todos') {
        const asignado = assignedIds.has(t.id);
        const descanso = !asignado && isInCooldown(t, daysUntilReassignable);
        if (estadoDeTerritorio(asignado, descanso) !== estado) return false;
      }

      // Cualquiera de las elegidas, no todas: las cuatro de tamaño se
      // excluyen entre sí, así que exigirlas juntas no devolvería nunca nada
      // y el filtro parecería roto.
      if (etiquetasElegidas.length > 0) {
        const suyas = t.tags ?? [];
        if (!etiquetasElegidas.some((id) => suyas.includes(id))) return false;
      }

      return true;
    };
  }, [busqueda, estado, etiquetasElegidas, assignedIds, daysUntilReassignable]);

  const byZone = useMemo(
    () =>
      zones.map((zone) => {
        const deLaZona = territories
          .filter((t) => t.zoneId === zone.id)
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        return {
          zone,
          total: deLaZona.length,
          items: deLaZona.filter(coincide),
        };
      }),
    [zones, territories, coincide]
  );

  const visibles = byZone.reduce((n, z) => n + z.items.length, 0);
  const conResultados = byZone.filter((z) => z.items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Buscar, filtrar y gestionar ─────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          borderRadius: 'var(--shape-lg)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          boxShadow: 'var(--small-card-shadow)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ width: '100%' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SearchBar
              placeholder="Buscar por número o nombre"
              value={busqueda}
              onSearch={(valor: string) => setBusqueda(valor)}
            />
          </Box>

          {/* Zonas, Etiquetas, Añadir e Importar ocupaban la mejor franja de
              la pantalla para usarse unas pocas veces al año. Recogidas aquí,
              siguen a un toque de distancia. */}
          {tablet600Up ? (
            <Button
              variant="tertiary"
              disableAutoStretch
              startIcon={<IconMore width={18} height={18} />}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              Gestionar
            </Button>
          ) : (
            // En el móvil la palabra le comía la mitad al buscador, que es lo
            // que de verdad se usa. El icono se queda; el nombre lo pone el
            // lector de pantalla.
            //
            // Relleno, no un anillo: el buscador de al lado es una píldora
            // rellena y sin canto, así que un aro alrededor del icono lo
            // convertía en una pieza de otra familia. Mismo fondo y mismo
            // alto que él — se leen como una pareja (§6.4b: una caja que
            // sostiene un icono se separa con RELLENO, no con un canto).
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Gestionar territorios"
              sx={{
                flexShrink: 0,
                backgroundColor: 'var(--grey-100)',
                borderRadius: 'var(--shape-full)',
                width: 48,
                height: 48,
              }}
            >
              <IconMore width={20} height={20} color="var(--accent-dark)" />
            </IconButton>
          )}
        </Stack>

        {/* Estado y etiquetas son dos filtros distintos, así que van en dos
            filas. Juntos en una sola, la fila se partía por donde cupiera y
            la línea divisoria acababa en medio de la nada. */}
        <Box sx={rielSx}>
          {ESTADO_FILTROS.map((f) => (
            <FilterChip
              key={f.valor}
              label={f.texto}
              selected={estado === f.valor}
              onClick={() => setEstado(f.valor)}
            />
          ))}
        </Box>

        {tags.length > 0 && (
          <Box sx={rielSx}>
            {tags.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.nombre}
                color={tag.color}
                selected={etiquetasElegidas.includes(tag.id)}
                onClick={() => toggleEtiqueta(tag.id)}
              />
            ))}
          </Box>
        )}

        {filtrando && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography className="label-small-medium" color="var(--ink-2)">
              {visibles === 1
                ? `1 territorio de ${territories.length}`
                : `${visibles} territorios de ${territories.length}`}
            </Typography>
            <Button variant="small" onClick={limpiar} disableAutoStretch>
              Quitar filtros
            </Button>
          </Stack>
        )}
      </Box>

      {/* ── Selección múltiple ──────────────────────────────────────── */}
      {selectionMode && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            // En el móvil el rótulo se lleva su propia línea y los botones van
            // juntos debajo. Metidos todos en la misma fila envolvían por donde
            // caía, y "Asignar" acababa arriba con "Eliminar" y "Hecho" solos
            // en la de abajo.
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <Typography
            className="body-small-medium"
            color="var(--ink-2)"
            sx={{ flexBasis: { mobile: '100%', tablet600: 'auto' } }}
          >
            {selectedIds.size === 1
              ? '1 territorio seleccionado'
              : `${selectedIds.size} territorios seleccionados`}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ marginLeft: 'auto', flexWrap: 'wrap', gap: '8px' }}
          >
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="main"
                  disableAutoStretch
                  onClick={onBulkAsignar}
                  disabled={deleting}
                >
                  Asignar ({selectedIds.size})
                </Button>
                <Button
                  variant="secondary"
                  color="red"
                  disableAutoStretch
                  onClick={onBulkDelete}
                  disabled={deleting}
                >
                  Eliminar ({selectedIds.size})
                </Button>
              </>
            )}
            <Button
              variant="tertiary"
              disableAutoStretch
              onClick={onToggleSelectionMode}
            >
              Hecho
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Las zonas ───────────────────────────────────────────────── */}
      {territories.length === 0 ? (
        <EmptyState
          icon={<IconInfo color="var(--accent-dark)" />}
          title={loading ? 'Cargando territorios…' : 'Aún no hay territorios'}
          description={
            loading
              ? 'Un momento.'
              : 'Crea una zona y luego añade territorios a mano o importa un archivo KML desde "Gestionar".'
          }
        />
      ) : conResultados.length === 0 ? (
        <EmptyState
          icon={<IconInfo color="var(--accent-dark)" />}
          title="Ningún territorio coincide"
          description="Prueba con otro número, otro nombre o quita algún filtro."
        />
      ) : (
        conResultados.map(({ zone, items, total }) => (
          <ZoneSection
            key={zone.id}
            zone={zone}
            items={items}
            total={total}
            filtrando={filtrando}
            assignedIds={assignedIds}
            daysUntilReassignable={daysUntilReassignable}
            tags={tags}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onView={onView}
          />
        ))
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            // Un menú es la continuación del control que lo abre, no un
            // diálogo: `--shape-sm`, no `--shape-xl` (§2.3).
            style: {
              borderRadius: 'var(--shape-sm)',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--card)',
              minWidth: 232,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onToggleSelectionMode();
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconCheckboxMultiple width={20} height={20} />
            <Typography className="body-regular">
              {selectionMode ? 'Salir de la selección' : 'Seleccionar varios'}
            </Typography>
          </Stack>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onOpenCrear();
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconAdd width={20} height={20} />
            <Typography className="body-regular">Añadir territorio</Typography>
          </Stack>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onOpenImport();
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {/* No el mismo icono de mapa que "Zonas": dos entradas del mismo
                menú con el mismo dibujo se leen como la misma acción. */}
            <IconImportFile width={20} height={20} />
            <Typography className="body-regular">Importar KML</Typography>
          </Stack>
        </MenuItem>
        <Divider sx={{ borderColor: 'var(--line)', my: '4px' }} />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onOpenZonas();
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconMapOverview width={20} height={20} />
            <Typography className="body-regular">Zonas</Typography>
          </Stack>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onOpenEtiquetas();
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconCustom width={20} height={20} />
            <Typography className="body-regular">Etiquetas</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TerritoriosTab;
