import { useMemo, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack, LinearProgress } from '@mui/material';
import { displaySnackNotification } from '@services/states/app';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
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
  computeDueAt,
  daysSince,
  formatTerritoryDate,
  getZoneName,
  isOverdue,
  isPastDue,
  statsRangeStart,
  territoryLabel,
} from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';
import { apiSendTerritoryPush } from '@services/api/territories';

type Props = {
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
};

const KpiCard = ({
  title,
  value,
  total,
  color,
  subtext,
}: {
  title: string;
  value: number;
  total?: number;
  color: string;
  subtext?: string;
}) => (
  <Box
    sx={{
      flex: 1,
      minWidth: { mobile: '100%', tablet600: 200 },
      p: 2.5,
      borderRadius: '16px',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--small-card-shadow)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      '&:hover': {
        boxShadow: 'var(--hover-shadow)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: color }} />
    <Typography variant="body2" sx={{ color: 'var(--ink-2)', fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Stack direction="row" alignItems="baseline" spacing={1}>
      <Typography className="big-numbers" sx={{ color: 'var(--ink)', fontWeight: 600, fontSize: '36px', lineHeight: '40px' }}>
        {value}
      </Typography>
      {total !== undefined && (
        <Typography variant="body1" sx={{ color: 'var(--ink-2)' }}>
          / {total}
        </Typography>
      )}
    </Stack>
    {total !== undefined && total > 0 && (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="var(--ink-2)">
            Progreso
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color }}>
            {Math.round((value / total) * 100)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={(value / total) * 100}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'var(--line)',
            '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
          }}
        />
      </Box>
    )}
    {subtext && (
      <Typography variant="caption" color="var(--ink-2)" sx={{ mt: 1.5, display: 'block' }}>
        {subtext}
      </Typography>
    )}
  </Box>
);

// ─── Fila de territorio no asignado ────────────────────────────────────────────
const NoAsignadoRow = ({
  t,
  zones,
  dateFormat,
  onAsignar,
  showZone,
}: {
  t: Territory;
  zones: TerritoryZone[];
  dateFormat: string;
  onAsignar: (t: Territory) => void;
  showZone: boolean;
}) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    sx={{
      p: 2,
      borderRadius: '12px',
      border: '1px solid var(--line)',
      backgroundColor: 'var(--card)',
      transition: 'border-color 0.15s ease',
      '&:hover': { borderColor: 'var(--accent-main)' },
    }}
  >
    <Box>
      <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
        {territoryLabel(t)}
        {showZone && (
          <span style={{ fontWeight: 400, color: 'var(--ink-2)', marginLeft: '8px' }}>
            {getZoneName(t.zoneId, zones)}
          </span>
        )}
      </Typography>
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

// ─── Grupo por zona con "Ver más" ───────────────────────────────────────────────
const PAGE_SIZE = 10;

const ZoneGroup = ({
  zone,
  territories,
  dateFormat,
  onAsignar,
}: {
  zone: TerritoryZone;
  territories: Territory[];
  dateFormat: string;
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

    // Vencidos — umbral de "daysUntilExpiration", distinto (y normalmente
    // menor) que el de "Atrasados". Antes no aparecía en ningún sitio de
    // Responsables pese a que Configuración promete que el territorio
    // "puede reasignarse cuando venza".
    const vencidos = relevant
      .filter(
        (a) =>
          !a.returnedAt &&
          isPastDue(a.assignedAt, settings.daysUntilExpiration, a.dueAt)
      )
      .sort(
        (x, y) =>
          new Date(x.assignedAt).getTime() - new Date(y.assignedAt).getTime()
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
      vencidos,
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
        settings.overdueMessage || 'Tienes un territorio atrasado.'
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
      {/* Resumen Dashboard */}
      <Stack direction={{ mobile: 'column', tablet600: 'row' }} spacing={2}>
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
        />
        <KpiCard
          title="Vencidos"
          value={stats.vencidos.length}
          color={stats.vencidos.length > 0 ? 'var(--orange-main)' : 'var(--green-main)'}
          subtext={stats.vencidos.length === 0 ? '¡Todo al día!' : 'Pueden reasignarse'}
        />
      </Stack>

      {/* Territorios atrasados */}
      <Box>
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 2 }}>
          Territorios atrasados ({stats.atrasados.length})
        </Typography>
        {stats.atrasados.length === 0 ? (
          <Box sx={{ p: 3, borderRadius: '12px', border: '1px dashed var(--line)', textAlign: 'center' }}>
            <Typography variant="body2" color="var(--ink-2)">
              No hay territorios atrasados. ¡Gran trabajo! 🎉
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
                    borderRadius: '12px',
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

      {/* Territorios vencidos */}
      <Box>
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 2 }}>
          Territorios vencidos ({stats.vencidos.length})
        </Typography>
        {stats.vencidos.length === 0 ? (
          <Box sx={{ p: 3, borderRadius: '12px', border: '1px dashed var(--line)', textAlign: 'center' }}>
            <Typography variant="body2" color="var(--ink-2)">
              No hay territorios vencidos.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {stats.vencidos.map((a) => {
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
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    borderLeft: '4px solid var(--orange-main)',
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
                      Venció el {formatTerritoryDate(a.dueAt || computeDueAt(a.assignedAt, settings.daysUntilExpiration), settings.dateFormat)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: { mobile: 1, tablet600: 0 }, flexWrap: 'wrap' }}>
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
          <Box sx={{ p: 3, borderRadius: '12px', border: '1px dashed var(--line)', textAlign: 'center' }}>
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
