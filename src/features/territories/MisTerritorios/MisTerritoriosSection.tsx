import { useMemo } from 'react';
import { Box, Stack, Alert } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import { congIDState, userLocalUIDState } from '@states/settings';
import { fieldGroupsState } from '@states/field_service_groups';
import { markNoticeRead } from '@services/firebase/territories';
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
} from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';

type Props = {
  onView: (territory: Territory) => void;
  onEntregar: (assignment: TerritoryAssignment) => void;
};

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

  const noticesBanner = notices.length > 0 && (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {notices.map((n) => (
        <Alert
          key={n.id}
          severity="warning"
          onClose={() => markNoticeRead(congId, n.id).catch(console.error)}
        >
          {n.mensaje}
        </Alert>
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
                borderRadius: '12px',
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
                spacing={1}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                      {territoryLabel(territory)}
                    </Typography>
                    {overdue && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '12px',
                            backgroundColor: 'var(--red-main)1A',
                            color: 'var(--red-main)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            border: '1px solid var(--red-main)33'
                          }}
                        >
                          Atrasado
                        </Box>
                    )}
                  </Stack>
                  <Typography variant="caption" color="var(--ink-2)">
                    {getZoneName(territory.zoneId, zones)} · Entregado:{' '}
                    {formatTerritoryDate(assignment.assignedAt, settings.dateFormat)} ·
                    Vence: {formatTerritoryDate(assignment.dueAt, settings.dateFormat)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction={{ mobile: 'column', tablet600: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                <Button variant="tertiary" onClick={() => onView(territory)}>
                  Ver territorio
                </Button>
                {settings.publishersCanReturn && (
                  <Button variant="main" onClick={() => onEntregar(assignment)}>
                    Entregar
                  </Button>
                )}
              </Stack>
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
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    borderLeft: `5px solid ${color}`,
                    backgroundColor: 'var(--card)',
                    boxShadow: 'var(--small-card-shadow)',
                    opacity: 0.85,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                        {territoryLabel(territory)}
                        <span style={{ fontWeight: 400, color: 'var(--ink-2)', marginLeft: '8px' }}>
                          {resolveName(assignment.personUid)}
                        </span>
                      </Typography>
                      <Typography variant="caption" color="var(--ink-2)">
                        {getZoneName(territory.zoneId, zones)} ·{' '}
                        {formatTerritoryDate(assignment.assignedAt, settings.dateFormat)}
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
