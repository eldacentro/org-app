import { useMemo, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack } from '@mui/material';
import { displaySnackNotification } from '@services/states/app';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import CountBadge from '@components/count_badge';
import Tooltip from '@components/tooltip';
import accentSurface from '@components/accent_surface';
import { EstadoBadge } from '@features/territories/ui';
import { IconCheckCircle, IconInfo } from '@components/icons';
import {
  territoriesState,
  territoryAssignmentsState,
  territorySettingsState,
  territoriesLoadingState,
  territoryZonesState,
} from '@states/territories';
import {
  Territory,
  TerritoryAssignment,
  TerritoryZone,
} from '@definition/territories';
import { congIDState, userLocalUIDState } from '@states/settings';
import { saveNotice } from '@services/firebase/territories';
import {
  daysSince,
  formatTerritoryDate,
  getZoneName,
  isInCooldown,
  isOverdue,
  statsRangeStart,
  serviceYearRange,
  territoryLabel,
} from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';
import { apiSendTerritoryPush } from '@services/api/territories';

type Props = {
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
};

// Rediseñada para verse "de un vistazo": antes cada tarjeta ocupaba casi una
// pantalla completa en móvil (apiladas en columna, había que hacer mucho
// scroll para ver las 4). Ahora es una cuadrícula 2x2 compacta — mismo dato,
// mucha menos altura por tarjeta (sin la fila "Progreso" separada, barra más
// fina con el % en la misma línea).
const KpiCard = ({
  title,
  value,
  total,
  color,
  subtext,
  info,
}: {
  title: string;
  value: number;
  total?: number;
  color: string;
  subtext?: string;
  /** Aclaración opcional (tooltip) cuando el nombre de la métrica no basta
   *  para entenderla a simple vista — ej. distinguir "Vencidos" de "Atrasados". */
  info?: string;
}) => (
  // Una cifra no se pulsa. Se levantaba 2px y encendía sombra al pasar el
  // ratón, así que las cuatro tarjetas de la cuadrícula parecían botones.
  // Y la barra de color iba pegada al canto izquierdo, cortada en seco por
  // las dos esquinas redondeadas: es la misma cápsula que el resto.
  <Box
    sx={{
      padding: '14px 16px',
      borderRadius: 'var(--shape-lg)',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--small-card-shadow)',
      minWidth: 0,
      ...(accentSurface(color, { tint: false }) as object),
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      spacing={'4px'}
      sx={{ mb: '6px' }}
    >
      <Typography
        className="label-small-semibold"
        sx={{ color: 'var(--ink-2)' }}
      >
        {title}
      </Typography>
      {info && (
        <Tooltip title={info}>
          <Box
            sx={{
              display: 'inline-flex',
              cursor: 'help',
              color: 'var(--ink-2)',
            }}
          >
            <IconInfo width={13} height={13} color="var(--ink-2)" />
          </Box>
        </Tooltip>
      )}
    </Stack>
    <Stack direction="row" alignItems="baseline" spacing={'6px'}>
      <Typography className="h1" sx={{ color: 'var(--ink)', lineHeight: 1.1 }}>
        {value}
      </Typography>
      {total !== undefined && (
        <Typography
          className="body-small-regular"
          sx={{ color: 'var(--ink-2)' }}
        >
          / {total}
        </Typography>
      )}
    </Stack>
    {total !== undefined && total > 0 && (
      <Stack
        direction="row"
        alignItems="center"
        spacing={'8px'}
        sx={{ mt: '10px' }}
      >
        <Box
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 'var(--shape-full)',
            backgroundColor: 'var(--line)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.round((value / total) * 100)}%`,
              backgroundColor: color,
              borderRadius: 'var(--shape-full)',
            }}
          />
        </Box>
        <Typography
          className="label-small-semibold"
          sx={{ color, flexShrink: 0 }}
        >
          {Math.round((value / total) * 100)}%
        </Typography>
      </Stack>
    )}
    {subtext && (
      <Typography
        className="label-small-regular"
        sx={{ color: 'var(--ink-2)', mt: '8px', display: 'block' }}
      >
        {subtext}
      </Typography>
    )}
  </Box>
);

