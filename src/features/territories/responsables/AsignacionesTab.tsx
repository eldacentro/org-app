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
import Badge from '@components/badge';
import FilterChip from '@components/filter_chip';
import SearchField from '@components/textfield';
import { IconDelete } from '@components/icons';
import {
  TerritoryCard,
  EstadoBadge,
  estadoDeTerritorio,
} from '@features/territories/ui';
import { congIDState, congMasterKeyState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesSortedState,
  territorySettingsState,
  territoriesLoadingState,
} from '@states/territories';
import { Territory, TerritoryAssignment, TerritoryZone } from '@definition/territories';
import {
  deleteAssignment,
  updateAssignmentNote,
  TERRITORY_NO_KEY_MESSAGE,
} from '@services/firebase/territories';
import {
  formatTerritoryDate,
  isInCooldown,
  territoryLabel,
  displayText,
  isStillEncrypted,
} from '@services/app/territories';
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
  daysUntilReassignable,
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
  daysUntilReassignable: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const activeOrLatest = history[0];
  const pastHistory = history.length > 1 ? history.slice(1) : [];
  const resting = !open && isInCooldown(t, daysUntilReassignable);

  return (
    <TerritoryCard accent={zone.color}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: history.length > 0 ? 1.5 : 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography className="body-regular-semibold" sx={{ color: 'var(--ink)' }}>
            {territoryLabel(t)}
          </Typography>
          <EstadoBadge estado={estadoDeTerritorio(open, resting)} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="secondary" disableAutoStretch onClick={() => onView(t)}>
            Ver
          </Button>
          {!open && (
            <Button variant="main" disableAutoStretch onClick={() => onAsignar(t)}>
              Asignar
            </Button>
          )}
        </Stack>
      </Stack>

      {history.length === 0 ? (
        <Typography className="label-small-regular" color="var(--ink-2)" sx={{ mt: 1, display: 'block' }}>
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
              borderRadius: 'var(--shape-sm)',
              backgroundColor: open ? 'var(--orange-secondary)' : 'var(--accent-100)',
              border: `1px solid ${open ? 'rgba(var(--orange-main-base), 0.2)' : 'var(--line)'}`,
            }}
            spacing={1}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* "(Campaña)" iba escrito DENTRO del nombre con un `<span>` de
                  color azul suelto: se leía como si el hermano se apellidara
                  así. Es una etiqueta, y se pinta como todas las demás. */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Typography className="body-small-semibold" color="var(--ink)">
                  {resolveName(activeOrLatest.personUid)}
                </Typography>
                {activeOrLatest.isCampaign && (
                  <Badge size="small" color="accent" text="Campaña" />
                )}
              </Stack>
              <Typography className="label-small-regular" color="var(--ink-2)">
                {formatTerritoryDate(activeOrLatest.assignedAt, dateFormat)}
                {' → '}
                {activeOrLatest.returnedAt
                  ? formatTerritoryDate(activeOrLatest.returnedAt, dateFormat)
                  : 'En curso'}
                {activeOrLatest.notas ? ` · ${displayText(activeOrLatest.notas)}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {!activeOrLatest.returnedAt && (
                <Button variant="main" disableAutoStretch onClick={() => onEntregar(activeOrLatest)}>
                  Entregar
                </Button>
              )}
              <Button variant="tertiary" disableAutoStretch onClick={() => onEditNote(activeOrLatest)}>
                Nota
              </Button>
              <Button
                variant="small"
                disableAutoStretch
                onClick={() => onDelete(activeOrLatest)}
                ariaLabel="Borrar asignación"
              >
                <IconDelete color="var(--red-main)" width={20} height={20} />
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
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <Typography className="body-small-semibold" color="var(--ink)">
                            {resolveName(a.personUid)}
                          </Typography>
                          {/* Era una "(C)" azul pegada al apellido. Nadie
                              sabe qué significa una C suelta. */}
                          {a.isCampaign && <Badge size="small" color="accent" text="Campaña" />}
                        </Stack>
                        <Typography className="label-small-regular" color="var(--ink-2)">
                          {formatTerritoryDate(a.assignedAt, dateFormat)}
                          {' → '}
                          {a.returnedAt
                            ? formatTerritoryDate(a.returnedAt, dateFormat)
                            : 'en curso'}
                          {a.notas ? ` · ${displayText(a.notas)}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Button variant="small" disableAutoStretch onClick={() => onEditNote(a)}>
                          Nota
                        </Button>
                        <Button
                          variant="small"
                          disableAutoStretch
                          onClick={() => onDelete(a)}
                          ariaLabel="Borrar asignación"
                        >
                          <IconDelete color="var(--red-main)" width={20} height={20} />
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
    </TerritoryCard>
  );
};

