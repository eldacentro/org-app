import { useMemo, useRef, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { displaySnackNotification } from '@services/states/app';
import {
  Box,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import FilterChip from '@components/filter_chip';
import { IconDelete } from '@components/icons';
import { congIDState, congMasterKeyState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesSortedState,
  territorySettingsState,
} from '@states/territories';
import { Territory, TerritoryAssignment, TerritoryZone } from '@definition/territories';
import {
  deleteAssignment,
  saveAssignment,
} from '@services/firebase/territories';
import { formatTerritoryDate, territoryLabel } from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';

type Filter = 'all' | 'assigned' | 'unassigned';

type Props = {
  onView: (t: Territory) => void;
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
};

const TerritoryAssignmentCard = ({
  t,
  zone,
  history,
  open,
  onView,
  onAsignar,
  onEntregar,
  onEditNote,
  onDelete,
  resolveName,
  dateFormat,
}: {
  t: Territory;
  zone: TerritoryZone;
  history: TerritoryAssignment[];
  open: boolean;
  onView: (t: Territory) => void;
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
  onEditNote: (a: TerritoryAssignment) => void;
  onDelete: (a: TerritoryAssignment) => void;
  resolveName: (uid: string) => string;
  dateFormat: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const activeOrLatest = history[0];
  const pastHistory = history.length > 1 ? history.slice(1) : [];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '12px',
        border: '1px solid var(--line)',
        borderLeft: `5px solid ${zone.color}`,
        backgroundColor: 'var(--card)',
        boxShadow: 'var(--small-card-shadow)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          boxShadow: 'var(--hover-shadow)',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: history.length > 0 ? 1.5 : 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="body1" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
            {territoryLabel(t)}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: '12px',
              backgroundColor: open ? 'var(--orange-secondary)' : 'var(--green-secondary)',
              color: open ? 'var(--orange-dark)' : 'var(--green-main)',
              fontWeight: 600,
              fontSize: '0.75rem',
              border: `1px solid ${open ? 'var(--orange-main)' : 'var(--green-main)'}33`
            }}
          >
            {open ? 'Asignado' : 'Libre'}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="secondary" onClick={() => onView(t)}>
            Ver
          </Button>
          {!open && (
            <Button variant="main" onClick={() => onAsignar(t)}>
              Asignar
            </Button>
          )}
        </Stack>
      </Stack>

      {history.length === 0 ? (
        <Typography variant="caption" color="var(--ink-2)" sx={{ mt: 1, display: 'block' }}>
          Sin asignaciones registradas.
        </Typography>
      ) : (
        <Box>
          {/* Active or Latest Assignment */}
          <Stack
            direction={{ mobile: 'column', tablet600: 'row' }}
            alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
            justifyContent="space-between"
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: '8px',
              backgroundColor: open ? 'var(--orange-secondary)' : 'var(--accent-100)',
              border: `1px solid ${open ? 'var(--orange-main)33' : 'var(--line)'}`,
            }}
            spacing={1}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
                {resolveName(activeOrLatest.personUid)}
                {activeOrLatest.isCampaign && (
                  <span style={{ color: 'var(--blue-main)' }}> (Campaña)</span>
                )}
              </Typography>
              <Typography variant="caption" color="var(--ink-2)">
                {formatTerritoryDate(activeOrLatest.assignedAt, dateFormat)}
                {' → '}
                {activeOrLatest.returnedAt
                  ? formatTerritoryDate(activeOrLatest.returnedAt, dateFormat)
                  : 'En curso'}
                {activeOrLatest.notas ? ` · ${activeOrLatest.notas}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              {!activeOrLatest.returnedAt && (
                <Button variant="main" onClick={() => onEntregar(activeOrLatest)}>
                  Entregar
                </Button>
              )}
              <Button variant="tertiary" onClick={() => onEditNote(activeOrLatest)}>
                Nota
              </Button>
              <Button
                variant="tertiary"
                onClick={() => onDelete(activeOrLatest)}
                ariaLabel="Borrar asignación"
              >
                <IconDelete color="var(--red-main)" width={16} height={16} />
              </Button>
            </Stack>
          </Stack>

          {/* Collapsible Past History */}
          {pastHistory.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Button
                variant="tertiary"
                onClick={() => setExpanded(!expanded)}
                sx={{ width: '100%', justifyContent: 'center', py: 0.5 }}
              >
                {expanded ? 'Ocultar historial' : `Ver historial anterior (${pastHistory.length})`}
              </Button>
              
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {pastHistory.map((a) => (
                    <Stack
                      key={a.id}
                      direction={{ mobile: 'column', tablet600: 'row' }}
                      alignItems={{ mobile: 'flex-start', tablet600: 'center' }}
                      justifyContent="space-between"
                      sx={{
                        py: 1,
                        px: 1.5,
                        borderTop: '1px dashed var(--line)',
                      }}
                      spacing={1}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: 'var(--ink)', fontWeight: 500 }}>
                          {resolveName(a.personUid)}
                          {a.isCampaign && (
                            <span style={{ color: 'var(--blue-main)' }}> (C)</span>
                          )}
                        </Typography>
                        <Typography variant="caption" color="var(--ink-2)">
                          {formatTerritoryDate(a.assignedAt, dateFormat)}
                          {' → '}
                          {a.returnedAt
                            ? formatTerritoryDate(a.returnedAt, dateFormat)
                            : 'en curso'}
                          {a.notas ? ` · ${a.notas}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Button variant="small" onClick={() => onEditNote(a)}>
                          Nota
                        </Button>
                        <Button
                          variant="small"
                          onClick={() => onDelete(a)}
                          ariaLabel="Borrar asignación"
                        >
                          <IconDelete color="var(--red-main)" width={16} height={16} />
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

const AsignacionesTab = ({ onView, onAsignar, onEntregar }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [filter, setFilter] = useState<Filter>('all');
  const { confirm, ConfirmDialogNode } = useConfirm();

  // ── Diálogo de edición de nota ──────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<TerritoryAssignment | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);

  const openNoteDialog = (a: TerritoryAssignment) => {
    setEditTarget(a);
    setNoteValue(a.notas ?? '');
  };

  const closeNoteDialog = () => setEditTarget(null);

  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    if (!editTarget) return;
    setSavingNote(true);
    try {
      await saveAssignment(
        congId,
        {
          ...editTarget,
          notas: noteValue.trim() || undefined,
          updatedAt: new Date().toISOString(),
        },
        masterKey ?? ''
      );
      displaySnackNotification({ severity: 'success', header: 'Nota guardada', message: 'La nota ha sido guardada correctamente.' });
      closeNoteDialog();
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo guardar la nota.' });
    } finally {
      setSavingNote(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  const assignmentsByTerritory = useMemo(() => {
    const map = new Map<string, TerritoryAssignment[]>();
    assignments.forEach((a) => {
      const arr = map.get(a.territoryId) ?? [];
      arr.push(a);
      map.set(a.territoryId, arr);
    });
    map.forEach((arr) =>
      arr.sort(
        (x, y) =>
          new Date(y.assignedAt).getTime() - new Date(x.assignedAt).getTime()
      )
    );
    return map;
  }, [assignments]);

  const isOpenAssigned = (territoryId: string) =>
    (assignmentsByTerritory.get(territoryId) ?? []).some(
      (a) => !a.returnedAt && !a.isCampaign
    );

  const handleDelete = async (a: TerritoryAssignment) => {
    const ok = await confirm({
      title: 'Borrar asignación',
      message: '¿Borrar esta asignación? Esta acción no se puede deshacer y afecta al registro del S-13.',
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) await deleteAssignment(congId, a.id);
  };

  const handleEditNote = (a: TerritoryAssignment) => openNoteDialog(a);

  const byZone = useMemo(() => {
    return zones.map((zone) => ({
      zone,
      items: territories
        .filter((t) => t.zoneId === zone.id)
        .filter((t) => {
          if (filter === 'assigned') return isOpenAssigned(t.id);
          if (filter === 'unassigned') return !isOpenAssigned(t.id);
          return true;
        })
        .sort((a, b) =>
          a.numero.localeCompare(b.numero, undefined, { numeric: true })
        ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, territories, filter, assignmentsByTerritory]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}
      <Stack direction="row" spacing={1}>
        <FilterChip
          label="Todos"
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label="Asignados"
          selected={filter === 'assigned'}
          onClick={() => setFilter('assigned')}
        />
        <FilterChip
          label="Sin asignar"
          selected={filter === 'unassigned'}
          onClick={() => setFilter('unassigned')}
        />
      </Stack>

      {byZone.map(({ zone, items }) => (
        <Box key={zone.id}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Box
              sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: zone.color }}
            />
            <Typography className="h2" sx={{ color: 'var(--ink)', fontWeight: 600 }}>
              {zone.nombre}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            {items.map((t) => {
              const history = assignmentsByTerritory.get(t.id) ?? [];
              const open = isOpenAssigned(t.id);
              return (
                <TerritoryAssignmentCard
                  key={t.id}
                  t={t}
                  zone={zone}
                  history={history}
                  open={open}
                  onView={onView}
                  onAsignar={onAsignar}
                  onEntregar={onEntregar}
                  onEditNote={handleEditNote}
                  onDelete={handleDelete}
                  resolveName={resolveName}
                  dateFormat={settings.dateFormat}
                />
              );
            })}
          </Stack>
        </Box>
      ))}

      {/* ── Diálogo de edición de nota ─────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onClose={closeNoteDialog}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            maxWidth: '444px',
            width: '100%',
            mx: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--ink)', fontWeight: 700 }}>
          Editar nota
        </DialogTitle>
        <DialogContent>
          <TextField
            inputRef={noteRef}
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            label="Nota de la asignación"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveNote();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="tertiary" onClick={closeNoteDialog} disabled={savingNote}>
            Cancelar
          </Button>
          <Button variant="main" onClick={saveNote} disabled={savingNote}>
            {savingNote ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AsignacionesTab;
