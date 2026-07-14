import { useMemo, useState } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import { IconClose } from '@components/icons';
import { congIDState, userLocalUIDState } from '@states/settings';
import { fieldGroupsState } from '@states/field_service_groups';
import { markNoticeRead } from '@services/firebase/territories';
import { displaySnackNotification } from '@services/states/app';
import {
  myTerritoryAssignmentsState,
  myUnreadNoticesState,
  territoriesState,
  territoryOpenAssignmentsState,
  territoryZonesState,
  territorySettingsState,
} from '@states/territories';
import { Territory, TerritoryAssignment } from '@definition/territories';
import {
  formatTerritoryDate,
  getZoneColor,
  getZoneName,
  isOverdue,
  territoryLabel,
  computeDueAt,
} from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';
import TerritoryThumbnail from '@features/territories/TerritoryThumbnail';

type Props = {
  onView: (territory: Territory) => void;
  onEntregar: (assignment: TerritoryAssignment) => void;
};

/** Insignia "Campaña" — antes solo se mostraba en la lista personal; los
 *  compañeros de grupo (publishersCanSeeGroup) veían una asignación de
 *  campaña como si fuera normal, sin poder distinguirla. */
const CampanaBadge = () => (
  <Box
    sx={{
      px: 1,
      py: 0.25,
      borderRadius: 'var(--radius-xl)',
      backgroundColor: 'rgba(var(--blue-main-base), 0.1)',
      color: 'var(--blue-main)',
      fontWeight: 600,
      fontSize: '0.75rem',
      border: '1px solid rgba(var(--blue-main-base), 0.2)',
    }}
  >
    Campaña
  </Box>
);