const AsignacionesTab = ({ onView, onAsignar, onEntregar }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const loading = useAtomValue(territoriesLoadingState);
  const resolveName = usePersonName();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const { confirm, ConfirmDialogNode } = useConfirm();

  // ── Diálogo de edición de nota ──────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<TerritoryAssignment | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);

  const openNoteDialog = (a: TerritoryAssignment) => {
    setEditTarget(a);
    // Si la nota vino cifrada y aquí no se puede descifrar, NO se carga
    // en el campo: volver a guardarla la cifraría por segunda vez y
    // quedaría ilegible para todos.
    setNoteValue(isStillEncrypted(a.notas) ? '' : (a.notas ?? ''));
  };

  const closeNoteDialog = () => setEditTarget(null);

  const [savingNote, setSavingNote] = useState(false);
  /** La nota actual está cifrada y no se puede leer aquí: se bloquea la
   *  edición para no sobrescribirla ni cifrarla dos veces. */
  const noteLocked = isStillEncrypted(editTarget?.notas);

  const saveNote = async () => {
    if (!editTarget) return;
    setSavingNote(true);
    try {
      await updateAssignmentNote(
        congId,
        editTarget.id,
        noteValue.trim() || undefined,
        masterKey ?? ''
      );
      displaySnackNotification({ severity: 'success', header: 'Nota guardada', message: 'La nota ha sido guardada correctamente.' });
      closeNoteDialog();
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message:
          (err as Error)?.message === TERRITORY_NO_KEY_MESSAGE
            ? 'Esa nota se guarda cifrada y en este dispositivo falta la llave maestra. Pídesela a un anciano y vuelve a entrar.'
            : 'No se pudo guardar la nota.',
      });
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

  // Incluye las de campaña: un territorio ocupado por una campaña ESTÁ
  // ocupado (el candado openAssignmentId lo bloquea igual). Al excluirlas,
  // la tarjeta lo mostraba "Libre" con botón "Asignar", y al pulsarlo
  // saltaba siempre el error "Este territorio ya está asignado".
  const isOpenAssigned = (territoryId: string) =>
    (assignmentsByTerritory.get(territoryId) ?? []).some((a) => !a.returnedAt);

  const handleDelete = async (a: TerritoryAssignment) => {
    const ok = await confirm({
      title: 'Borrar asignación',
      message: '¿Borrar esta asignación? Esta acción no se puede deshacer y afecta al registro del S-13.',
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) {
      const territory = territories.find((t) => t.id === a.territoryId) ?? null;
      await deleteAssignment(congId, a.id, territory);
    }
  };

  const handleEditNote = (a: TerritoryAssignment) => openNoteDialog(a);

  const byZone = useMemo(() => {
    const lower = search.trim().toLowerCase();

    return zones
      .map((zone) => ({
        zone,
        items: territories
          .filter((t) => t.zoneId === zone.id)
          .filter((t) => {
            if (filter === 'assigned') return isOpenAssigned(t.id);
            if (filter === 'unassigned') return !isOpenAssigned(t.id);
            return true;
          })
          .filter((t) => {
            if (!lower) return true;
            if (territoryLabel(t).toLowerCase().includes(lower)) return true;
            const history = assignmentsByTerritory.get(t.id) ?? [];
            return history.some((a) =>
              resolveName(a.personUid).toLowerCase().includes(lower)
            );
          })
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          ),
      }))
      // Ocultar zonas sin resultados, tanto al buscar como al filtrar por
      // chip. Antes solo se ocultaban al buscar: pulsar "Asignados" un día
      // sin ninguno dejaba los títulos "Elda - Urbano" y "Elda - Rural" con
      // nada debajo y ningún texto — parecía un fallo de carga.
      .filter(({ items }) => items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, territories, filter, search, assignmentsByTerritory, resolveName]);

  const hasAnyResults = byZone.some(({ items }) => items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}

      <Box sx={{ maxWidth: 400 }}>
        <SearchField
          label="Buscar por territorio o publicador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

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

      {!loading && !hasAnyResults && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          {search.trim()
            ? 'No hay territorios que coincidan con tu búsqueda.'
            : filter === 'assigned'
              ? 'Ahora mismo no hay ningún territorio asignado.'
              : filter === 'unassigned'
                ? 'Todos los territorios están asignados ahora mismo.'
                : 'Todavía no hay territorios.'}
        </Typography>
      )}

      {byZone.map(({ zone, items }) => (
        <Box key={zone.id}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Box
              sx={{ width: 14, height: 14, borderRadius: 'var(--shape-full)', backgroundColor: zone.color }}
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
                  daysUntilReassignable={settings.daysUntilReassignable}
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
            borderRadius: 'var(--shape-xl)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--pop-up-shadow)',
            maxWidth: '444px',
            width: '100%',
            mx: 2,
          },
        }}
      >
        <DialogTitle sx={{ p: 2, pb: 0 }}>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Editar nota
          </Typography>
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
            // Sin atajo de Enter: el campo es multilínea (minRows=2), así
            // que Enter tiene que hacer salto de línea. Antes guardaba y
            // cerraba, y era imposible escribir una nota de dos líneas.
            disabled={noteLocked}
            helperText={
              noteLocked
                ? 'La nota existente está cifrada y este dispositivo no puede leerla, así que no se puede editar desde aquí.'
                : undefined
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button variant="tertiary" disableAutoStretch onClick={closeNoteDialog} disabled={savingNote}>
            Cancelar
          </Button>
          <Button variant="main" disableAutoStretch onClick={saveNote} disabled={savingNote || noteLocked}>
            {savingNote ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AsignacionesTab;
