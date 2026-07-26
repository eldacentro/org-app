import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import TextField from '@components/textfield';
import FilterChip from '@components/filter_chip';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Button from '@components/button';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesState,
  territorySettingsState,
  territoriesLoadingState,
} from '@states/territories';
import {
  territoryLabel,
  formatTerritoryDate,
  getZoneColor,
  displayText,
} from '@services/app/territories';
import { usePersonName } from '../usePersonName';

/**
 * Historial de movimientos de territorios.
 *
 * Antes solo listaba las asignaciones YA DEVUELTAS, así que al dar un
 * territorio no aparecía nada: quien acababa de repartir tres territorios
 * venía aquí a comprobarlo y veía el historial igual que antes, como si no
 * hubiera pasado nada. Pero entregar un territorio también es algo que ha
 * pasado, y es lo que uno quiere repasar justo después de hacerlo.
 *
 * Ahora se ven los dos tipos de movimiento, ordenados por lo último que
 * ocurrió en cada asignación: la fecha de devolución si ya se devolvió, y la
 * de entrega si sigue en curso.
 */

type Filtro = 'todo' | 'en_curso' | 'devueltos';

const HistorialTab = () => {
  const assignments = useAtomValue(territoryAssignmentsState);
  const loading = useAtomValue(territoriesLoadingState);
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [limit, setLimit] = useState(30);

  /** Cada asignación es un movimiento, con la fecha de lo último que le pasó. */
  const movimientos = useMemo(() => {
    return assignments
      .map((a) => ({
        asignacion: a,
        enCurso: !a.returnedAt,
        fecha: a.returnedAt ?? a.assignedAt,
      }))
      .sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
  }, [assignments]);

  const filtrados = useMemo(() => {
    let lista = movimientos;

    if (filtro === 'en_curso') lista = lista.filter((m) => m.enCurso);
    else if (filtro === 'devueltos') lista = lista.filter((m) => !m.enCurso);

    if (!search.trim()) return lista;
    const lower = search.toLowerCase();
    return lista.filter(({ asignacion: a }) => {
      const persona = resolveName(a.personUid).toLowerCase();
      const t = territories.find((x) => x.id === a.territoryId);
      const etiqueta = t ? territoryLabel(t).toLowerCase() : '';
      return persona.includes(lower) || etiqueta.includes(lower);
    });
  }, [movimientos, filtro, search, resolveName, territories]);

  const enCurso = useMemo(() => movimientos.filter((m) => m.enCurso).length, [movimientos]);
  const visible = filtrados.slice(0, limit);

  const vacio = loading
    ? 'Cargando historial…'
    : search
      ? 'No hay resultados para tu búsqueda.'
      : filtro === 'en_curso'
        ? 'Ahora mismo no hay ningún territorio entregado.'
        : filtro === 'devueltos'
          ? 'Todavía no se ha devuelto ningún territorio.'
          : 'Aún no hay ningún movimiento.';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ maxWidth: 400 }}>
        <TextField
          label="Buscar por publicador o territorio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <FilterChip
          label="Todo"
          selected={filtro === 'todo'}
          onClick={() => setFiltro('todo')}
        />
        <FilterChip
          label={`En curso (${enCurso})`}
          selected={filtro === 'en_curso'}
          onClick={() => setFiltro('en_curso')}
        />
        <FilterChip
          label="Devueltos"
          selected={filtro === 'devueltos'}
          onClick={() => setFiltro('devueltos')}
        />
      </Stack>

      {filtrados.length === 0 ? (
        <Typography className="body-small-regular" color="var(--ink-2)">
          {vacio}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {visible.map(({ asignacion: a, enCurso: abierta }) => {
            const t = territories.find((x) => x.id === a.territoryId);
            const tName = t ? territoryLabel(t) : 'Territorio desconocido';
            const color = t ? getZoneColor(t.zoneId, zones) : 'var(--ink-2)';
            const trabajado = a.status === 'trabajado';
            // Quién lo asignó. Todos los registros lo llevan, pero si algún
            // día llega uno importado sin el dato, se cae con elegancia a la
            // frase de antes en vez de dejar un hueco raro.
            const quienAsigno = a.assignedBy ? resolveName(a.assignedBy) : null;
            const seLoDioASiMismo = Boolean(a.assignedBy && a.assignedBy === a.personUid);
            // Misma marca "(C)" que usan el historial de Asignaciones y el
            // S-13: sin ella no habría forma de distinguir aquí una entrega
            // normal de una de campaña.
            const marcaCampana = a.isCampaign ? (
              <span style={{ color: 'var(--blue-main)' }} title="Asignación de campaña">
                {' '}(C)
              </span>
            ) : null;

            return (
              <Box
                key={a.id}
                sx={{
                  p: 1.5,
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--line)',
                  borderLeft: `5px solid ${color}`,
                  backgroundColor: 'var(--card)',
                }}
              >
                <Stack
                  direction={{ mobile: 'column', tablet600: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                  spacing={1}
                >
                  <Box>
                    <Typography className="body-small-regular" sx={{ color: 'var(--ink)' }}>
                      {abierta ? (
                        quienAsigno ? (
                          seLoDioASiMismo ? (
                            <>
                              <strong>{quienAsigno}</strong>
                              {marcaCampana} tomó el <strong>{tName}</strong>
                            </>
                          ) : (
                            <>
                              <strong>{quienAsigno}</strong> le asignó el{' '}
                              <strong>{tName}</strong> a{' '}
                              <strong>{resolveName(a.personUid)}</strong>
                              {marcaCampana}
                            </>
                          )
                        ) : (
                          <>
                            <strong>{resolveName(a.personUid)}</strong>
                            {marcaCampana} tiene el <strong>{tName}</strong>
                          </>
                        )
                      ) : (
                        <>
                          <strong>{resolveName(a.personUid)}</strong>
                          {marcaCampana} devolvió el <strong>{tName}</strong> como{' '}
                          <strong>{trabajado ? 'trabajado' : 'no trabajado'}</strong>
                        </>
                      )}
                    </Typography>
                    <Typography className="label-small-regular" color="var(--ink-2)">
                      {abierta ? (
                        <>Entregado el {formatTerritoryDate(a.assignedAt, settings.dateFormat)}</>
                      ) : (
                        <>
                          {quienAsigno ? `Se lo asignó ${quienAsigno} el ` : 'Asignado el '}
                          {formatTerritoryDate(a.assignedAt, settings.dateFormat)} · Devuelto el{' '}
                          {formatTerritoryDate(a.returnedAt!, settings.dateFormat)}
                        </>
                      )}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ flexShrink: 0 }}
                  >
                    {a.notas && (
                      <Typography
                        className="label-small-regular"
                        sx={{ color: 'var(--ink-2)', fontStyle: 'italic', maxWidth: '300px' }}
                      >
                        &quot;{displayText(a.notas)}&quot;
                      </Typography>
                    )}
                    {abierta && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 'var(--radius-max)',
                          backgroundColor: 'var(--orange-secondary)',
                        }}
                      >
                        <Typography
                          className="label-small-medium"
                          sx={{ color: 'var(--orange-dark)', whiteSpace: 'nowrap' }}
                        >
                          En curso
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}

          {limit < filtrados.length && (
            <Button
              variant="tertiary"
              onClick={() => setLimit((l) => l + 30)}
              sx={{ mt: 1, alignSelf: 'center' }}
            >
              Cargar más
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default HistorialTab;
