import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import SearchBar from '@components/search_bar';
import FilterChip from '@components/filter_chip';
import EmptyState from '@components/empty_state';
import { IconDelete, IconInfo } from '@components/icons';
import { useConfirm } from '@components/confirm_dialog';
import { TerritoryCard } from '@features/territories/ui';
import { usePersonName } from '@features/territories/usePersonName';
import { congIDState, userLocalUIDState } from '@states/settings';
import {
  territoriesState,
  territoryLocationsState,
  territorySettingsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryLocation } from '@definition/territories';
import {
  approveLocation,
  deleteLocation,
} from '@services/firebase/territories';
import { displaySnackNotification } from '@services/states/app';
import {
  displayText,
  formatTerritoryDate,
  getZoneColor,
  getZoneName,
  territoryLabel,
} from '@services/app/territories';

/**
 * La pestaña "Ubicaciones" del panel de responsables.
 *
 * Las direcciones de "No visitar" solo se podían ver y aprobar ENTRANDO en el
 * territorio al que pertenecen, una por una. El aviso decía que había una
 * pendiente, pero para aprobarla había que acordarse de en qué territorio
 * estaba y abrirlo. Con 130 territorios eso significa que una dirección
 * pendiente se podía quedar meses ahí.
 *
 * Aquí están todas juntas: las pendientes primero, las aprobadas para
 * consultarlas, y de cada una se ve a qué territorio pertenece sin tener que
 * abrirlo.
 */

type Filtro = 'pendientes' | 'aprobadas' | 'todas';

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'aprobadas', texto: 'Aprobadas' },
  { valor: 'todas', texto: 'Todas' },
];

type Props = {
  /** Abre la ficha del territorio al que pertenece la dirección. */
  onView: (t: Territory) => void;
};

