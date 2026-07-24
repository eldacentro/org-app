import { useMemo, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack } from '@mui/material';
import { displaySnackNotification } from '@services/states/app';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Tooltip from '@components/tooltip';
import { IconCheckCircle, IconInfo } from '@components/icons';
import {
  territoriesState,
  territoryAssignmentsState,
  territorySettingsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryAssignment, TerritoryZone } from '@definition/territories';
import { congIDState, userLocalUIDState } from '@states/settings';
import { saveNotice } from '@services/firebase/territories';
import {
  daysSince,
  formatTerritoryDate,
  getZoneName,
  isInCooldown,
  isOverdue,
  statsRangeStart,
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
  <Box
    sx={{
      p: '14px 16px',
      borderRadius: 'var(--radius-xl)',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--small-card-shadow)',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      '&:hover': {
        boxShadow: 'var(--hover-shadow)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: color }} />
    <Stack direction="row" alignItems="center" spacing={'4px'} sx={{ mb: '6px' }}>
      <Typography className="label-small-semibold" sx={{ color: 'var(--ink-2)' }}>
        {title}
      </Typography>
      {info && (
        <Tooltip title={info}>
          <Box sx={{ display: 'inline-flex', cursor: 'help', color: 'var(--ink-2)' }}>
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
        <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)' }}>
          / {total}
        </Typography>
      )}
    </Stack>
    {total !== undefined && total > 0 && (
      <Stack direction="row" alignItems="center" spacing={'8px'} sx={{ mt: '10px' }}>
        <Box sx={{ flex: 1, height: 4, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--line)', overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${Math.round((value / total) * 100)}%`,
              backgroundColor: color,
              borderRadius: 'var(--radius-xs)',
            }}
          />
        </Box>
        <Typography className="label-small-semibold" sx={{ color, flexShrink: 0 }}>
          {Math.round((value / total) * 100)}%
        </Typography>
      </Stack>
    )}
    {subtext && (
      <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)', mt: '8px', display: 'block' }}>
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
        p: 2,
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--line)',
        borderLeft: resting ? '4px solid var(--grey-400)' : '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        transition: 'border-color 0.15s ease',
        '&:hover': { borderColor: 'var(--accent-main)' },
      }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
            {territoryLabel(t)}
            {showZone && (
              <span style={{ fontWeight: 400, color: 'var(--ink-2)', marginLeft: '8px' }}>
                {getZoneName(t.zoneId, zones)}
              </span>
            )}
          </Typography>
          {resting && (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--grey-100)',
                border: '1px solid var(--line)',
              }}
            >
              <Typography className="label-small-semibold" sx={{ color: 'var(--grey-600)' }}>
                En descanso
              </Typography>
            </Box>
          )}
        </Stack>
        <Typography variant="caption" color="var(--ink-2)">
          {t.lastWorkedAt
            ? `Último trabajo: ${formatTerritoryDate(t.lastWorkedAt, dateFormat)}`
            : 'Nunca trabajado'}
        </Typography>
      </Box>
      <Button variant="small" onClick={() => onAsignar(t)}>
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
            borderRadius: '50%',
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
          · {territories.length} territorios
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
  const assignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const congId = useAtomValue(congIDState);
  const currentUid = useAtomValue(userLocalUIDState);
  const resolveName = usePersonName();
  const { confirm, ConfirmDialogNode } = useConfirm();
  // Estado para "ver más" de la lista plana
  const [flatLimit, setFlatLimit] = useState(PAGE_SIZE);

  const stats = useMemo(() => {
    const total = territories.length;
    const rangeStart = statsRangeStart(settings.statsRange);

    const relevant = settings.statsIncludeCampaigns
      ? assignments
      : assignments.filter((a) => !a.isCampaign);

    const openByTerritory = new Set(
      relevant.filter((a) => !a.returnedAt).map((a) => a.territoryId)
    );

    const asignados = openByTerritory.size;
    const noAsignados = total - asignados;

    let trabajados = 0;
    let asignadoActual = 0;
    let noTrabajados = 0;
    territories.forEach((t) => {
      const workedThisYear = t.lastWorkedAt && new Date(t.lastWorkedAt) >= rangeStart;

      if (workedThisYear) {
        trabajados += 1;
      } else if (openByTerritory.has(t.id)) {
        asignadoActual += 1;
        if (settings.assignedCountsAsWorked) trabajados += 1;
      } else {
        noTrabajados += 1;
      }
    });

    // Atrasados
    const atrasados = relevant
      .filter((a) => !a.returnedAt && isOverdue(a.assignedAt, settings.daysUntilOverdue))
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
      asignadoActual,
      noTrabajados,
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
      displaySnackNotification({ severity: 'success', header: 'Aviso enviado', message: `Se ha notificado a ${nombre}.` });
    } catch (e) {
      console.error(e);
      displaySnackNotification({ severity: 'error', header: 'Error al notificar', message: 'No se pudo enviar el aviso. Inténtalo de nuevo.' });
    }
  };

  if (stats.total === 0) {
    return (
      <Typography variant="body2" color="var(--ink-2)">
        Aún no hay territorios para mostrar estadísticas.
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
          gridTemplateColumns: { mobile: '1fr 1fr', tablet600: 'repeat(4, 1fr)' },
          gap: '12px',
        }}
      >
        <KpiCard
          title="Asignados"
          value={stats.asignados}
          total={stats.total}
          color="var(--accent-main)"
          subtext={`${stats.noAsignados} territorios libres`}
        />
        <KpiCard
          title="Trabajados"
          value={stats.trabajados}
          total={stats.total}
          color="var(--green-main)"
          subtext="En el rango seleccionado"
        />
        <KpiCard
          title="Atrasados"
          value={stats.atrasados.length}
          color={stats.atrasados.length > 0 ? 'var(--red-main)' : 'var(--green-main)'}
          subtext={stats.atrasados.length === 0 ? '¡Todo al día!' : 'Requieren atención'}
          info="Llevan asignados más tiempo del normal sin devolverse (umbral configurable en Ajustes)."
        />
        <KpiCard
          title="En descanso"
          value={stats.enDescanso.length}
          color="var(--grey-400)"
          subtext={stats.enDescanso.length === 0 ? 'Ninguno' : 'Se ven marcados abajo'}
          info="Territorios libres que se devolvieron trabajados hace poco — todavía dentro del tiempo de descanso configurado (ver «Días de descanso antes de reasignar» en Configuración). Se pueden ver marcados en la lista de «No asignados»."
        />
      </Box>

      {/* Territorios atrasados */}
      <Box>
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 2 }}>
          Territorios atrasados ({stats.atrasados.length})
        </Typography>
        {stats.atrasados.length === 0 ? (
          <Box sx={{ p: 3, borderRadius: 'var(--radius-xl)', border: '1px dashed var(--line)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <IconCheckCircle width={24} height={24} color="var(--green-main)" />
            <Typography variant="body2" color="var(--ink-2)">
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
                    p: 2,
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--line)',
                    borderLeft: '4px solid var(--red-main)',
                    backgroundColor: 'var(--card)',
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                      {t ? territoryLabel(t) : '—'}
                      <span style={{ fontWeight: 400, color: 'var(--ink-2)', marginLeft: '8px' }}>
                        {resolveName(a.personUid)}
                      </span>
                    </Typography>
                    <Typography variant="caption" color="var(--ink-2)">
                      Entregado el {formatTerritoryDate(a.assignedAt, settings.dateFormat)} ·
                      Hace <strong style={{ color: 'var(--red-main)' }}>{daysSince(a.assignedAt)} días</strong>
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: { mobile: 1, tablet600: 0 }, flexWrap: 'wrap' }}>
                    <Button variant="tertiary" disableAutoStretch onClick={() => notificar(a)}>
                      Notificar
                    </Button>
                    <Button variant="main" disableAutoStretch onClick={() => onEntregar(a)}>
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
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 2 }}>
          No asignados durante más tiempo ({stats.noAsignadosLista.length})
        </Typography>

        {stats.noAsignadosLista.length === 0 ? (
          <Box sx={{ p: 3, borderRadius: 'var(--radius-xl)', border: '1px dashed var(--line)', textAlign: 'center' }}>
            <Typography variant="body2" color="var(--ink-2)">
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
