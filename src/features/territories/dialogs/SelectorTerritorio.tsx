import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Button from '@components/button';
import FilterChip from '@components/filter_chip';
import { IconArrowBack, IconChevronRight } from '@components/icons';
import { EstadoBadge } from '@features/territories/ui';
import {
  territoriesState,
  territoryAssignedIdsState,
  territorySettingsState,
  territoryZonesSortedState,
} from '@states/territories';
import { Territory } from '@definition/territories';
import { isInCooldown, territoryLabel } from '@services/app/territories';

/**
 * Elegir un territorio para asignar.
 *
 * Antes era una lista plana con las tres zonas mezcladas: salía «1» de
 * Salinas, «1» de Elda - Rural y «1» de Elda - Urbano seguidos, y había que
 * leer cada línea entera para saber cuál era cuál. Ahora se entra por zona y
 * dentro se ve la lista de esa zona, que es como se piensa al repartir.
 *
 * Solo aparecen los territorios LIBRES: uno ya asignado no se puede dar, así
 * que enseñarlo solo estorba. Los que están «en descanso» (recién trabajados)
 * sí salen, marcados — a veces hay que darlos igual.
 */

type Orden = 'numero' | 'antiguedad';

type Props = {
  /** Territorio ya elegido, si lo hay. */
  value: string | null;
  onChange: (territoryId: string | null) => void;
  /** Se está cargando la lista todavía. */
  cargando?: boolean;
};

/** «hace 3 meses», «hace 12 días», «sin registro». */
const desdeUltimoTrabajo = (t: Territory): string => {
  if (!t.lastWorkedAt) return 'Sin registro de haberse trabajado';
  const dias = Math.floor(
    (Date.now() - new Date(t.lastWorkedAt).getTime()) / 86_400_000
  );
  if (dias < 1) return 'Trabajado hoy';
  if (dias === 1) return 'Trabajado ayer';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 24) return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  return `Hace ${Math.floor(meses / 12)} años`;
};

/** Días desde el último trabajo; los que no se han trabajado nunca van
 *  primero, que es justo lo que se busca al ordenar por antigüedad. */
const antiguedad = (t: Territory): number =>
  t.lastWorkedAt
    ? (Date.now() - new Date(t.lastWorkedAt).getTime()) / 86_400_000
    : Number.MAX_SAFE_INTEGER;