// ─── Fila de territorio no asignado ────────────────────────────────────────────
// Antes "Vencidos" era una lista aparte y redundante con esta (ambas listan
// territorios libres). Ahora el estado "en descanso" se ve directamente aquí,
// que ya es la lista de referencia de "qué territorios entregar" — sin
// bloquear el botón Asignar (un responsable puede tener buena razón para
// saltárselo), solo marcado con claridad para decidir a simple vista.
const NoAsignadoRow = ({
  t,
  zones,
  dateFormat,
  daysUntilReassignable,
  onAsignar,
  showZone,
}: {
  t: Territory;
  zones: TerritoryZone[];
  dateFormat: string;
  daysUntilReassignable: number;
  onAsignar: (t: Territory) => void;
  showZone: boolean;
}) => {
  const resting = isInCooldown(t, daysUntilReassignable);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        padding: '16px',
        borderRadius: 'var(--shape-lg)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        // El borde izquierdo pasaba de 1 a 4px según estuviera en descanso o
        // no, así que las filas de una misma lista NO empezaban a la misma
        // altura: el texto de unas iba 3px más a la derecha que el de otras.
        // Y el borde se ponía azul al pasar el ratón por una fila que no se
        // pulsa — lo que se pulsa es el botón "Asignar".
        ...(resting ? (accentSurface('var(--grey-400)') as object) : {}),
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ flexWrap: 'wrap' }}
        >
          <Typography className="body-regular-semibold" color="var(--ink)">
            {territoryLabel(t)}
          </Typography>
          {showZone && (
            <Typography className="body-small-regular" color="var(--ink-2)">
              {getZoneName(t.zoneId, zones)}
            </Typography>
          )}
          {resting && <EstadoBadge estado="descanso" />}
        </Stack>
        <Typography className="label-small-regular" color="var(--ink-3)">
          {t.lastWorkedAt
            ? `Último trabajo: ${formatTerritoryDate(t.lastWorkedAt, dateFormat)}`
            : 'Nunca trabajado'}
        </Typography>
      </Box>
      <Button
        variant="tertiary"
        disableAutoStretch
        onClick={() => onAsignar(t)}
      >
        Asignar
      </Button>
    </Stack>
  );
};

// ─── Grupo por zona con "Ver más" ───────────────────────────────────────────────
const PAGE_SIZE = 10;

const ZoneGroup = ({
  zone,
  territories,
  dateFormat,
  daysUntilReassignable,
  onAsignar,
}: {
  zone: TerritoryZone;
  territories: Territory[];
  dateFormat: string;
  daysUntilReassignable: number;
  onAsignar: (t: Territory) => void;
}) => {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const visible = territories.slice(0, limit);
  const remaining = territories.length - limit;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Cabecera de zona */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: 'var(--shape-full)',
            backgroundColor: zone.color,
            flexShrink: 0,
          }}
        />
        <Typography
          className="label-small-semibold"
          sx={{
            color: 'var(--ink-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {zone.nombre}
        </Typography>
        <Typography
          className="label-small-regular"
          sx={{
            color: 'var(--ink-2)',
          }}
        >
          ·{' '}
          {territories.length === 1
            ? '1 territorio'
            : `${territories.length} territorios`}
        </Typography>
      </Stack>

      {/* Filas */}
      <Stack spacing={1.5}>
        {visible.map((t) => (
          <NoAsignadoRow
            key={t.id}
            t={t}
            zones={[zone]}
            dateFormat={dateFormat}
            daysUntilReassignable={daysUntilReassignable}
            onAsignar={onAsignar}
            showZone={false}
          />
        ))}
      </Stack>

      {/* Botón "Ver más" */}
      {remaining > 0 && (
        <Box sx={{ mt: 1.5, textAlign: 'center' }}>
          <Button
            variant="tertiary"
            onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
          >
            Ver {Math.min(remaining, PAGE_SIZE)} más de {zone.nombre}
          </Button>
        </Box>
      )}
    </Box>
  );
};

