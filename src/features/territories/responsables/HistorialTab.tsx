import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import PanelToolbar, { RielChips } from '@components/panel_toolbar';
import FilterChip from '@components/filter_chip';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Button from '@components/button';
import Badge from '@components/badge';
import { TerritoryCard } from '@features/territories/ui';
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
  getZoneName,
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
      .sort(
        (x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime()
      );
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
      // Se busca por lo mismo que se lee: ahora cada línea empieza por la
      // zona, así que escribir "Salinas" tiene que traer los de Salinas.
      const etiqueta = t
        ? `${getZoneName(t.zoneId, zones)} ${territoryLabel(t)}`.toLowerCase()
        : '';
      return persona.includes(lower) || etiqueta.includes(lower);
    });
  }, [movimientos, filtro, search, resolveName, territories, zones]);

  const enCurso = useMemo(
    () => movimientos.filter((m) => m.enCurso).length,
    [movimientos]
  );
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
      <PanelToolbar
        busqueda={search}
        onBuscar={setSearch}
        placeholder="Buscar por publicador o territorio"
      >
        <RielChips>
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
        </RielChips>
      </PanelToolbar>

      {filtrados.length === 0 ? (
        <Typography className="body-small-regular" color="var(--ink-2)">
          {vacio}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {visible.map(({ asignacion: a, enCurso: abierta }) => {
            const t = territories.find((x) => x.id === a.territoryId);
            const color = t ? getZoneColor(t.zoneId, zones) : 'var(--ink-2)';
            // La zona va DENTRO del nombre del territorio, no en una pastilla
            // aparte: se lee "le asignó el Elda - Urbano 19", que es como se
            // dice en voz alta. El color de la zona sigue en la cápsula
            // lateral de la tarjeta; el nombre está para quien no se sepa el
            // código de colores, porque un "19" suelto vale para las tres
            // zonas.
            const tName = t
              ? `${getZoneName(t.zoneId, zones)} ${territoryLabel(t)}`
              : 'Territorio desconocido';
            const trabajado = a.status === 'trabajado';
            // Quién lo asignó. Todos los registros lo llevan, pero si algún
            // día llega uno importado sin el dato, se cae con elegancia a la
            // frase de antes en vez de dejar un hueco raro.
            const quienAsigno = a.assignedBy ? resolveName(a.assignedBy) : null;
            const seLoDioASiMismo = Boolean(
              a.assignedBy && a.assignedBy === a.personUid
            );
            // Misma marca "(C)" que usan el historial de Asignaciones y el
            // S-13: sin ella no habría forma de distinguir aquí una entrega
            // normal de una de campaña.
            // La "(C)" azul suelta pegada a un nombre no la entiende nadie:
            // se convierte en la misma etiqueta "Campaña" que el resto de la
            // app. Va al final de la frase, no incrustada en medio.
            const marcaCampana = a.isCampaign ? (
              <Badge size="small" color="accent" text="Campaña" />
            ) : null;

            return (
              <TerritoryCard key={a.id} accent={color}>
                <Stack
                  direction={{ mobile: 'column', tablet600: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                    >
                      <Typography
                        className="body-small-regular"
                        color="var(--ink)"
                      >
                        {abierta ? (
                          quienAsigno ? (
                            seLoDioASiMismo ? (
                              <>
                                <strong>{quienAsigno}</strong> tomó el{' '}
                                <strong>{tName}</strong>
                              </>
                            ) : (
                              <>
                                <strong>{quienAsigno}</strong> le asignó el{' '}
                                <strong>{tName}</strong> a{' '}
                                <strong>{resolveName(a.personUid)}</strong>
                              </>
                            )
                          ) : (
                            <>
                              <strong>{resolveName(a.personUid)}</strong> tiene
                              el <strong>{tName}</strong>
                            </>
                          )
                        ) : (
                          <>
                            <strong>{resolveName(a.personUid)}</strong> devolvió
                            el <strong>{tName}</strong> como{' '}
                            <strong>
                              {trabajado ? 'trabajado' : 'no trabajado'}
                            </strong>
                          </>
                        )}
                      </Typography>
                      {marcaCampana}
                    </Stack>
                    <Typography
                      className="label-small-regular"
                      color="var(--ink-2)"
                    >
                      {abierta ? (
                        <>
                          Entregado el{' '}
                          {formatTerritoryDate(
                            a.assignedAt,
                            settings.dateFormat
                          )}
                        </>
                      ) : (
                        <>
                          {quienAsigno
                            ? `Se lo asignó ${quienAsigno} el `
                            : 'Asignado el '}
                          {formatTerritoryDate(
                            a.assignedAt,
                            settings.dateFormat
                          )}{' '}
                          · Devuelto el{' '}
                          {formatTerritoryDate(
                            a.returnedAt!,
                            settings.dateFormat
                          )}
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
                        sx={{
                          color: 'var(--ink-2)',
                          fontStyle: 'italic',
                          maxWidth: '300px',
                        }}
                      >
                        &quot;{displayText(a.notas)}&quot;
                      </Typography>
                    )}
                    {abierta && (
                      <Badge size="small" color="orange" text="En curso" />
                    )}
                  </Stack>
                </Stack>
              </TerritoryCard>
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