/** Sección "Mis territorios": territorios actualmente asignados al usuario. */
const MisTerritoriosSection = ({ onView, onEntregar }: Props) => {
  const myAssignments = useAtomValue(myTerritoryAssignmentsState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const notices = useAtomValue(myUnreadNoticesState);
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const fieldGroups = useAtomValue(fieldGroupsState);
  const resolveName = usePersonName();

  // Ocultar de inmediato el aviso al descartarlo, sin esperar a que el
  // cambio de `leido` en Firestore se propague de vuelta al estado local.
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());

  const visibleNotices = useMemo(
    () => notices.filter((n) => !dismissedNoticeIds.has(n.id)),
    [notices, dismissedNoticeIds]
  );

  const handleDismissNotice = (noticeId: string) => {
    setDismissedNoticeIds((prev) => new Set(prev).add(noticeId));
    markNoticeRead(congId, noticeId).catch((err) => {
      console.error(err);
      // Sin esto, al fallar el aviso simplemente no desaparecía y
      // quien hizo clic en la X no tenía forma de saber por qué.
      displaySnackNotification({
        header: 'Error',
        message: 'No se pudo descartar el aviso. Inténtalo de nuevo.',
        severity: 'error',
      });
      setDismissedNoticeIds((prev) => {
        const next = new Set(prev);
        next.delete(noticeId);
        return next;
      });
    });
  };

  const rows = useMemo(
    () =>
      myAssignments
        .map((a) => ({
          assignment: a,
          territory: territories.find((t) => t.id === a.territoryId),
        }))
        .filter((r): r is { assignment: TerritoryAssignment; territory: Territory } =>
          Boolean(r.territory)
        ),
    [myAssignments, territories]
  );

  /** Asignaciones abiertas de los compañeros del mismo grupo de predicación. */
  const groupRows = useMemo(() => {
    if (!settings.publishersCanSeeGroup || !uid) return [];

    const myGroup = fieldGroups.find((g) =>
      g.group_data.members.some((m) => m.person_uid === uid)
    );
    if (!myGroup) return [];

    const memberUids = myGroup.group_data.members
      .map((m) => m.person_uid)
      .filter((id) => id !== uid);

    return openAssignments
      .filter((a) => memberUids.includes(a.personUid))
      .map((a) => ({
        assignment: a,
        territory: territories.find((t) => t.id === a.territoryId),
      }))
      .filter(
        (r): r is { assignment: TerritoryAssignment; territory: Territory } =>
          Boolean(r.territory)
      );
  }, [settings.publishersCanSeeGroup, uid, fieldGroups, openAssignments, territories]);

  const noticesBanner = visibleNotices.length > 0 && (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {visibleNotices.map((n) => (
        <Box key={n.id} sx={{ position: 'relative' }}>
          <InfoTip
            color="warning"
            isBig={false}
            text={n.mensaje}
            sx={{ pr: 5 }}
          />
          <IconButton
            onClick={() => handleDismissNotice(n.id)}
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
            aria-label="Descartar aviso"
          >
            <IconClose color="var(--ink-2)" width={16} height={16} />
          </IconButton>
        </Box>
      ))}
    </Stack>
  );

  if (rows.length === 0) {
    return (
      <Box>
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
          Mis territorios
        </Typography>
        {noticesBanner}
        <Typography variant="body2" color="var(--ink-2)">
          No tienes territorios asignados ahora mismo. Puedes solicitar uno.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
        Mis territorios ({rows.length})
      </Typography>
      {noticesBanner}
      <Stack spacing={1.5}>
        {rows.map(({ assignment, territory }) => {
          const overdue = isOverdue(assignment.assignedAt, settings.daysUntilOverdue);
          const color = getZoneColor(territory.zoneId, zones);
          return (
            <Box
              key={assignment.id}
              sx={{
                p: 2,
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--line)',
                borderLeft: `5px solid ${color}`,
                backgroundColor: 'var(--card)',
                boxShadow: 'var(--small-card-shadow)',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  boxShadow: 'var(--hover-shadow)'
                }
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
              >
                <TerritoryThumbnail geometry={territory.geometry} color={color} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                      {getZoneName(territory.zoneId, zones)} {territoryLabel(territory)}
                    </Typography>
                    {assignment.isCampaign && <CampanaBadge />}
                    {overdue && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'rgba(var(--red-main-base), 0.1)',
                            color: 'var(--red-main)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            border: '1px solid rgba(var(--red-main-base), 0.2)'
                          }}
                        >
                          Atrasado
                        </Box>
                    )}
                  </Stack>
                  <Typography variant="caption" color="var(--ink-2)">
                    Entregado: {formatTerritoryDate(assignment.assignedAt, settings.dateFormat)} ·
                    Vence: {formatTerritoryDate(assignment.dueAt || computeDueAt(assignment.assignedAt, settings.daysUntilExpiration), settings.dateFormat)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction={{ mobile: 'column', tablet600: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                <Button variant="tertiary" onClick={() => onView(territory)}>
                  Ver territorio
                </Button>
                {/* Antes este botón simplemente desaparecía si la opción
                    estaba desactivada, sin explicar por qué — ahora se ve
                    pero deshabilitado, con el motivo. */}
                <Button
                  variant="main"
                  onClick={() => onEntregar(assignment)}
                  disabled={!settings.publishersCanReturn}
                >
                  Entregar
                </Button>
              </Stack>
              {!settings.publishersCanReturn && (
                <Typography variant="caption" color="var(--ink-2)" sx={{ display: 'block', mt: 0.5 }}>
                  Solo un responsable puede marcar este territorio como entregado.
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* ── Territorios del grupo de predicación ───────────────────────── */}
      {groupRows.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
            Territorios del grupo ({groupRows.length})
          </Typography>
          <Stack spacing={1.5}>
            {groupRows.map(({ assignment, territory }) => {
              const color = getZoneColor(territory.zoneId, zones);
              return (
                <Box
                  key={assignment.id}
                  sx={{
                    p: 2,
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--line)',
                    borderLeft: `5px solid ${color}`,
                    backgroundColor: 'var(--card)',
                    boxShadow: 'var(--small-card-shadow)',
                    opacity: 0.85,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                          {getZoneName(territory.zoneId, zones)} {territoryLabel(territory)}
                          <span style={{ fontWeight: 400, color: 'var(--ink-2)', marginLeft: '8px' }}>
                            {resolveName(assignment.personUid)}
                          </span>
                        </Typography>
                        {assignment.isCampaign && <CampanaBadge />}
                      </Stack>
                      <Typography variant="caption" color="var(--ink-2)">
                        Entregado: {formatTerritoryDate(assignment.assignedAt, settings.dateFormat)}
                      </Typography>
                    </Box>
                    <Button variant="tertiary" onClick={() => onView(territory)}>
                      Ver
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default MisTerritoriosSection;