const UbicacionesTab = ({ onView }: Props) => {
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const locations = useAtomValue(territoryLocationsState);
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const { confirm, ConfirmDialogNode } = useConfirm();

  const [busqueda, setBusqueda] = useState('');
  // Se abre en "Pendientes" a propósito: es lo único de esta pantalla que
  // reclama algo. Si no hay ninguna, el estado vacío lo dice y las aprobadas
  // están a un toque.
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [aprobando, setAprobando] = useState<string | null>(null);

  const pendientes = useMemo(
    () => locations.filter((l) => !l.aprobada).length,
    [locations]
  );

  /** Cada dirección con su territorio y su zona ya resueltos. */
  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return locations
      .map((l) => {
        const territory = territories.find((t) => t.id === l.territoryId);
        return {
          location: l,
          territory,
          zona: territory ? getZoneName(territory.zoneId, zones) : '—',
          color: territory
            ? getZoneColor(territory.zoneId, zones)
            : 'var(--ink-2)',
        };
      })
      .filter(({ location, territory, zona }) => {
        if (filtro === 'pendientes' && location.aprobada) return false;
        if (filtro === 'aprobadas' && !location.aprobada) return false;

        if (!texto) return true;

        // Se busca por lo que se lee: la dirección, la nota y el territorio
        // con su zona.
        const donde = territory
          ? `${zona} ${territoryLabel(territory)}`.toLowerCase()
          : '';
        return (
          displayText(location.direccion).toLowerCase().includes(texto) ||
          displayText(location.nota).toLowerCase().includes(texto) ||
          donde.includes(texto)
        );
      })
      .sort((a, b) => {
        // Las pendientes arriba, y dentro de cada grupo la más nueva primero.
        if (a.location.aprobada !== b.location.aprobada) {
          return a.location.aprobada ? 1 : -1;
        }
        return b.location.createdAt.localeCompare(a.location.createdAt);
      });
  }, [locations, territories, zones, filtro, busqueda]);

  const handleAprobar = async (l: TerritoryLocation) => {
    setAprobando(l.id);
    try {
      // Actualización parcial (`approveLocation`), NUNCA un guardado del
      // documento entero: la dirección va cifrada y este dispositivo puede no
      // tener la llave, así que reescribirla la dejaría como llegó o vacía.
      await approveLocation(congId, l.id, uid);
      displaySnackNotification({
        severity: 'success',
        header: 'Dirección aprobada',
        message: 'Ya se ve en el territorio como "No visitar".',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo aprobar la dirección.',
      });
    } finally {
      setAprobando(null);
    }
  };

  const handleBorrar = async (l: TerritoryLocation) => {
    const ok = await confirm({
      message: '¿Borrar esta dirección? Esta acción no se puede deshacer.',
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteLocation(congId, l.id);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo eliminar la dirección.',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}

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
        <SearchBar
          placeholder="Buscar por dirección o territorio"
          value={busqueda}
          onSearch={(valor: string) => setBusqueda(valor)}
        />

        <Stack
          direction="row"
          alignItems="center"
          sx={{ flexWrap: 'wrap', gap: '6px' }}
        >
          {FILTROS.map((f) => (
            <FilterChip
              key={f.valor}
              label={
                f.valor === 'pendientes' && pendientes > 0
                  ? `Pendientes (${pendientes})`
                  : f.texto
              }
              selected={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            />
          ))}
        </Stack>
      </Box>

      {filas.length === 0 ? (
        <EmptyState
          icon={<IconInfo color="var(--accent-dark)" />}
          title={
            filtro === 'pendientes'
              ? 'No hay direcciones pendientes'
              : busqueda
                ? 'Ninguna dirección coincide'
                : 'Todavía no hay direcciones de "No visitar"'
          }
          description={
            filtro === 'pendientes'
              ? 'Cuando un publicador añada una, aparecerá aquí para que la apruebes.'
              : busqueda
                ? 'Prueba con otra dirección o con el número del territorio.'
                : 'Se añaden desde la ficha de cada territorio, en "Info".'
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {filas.map(({ location: l, territory, zona, color }) => (
            <TerritoryCard key={l.id} accent={color}>
              <Stack
                direction={{ mobile: 'column', tablet600: 'row' }}
                justifyContent="space-between"
                alignItems={{ mobile: 'stretch', tablet600: 'center' }}
                spacing={1.5}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                  >
                    <Typography
                      className="body-regular-semibold"
                      color="var(--ink)"
                    >
                      {displayText(l.direccion)}
                    </Typography>
                    {!l.aprobada && (
                      <Badge size="small" color="orange" text="Pendiente" />
                    )}
                  </Stack>

                  {l.nota && (
                    <Typography
                      className="body-small-regular"
                      color="var(--ink-2)"
                    >
                      {displayText(l.nota)}
                    </Typography>
                  )}

                  <Typography
                    className="label-small-regular"
                    color="var(--ink-3)"
                  >
                    {territory
                      ? `${zona} ${territoryLabel(territory)}`
                      : 'Territorio eliminado'}
                    {' · '}
                    La añadió {resolveName(l.addedBy)} el{' '}
                    {formatTerritoryDate(l.createdAt, settings.dateFormat)}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="flex-end"
                  sx={{ flexShrink: 0 }}
                >
                  {!l.aprobada && (
                    <Button
                      variant="main"
                      disableAutoStretch
                      onClick={() => handleAprobar(l)}
                      disabled={aprobando === l.id}
                    >
                      Aprobar
                    </Button>
                  )}
                  {territory && (
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => onView(territory)}
                    >
                      Ver territorio
                    </Button>
                  )}
                  <Button
                    variant="small"
                    disableAutoStretch
                    onClick={() => handleBorrar(l)}
                    ariaLabel="Borrar dirección"
                  >
                    <IconDelete
                      color="var(--red-main)"
                      width={20}
                      height={20}
                    />
                  </Button>
                </Stack>
              </Stack>
            </TerritoryCard>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default UbicacionesTab;