// ─── Tab principal ─────────────────────────────────────────────────────────────
const EstadisticasTab = ({ onAsignar, onEntregar }: Props) => {
  const territories = useAtomValue(territoriesState);
  const loading = useAtomValue(territoriesLoadingState);

  const assignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  // El número de "Trabajados" se lleva a la reunión del cuerpo de ancianos,
  // así que la tarjeta debe decir DE QUÉ periodo es. Antes ponía "En el
  // rango seleccionado" sin más, y el rango solo se veía entrando en
  // Configuración.
  const rangeLabel = useMemo(() => {
    if (settings.statsRange === 'service_year') {
      const { start, end } = serviceYearRange(new Date());
      return `Año de servicio ${start.getFullYear()}-${end.getFullYear()}`;
    }
    if (settings.statsRange === 'one_year') return 'Últimos 12 meses';
    return 'Todo el histórico';
  }, [settings.statsRange]);
  const congId = useAtomValue(congIDState);
  const currentUid = useAtomValue(userLocalUIDState);
  const resolveName = usePersonName();
  const { confirm, ConfirmDialogNode } = useConfirm();
  // Estado para "ver más" de la lista plana
  const [flatLimit, setFlatLimit] = useState(PAGE_SIZE);

  const stats = useMemo(() => {
    const total = territories.length;
    const rangeStart = statsRangeStart(settings.statsRange);

    // El ajuste "campañas en estadísticas" filtra las MÉTRICAS de trabajo
    // (atrasados), pero NUNCA la ocupación: un territorio ocupado por una
    // campaña está ocupado de verdad y no se puede asignar a nadie más.
    // Antes se filtraba también aquí, así que con el ajuste desactivado la
    // tarjeta decía "0 asignados / 130 libres" en plena campaña, y los
    // territorios de campaña salían en "No asignados" con un botón
    // "Asignar" que siempre daba error.
    const relevant = settings.statsIncludeCampaigns
      ? assignments
      : assignments.filter((a) => !a.isCampaign);

    const openByTerritory = new Set(
      assignments.filter((a) => !a.returnedAt).map((a) => a.territoryId)
    );

    const asignados = openByTerritory.size;
    const noAsignados = total - asignados;

    // "Trabajados" se calcula desde las asignaciones RELEVANTES, no desde
    // `territory.lastWorkedAt`. Ese campo lo escribe también el cierre de
    // campañas, así que con el ajuste "campañas en estadísticas" desactivado
    // el trabajo de campaña seguía contando igual: el interruptor no hacía
    // prácticamente nada y el porcentaje de cobertura estaba inflado.
    const workedInRange = new Set(
      relevant
        .filter(
          (a) =>
            a.status === 'trabajado' &&
            a.returnedAt &&
            new Date(a.returnedAt) >= rangeStart
        )
        .map((a) => a.territoryId)
    );

    let trabajados = 0;
    territories.forEach((t) => {
      if (workedInRange.has(t.id)) {
        trabajados += 1;
      } else if (openByTerritory.has(t.id) && settings.assignedCountsAsWorked) {
        trabajados += 1;
      }
    });

    // Atrasados
    const atrasados = relevant
      .filter(
        (a) =>
          !a.returnedAt && isOverdue(a.assignedAt, settings.daysUntilOverdue)
      )
      .sort(
        (x, y) =>
          new Date(x.assignedAt).getTime() - new Date(y.assignedAt).getTime()
      );

    // En descanso — territorios LIBRES que se devolvieron trabajados hace
    // menos de "daysUntilReassignable" días. Reemplaza al antiguo "Vencidos"
    // (que medía otra cosa completamente distinta con un umbral separado y
    // confuso — ver definition/territories.ts). Es sobre el TERRITORIO
    // (¿está listo para reasignarse?), no sobre una asignación.
    const enDescanso = territories.filter((t) =>
      isInCooldown(t, settings.daysUntilReassignable)
    );

    // No asignados durante más tiempo (SIN slice — ahora el slice lo hace cada ZoneGroup)
    const noAsignadosLista = territories
      .filter((t) => !openByTerritory.has(t.id))
      .sort((a, b) => {
        const ta = a.lastWorkedAt ? new Date(a.lastWorkedAt).getTime() : 0;
        const tb = b.lastWorkedAt ? new Date(b.lastWorkedAt).getTime() : 0;
        return ta - tb;
      });

    // Agrupados por zona
    const noAsignadosPorZona = zones
      .map((z) => ({
        zone: z,
        items: noAsignadosLista.filter((t) => t.zoneId === z.id),
      }))
      .filter((g) => g.items.length > 0);

    return {
      total,
      asignados,
      noAsignados,
      trabajados,
      atrasados,
      enDescanso,
      noAsignadosLista,
      noAsignadosPorZona,
    };
  }, [territories, assignments, zones, settings]);

  const notificar = async (a: TerritoryAssignment) => {
    const nombre = resolveName(a.personUid);
    const ok = await confirm({
      title: 'Notificar territorio atrasado',
      message: `¿Enviar aviso a ${nombre}? Le llegará al instante en su lista "Mis territorios".`,
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    try {
      await saveNotice(congId, {
        id: crypto.randomUUID(),
        personUid: a.personUid,
        title: 'Territorio atrasado',
        mensaje: settings.overdueMessage,
        territoryId: a.territoryId,
        sentBy: currentUid || undefined,
        createdAt: new Date().toISOString(),
        leido: false,
      });
      await apiSendTerritoryPush(
        [a.personUid],
        'Territorio atrasado',
        settings.overdueMessage || 'Tienes un territorio atrasado.',
        a.territoryId
      ).catch((err) => console.error('Failed to send push', err));
      displaySnackNotification({
        severity: 'success',
        header: 'Aviso enviado',
        message: `Se ha notificado a ${nombre}.`,
      });
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al notificar',
        message: 'No se pudo enviar el aviso. Inténtalo de nuevo.',
      });
    }
  };

  if (stats.total === 0) {
    return (
      <Typography className="body-small-regular" color="var(--ink-2)">
        {loading
          ? 'Cargando estadísticas…'
          : 'Aún no hay territorios para mostrar estadísticas.'}
      </Typography>
    );
  }

  // Lista plana paginada
  const flatVisible = stats.noAsignadosLista.slice(0, flatLimit);
  const flatRemaining = stats.noAsignadosLista.length - flatLimit;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {ConfirmDialogNode}
      {/* Resumen Dashboard — cuadrícula 2x2 en móvil / 4 en columna en
          escritorio, para verse "de un vistazo" sin tener que hacer scroll
          por tarjetas grandes apiladas una debajo de otra. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            mobile: '1fr 1fr',
            tablet600: 'repeat(4, 1fr)',
          },
          gap: '12px',
        }}
      >
        <KpiCard
          title="Asignados"
          value={stats.asignados}
          total={stats.total}
          color="var(--accent-main)"
          subtext={
            stats.noAsignados === 1
              ? '1 territorio libre'
              : `${stats.noAsignados} territorios libres`
          }
        />
        <KpiCard
          title="Trabajados"
          value={stats.trabajados}
          total={stats.total}
          color="var(--green-main)"
          subtext={rangeLabel}
        />
        <KpiCard
          title="Atrasados"
          value={stats.atrasados.length}
          color={
            stats.atrasados.length > 0 ? 'var(--red-main)' : 'var(--green-main)'
          }
          subtext={
            stats.atrasados.length === 0
              ? '¡Todo al día!'
              : 'Requieren atención'
          }
          info="Llevan asignados más tiempo del normal sin devolverse (umbral configurable en Ajustes)."
        />
        <KpiCard
          title="En descanso"
          value={stats.enDescanso.length}
          color="var(--grey-400)"
          subtext={
            stats.enDescanso.length === 0 ? 'Ninguno' : 'Se ven marcados abajo'
          }
          info="Territorios libres que se devolvieron trabajados hace poco — todavía dentro del tiempo de descanso configurado (ver «Días de descanso antes de reasignar» en Configuración). Se pueden ver marcados en la lista de «No asignados»."
        />
      </Box>

      {/* Territorios atrasados */}
      <Box>
        {/* El contador en su chapa, no entre paréntesis dentro del título. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 2 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Territorios atrasados
          </Typography>
          <CountBadge value={stats.atrasados.length} />
        </Box>
        {stats.atrasados.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 'var(--shape-md)',
              border: '1px dashed var(--line)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <IconCheckCircle width={24} height={24} color="var(--green-main)" />
            <Typography className="body-small-regular" color="var(--ink-2)">
              No hay territorios atrasados. ¡Gran trabajo!
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {stats.atrasados.map((a) => {
              const t = territories.find((x) => x.id === a.territoryId);
              return (
                <Stack
                  key={a.id}
                  direction={{ mobile: 'column', tablet600: 'row' }}
                  alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{
                    padding: '16px',
                    borderRadius: 'var(--shape-lg)',
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--card)',
                    ...(accentSurface('var(--red-main)') as object),
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="baseline"
                      spacing={1}
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <Typography
                        className="body-regular-semibold"
                        color="var(--ink)"
                      >
                        {t ? territoryLabel(t) : '—'}
                      </Typography>
                      <Typography
                        className="body-small-regular"
                        color="var(--ink-2)"
                      >
                        {resolveName(a.personUid)}
                      </Typography>
                    </Stack>
                    <Typography
                      className="label-small-regular"
                      color="var(--ink-3)"
                    >
                      Asignado el{' '}
                      {formatTerritoryDate(a.assignedAt, settings.dateFormat)} ·
                      Hace{' '}
                      <strong style={{ color: 'var(--red-main)' }}>
                        {daysSince(a.assignedAt)} días
                      </strong>
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: { mobile: 1, tablet600: 0 }, flexShrink: 0 }}
                  >
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => notificar(a)}
                    >
                      Notificar
                    </Button>
                    <Button
                      variant="main"
                      disableAutoStretch
                      onClick={() => onEntregar(a)}
                    >
                      Entregar
                    </Button>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* No asignados durante más tiempo */}
      <Box>
        {/* El contador en su chapa, no entre paréntesis dentro del título. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 2 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            No asignados durante más tiempo
          </Typography>
          <CountBadge value={stats.noAsignadosLista.length} />
        </Box>

        {stats.noAsignadosLista.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 'var(--shape-md)',
              border: '1px dashed var(--line)',
              textAlign: 'center',
            }}
          >
            <Typography className="body-small-regular" color="var(--ink-2)">
              Todos los territorios están asignados actualmente.
            </Typography>
          </Box>
        ) : settings.statsGrouping === 'zone' ? (
          // ── Agrupado por zona (10 por zona + "Ver más") ─────────────────
          <>
            {stats.noAsignadosPorZona.map(({ zone, items }) => (
              <ZoneGroup
                key={zone.id}
                zone={zone}
                territories={items}
                dateFormat={settings.dateFormat}
                daysUntilReassignable={settings.daysUntilReassignable}
                onAsignar={onAsignar}
              />
            ))}
          </>
        ) : (
          // ── Lista plana paginada ──────────────────────────────────────────
          <>
            <Stack spacing={1.5}>
              {flatVisible.map((t) => (
                <NoAsignadoRow
                  key={t.id}
                  t={t}
                  zones={zones}
                  dateFormat={settings.dateFormat}
                  daysUntilReassignable={settings.daysUntilReassignable}
                  onAsignar={onAsignar}
                  showZone={true}
                />
              ))}
            </Stack>
            {flatRemaining > 0 && (
              <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                <Button
                  variant="tertiary"
                  onClick={() => setFlatLimit((prev) => prev + PAGE_SIZE)}
                >
                  Ver {Math.min(flatRemaining, PAGE_SIZE)} más
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default EstadisticasTab;