const SelectorTerritorio = ({ value, onChange, cargando = false }: Props) => {
  const territories = useAtomValue(territoriesState);
  const zonas = useAtomValue(territoryZonesSortedState);
  const asignados = useAtomValue(territoryAssignedIdsState);
  const settings = useAtomValue(territorySettingsState);
  // `subscribeSettings` reemplaza el objeto entero por lo que haya guardado,
  // así que si el documento de la congregación es antiguo y no trae este
  // campo, llegaría `undefined` y `isInCooldown` calcularía con una fecha
  // inválida: nunca marcaría «En descanso» y nadie sabría por qué.
  const diasDescanso = settings.daysUntilReassignable ?? 30;

  const [zonaAbierta, setZonaAbierta] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>('numero');

  const elegido = useMemo(
    () => territories.find((t) => t.id === value) ?? null,
    [territories, value]
  );

  /** Libres por zona (los asignados no se pueden dar). */
  const libresPorZona = useMemo(() => {
    const mapa = new Map<string, Territory[]>();
    for (const t of territories) {
      if (asignados.has(t.id)) continue;
      const lista = mapa.get(t.zoneId) ?? [];
      lista.push(t);
      mapa.set(t.zoneId, lista);
    }
    return mapa;
  }, [territories, asignados]);

  const listaZona = useMemo(() => {
    if (!zonaAbierta) return [];
    const lista = [...(libresPorZona.get(zonaAbierta) ?? [])];
    if (orden === 'antiguedad') {
      lista.sort((a, b) => antiguedad(b) - antiguedad(a));
    } else {
      lista.sort((a, b) =>
        a.numero.localeCompare(b.numero, undefined, { numeric: true })
      );
    }
    return lista;
  }, [zonaAbierta, libresPorZona, orden]);

  // ── ya hay uno elegido: se muestra en pequeño con un botón para cambiarlo ──
  if (elegido) {
    const descansando = isInCooldown(elegido, diasDescanso);
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: '12px 14px',
          borderRadius: 'var(--shape-md)',
          border: '1px solid var(--accent-200)',
          backgroundColor: 'var(--accent-100)',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            className="body-regular-semibold"
            sx={{ color: 'var(--ink)' }}
          >
            {territoryLabel(elegido)}
          </Typography>
          <Typography
            className="label-small-regular"
            sx={{ color: 'var(--ink-2)' }}
          >
            {descansando ? 'En descanso · ' : ''}
            {desdeUltimoTrabajo(elegido)}
          </Typography>
        </Box>
        <Button
          variant="tertiary"
          disableAutoStretch
          onClick={() => onChange(null)}
        >
          Cambiar
        </Button>
      </Box>
    );
  }

  if (cargando) {
    return (
      <Typography
        className="body-small-regular"
        sx={{ color: 'var(--ink-2)', py: 2 }}
      >
        Cargando territorios…
      </Typography>
    );
  }

  // ── nivel 1: las zonas ──
  if (!zonaAbierta) {
    const conLibres = zonas.filter(
      (z) => (libresPorZona.get(z.id) ?? []).length > 0
    );

    if (conLibres.length === 0) {
      return (
        <Typography
          className="body-small-regular"
          sx={{ color: 'var(--ink-2)', py: 2 }}
        >
          No hay ningún territorio libre ahora mismo.
        </Typography>
      );
    }

    return (
      <Stack spacing={1}>
        {conLibres.map((z) => {
          const n = (libresPorZona.get(z.id) ?? []).length;
          return (
            <Box
              key={z.id}
              component="button"
              type="button"
              onClick={() => setZonaAbierta(z.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: 1.5,
                p: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--shape-md)',
                border: '1px solid var(--accent-200)',
                backgroundColor: 'var(--white)',
                transition:
                  'background-color var(--motion-fast) var(--ease-standard)',
                '&:hover': { backgroundColor: 'var(--accent-100)' },
              }}
            >
              {/* El punto de color de la zona. En TODO el módulo una zona se
                  reconoce por su color —la cápsula de las tarjetas, el
                  polígono del mapa, la cabecera de la lista—; justo aquí, en
                  el momento de ELEGIR una, era la única lista donde no
                  aparecía. */}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 'var(--shape-full)',
                  flexShrink: 0,
                  backgroundColor: z.color,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${z.color} 20%, transparent)`,
                }}
              />
              <Typography
                className="body-regular-semibold"
                sx={{ flex: 1, color: 'var(--ink)' }}
              >
                {z.nombre}
              </Typography>
              <Typography
                className="label-small-regular"
                sx={{ color: 'var(--ink-2)' }}
              >
                {n} {n === 1 ? 'libre' : 'libres'}
              </Typography>
              {/* Era el carácter "›" escrito a pelo: hereda el tipo de letra,
                  así que su grosor y su tamaño no coincidían con ninguna otra
                  flecha de la app. */}
              <IconChevronRight color="var(--ink-3)" width={20} height={20} />
            </Box>
          );
        })}
      </Stack>
    );
  }

  // ── nivel 2: los territorios de la zona ──
  const zona = zonas.find((z) => z.id === zonaAbierta);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="tertiary"
          disableAutoStretch
          startIcon={<IconArrowBack color="var(--accent-main)" />}
          onClick={() => setZonaAbierta(null)}
        >
          Zonas
        </Button>
        <Typography
          className="body-regular-semibold"
          sx={{ flex: 1, color: 'var(--ink)', textAlign: 'right' }}
        >
          {zona?.nombre}
        </Typography>
      </Box>

      {/* Ordenar por antigüedad es lo que se quiere casi siempre al repartir:
          se da el que lleva más tiempo sin trabajarse. Antes había que salir a
          la pantalla de Estadísticas a mirarlo y volver. */}
      <Stack direction="row" spacing={1}>
        <FilterChip
          label="Por número"
          selected={orden === 'numero'}
          onClick={() => setOrden('numero')}
        />
        <FilterChip
          label="Sin trabajar hace más"
          selected={orden === 'antiguedad'}
          onClick={() => setOrden('antiguedad')}
        />
      </Stack>

      <Stack spacing={0.75} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
        {listaZona.map((t) => {
          const descansando = isInCooldown(t, diasDescanso);
          return (
            <Box
              key={t.id}
              component="button"
              type="button"
              onClick={() => onChange(t.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: 1.5,
                p: '10px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--shape-sm)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--white)',
                transition:
                  'background-color var(--motion-fast) var(--ease-standard)',
                '&:hover': { backgroundColor: 'var(--accent-100)' },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  className="body-regular-semibold"
                  sx={{ color: 'var(--ink)' }}
                >
                  {t.numero}
                  {t.nombre ? ` · ${t.nombre}` : ''}
                </Typography>
                <Typography
                  className="label-small-regular"
                  sx={{ color: 'var(--ink-2)' }}
                >
                  {typeof t.numeroViviendas === 'number'
                    ? `${t.numeroViviendas} ${t.numeroViviendas === 1 ? 'vivienda' : 'viviendas'} · `
                    : ''}
                  {desdeUltimoTrabajo(t)}
                </Typography>
              </Box>
              {/* Cuarta copia del mismo chip de estado, esta con sus propios
                  `--grey-150` y `label-small-medium`. */}
              <EstadoBadge estado={descansando ? 'descanso' : 'libre'} />
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default SelectorTerritorio;
