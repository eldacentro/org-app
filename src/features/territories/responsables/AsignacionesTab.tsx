import { useMemo, useRef, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { displaySnackNotification } from '@services/states/app';
import { Box, Collapse, Stack } from '@mui/material';
import Dialog from '@components/dialog';
import TextField from '@components/textfield';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import FilterChip from '@components/filter_chip';
import PanelToolbar, { RielChips } from '@components/panel_toolbar';
import { IconDelete } from '@components/icons';
import SegmentedControl from '@components/segmented_control';
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
import {
  Territory,
  TerritoryAssignment,
  TerritoryZone,
} from '@definition/territories';
import {
  cambiarEstadoAsignacion,
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

/**
 * Cómo se entregó, a la vista en cada fila.
 *
 * No se veía en ningún sitio de esta pestaña: una devolución sin trabajar y
 * una entrega trabajada salían iguales, con sus dos fechas y nada más. Así
 * que nadie podía darse cuenta de que el hermano se había equivocado de
 * botón, que es justo lo que hay que poder ver para corregirlo.
 */
const EstadoEntrega = ({ a }: { a: TerritoryAssignment }) => {
  if (!a.returnedAt) return null;
  // La campaña se cerró sola y el hermano aún no ha dicho si lo trabajó:
  // está guardada como "sin trabajar" a la espera, pero decirlo así sería
  // dar por hecho lo que todavía no se sabe.
  if (a.cierrePendiente) {
    return <Badge size="small" color="orange" text="Sin confirmar" />;
  }
  return a.status === 'trabajado' ? (
    <Badge size="small" color="green" text="Trabajado" />
  ) : (
    <Badge size="small" color="grey" text="Sin trabajar" />
  );
};

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
  onEdit,
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
  onEdit: (a: TerritoryAssignment) => void;
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: history.length > 0 ? 1.5 : 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography
            className="body-regular-semibold"
            sx={{ color: 'var(--ink)' }}
          >
            {territoryLabel(t)}
          </Typography>
          <EstadoBadge estado={estadoDeTerritorio(open, resting)} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="secondary"
            disableAutoStretch
            onClick={() => onView(t)}
          >
            Ver
          </Button>
          {!open && (
            <Button
              variant="main"
              disableAutoStretch
              onClick={() => onAsignar(t)}
            >
              Asignar
            </Button>
          )}
        </Stack>
      </Stack>

      {history.length === 0 ? (
        <Typography
          className="label-small-regular"
          color="var(--ink-2)"
          sx={{ mt: 1, display: 'block' }}
        >
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
              backgroundColor: open
                ? 'var(--orange-secondary)'
                : 'var(--accent-100)',
              border: `1px solid ${open ? 'rgba(var(--orange-main-base), 0.2)' : 'var(--line)'}`,
            }}
            spacing={1}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* "(Campaña)" iba escrito DENTRO del nombre con un `<span>` de
                  color azul suelto: se leía como si el hermano se apellidara
                  así. Es una etiqueta, y se pinta como todas las demás. */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Typography className="body-small-semibold" color="var(--ink)">
                  {resolveName(activeOrLatest.personUid)}
                </Typography>
                {activeOrLatest.isCampaign && (
                  <Badge size="small" color="accent" text="Campaña" />
                )}
                <EstadoEntrega a={activeOrLatest} />
                {/* Que lo tenga compartido con otro hermano durante la salida
                    no es una asignación ni cuenta para nada —el territorio
                    sigue siendo de quien lo tiene, y en el S-13 y el
                    historial solo sale él—, pero conviene que se vea: si no,
                    encontrarse a otro hermano en ese territorio parece un
                    error. Va el número, no los nombres: es cosa de ellos. */}
                {compartidoAhora(activeOrLatest) > 0 && (
                  <Badge
                    size="small"
                    color="grey"
                    text={`Compartido con ${compartidoAhora(activeOrLatest)}`}
                  />
                )}
              </Stack>
              <Typography className="label-small-regular" color="var(--ink-2)">
                {formatTerritoryDate(activeOrLatest.assignedAt, dateFormat)}
                {' → '}
                {activeOrLatest.returnedAt
                  ? formatTerritoryDate(activeOrLatest.returnedAt, dateFormat)
                  : 'En curso'}
                {activeOrLatest.notas
                  ? ` · ${displayText(activeOrLatest.notas)}`
                  : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {!activeOrLatest.returnedAt && (
                <Button
                  variant="main"
                  disableAutoStretch
                  onClick={() => onEntregar(activeOrLatest)}
                >
                  Entregar
                </Button>
              )}
              <Button
                variant="tertiary"
                disableAutoStretch
                onClick={() => onEdit(activeOrLatest)}
              >
                Editar
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
                {expanded
                  ? 'Ocultar historial'
                  : `Ver historial anterior (${pastHistory.length})`}
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
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ flexWrap: 'wrap' }}
                        >
                          <Typography
                            className="body-small-semibold"
                            color="var(--ink)"
                          >
                            {resolveName(a.personUid)}
                          </Typography>
                          {/* Era una "(C)" azul pegada al apellido. Nadie
                              sabe qué significa una C suelta. */}
                          {a.isCampaign && (
                            <Badge size="small" color="accent" text="Campaña" />
                          )}
                          <EstadoEntrega a={a} />
                        </Stack>
                        <Typography
                          className="label-small-regular"
                          color="var(--ink-2)"
                        >
                          {formatTerritoryDate(a.assignedAt, dateFormat)}
                          {' → '}
                          {a.returnedAt
                            ? formatTerritoryDate(a.returnedAt, dateFormat)
                            : 'en curso'}
                          {a.notas ? ` · ${displayText(a.notas)}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Button
                          variant="small"
                          disableAutoStretch
                          onClick={() => onEdit(a)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="small"
                          disableAutoStretch
                          onClick={() => onDelete(a)}
                          ariaLabel="Borrar asignación"
                        >
                          <IconDelete
                            color="var(--red-main)"
                            width={20}
                            height={20}
                          />
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

/** Cuántos préstamos siguen en hora ahora mismo. */
const compartidoAhora = (a: TerritoryAssignment): number => {
  if (a.returnedAt) return 0;
  const ahora = new Date().toISOString();
  return (a.compartidoCon ?? []).filter((p) => p.hasta > ahora).length;
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

  // ── Diálogo de edición de la asignación ───────────────────────────────────
  // Antes solo se podía tocar la nota. Ahora también CÓMO se entregó, que es
  // lo que de verdad hay que corregir cuando el hermano pulsa el botón que no
  // era: lo devolvió "sin trabajar" habiéndolo trabajado, y el territorio se
  // quedaba sin su fecha, fuera de "En descanso" y mal en el S-13.
  const [editTarget, setEditTarget] = useState<TerritoryAssignment | null>(
    null
  );
  const [noteValue, setNoteValue] = useState('');
  const [statusValue, setStatusValue] = useState<'trabajado' | 'no_trabajado'>(
    'trabajado'
  );
  const noteRef = useRef<HTMLInputElement>(null);

  const openEditDialog = (a: TerritoryAssignment) => {
    setEditTarget(a);
    // Si la nota vino cifrada y aquí no se puede descifrar, NO se carga
    // en el campo: volver a guardarla la cifraría por segunda vez y
    // quedaría ilegible para todos.
    setNoteValue(isStillEncrypted(a.notas) ? '' : (a.notas ?? ''));
    setStatusValue(a.status === 'trabajado' ? 'trabajado' : 'no_trabajado');
  };

  const closeEditDialog = () => setEditTarget(null);

  const [savingEdit, setSavingEdit] = useState(false);
  /** La nota actual está cifrada y no se puede leer aquí: se bloquea la
   *  edición para no sobrescribirla ni cifrarla dos veces. */
  const noteLocked = isStillEncrypted(editTarget?.notas);

  // Qué ha cambiado de verdad. Guardar sin cambios no escribe nada, y con
  // la nota bloqueada sigue pudiéndose corregir el estado.
  const cambiaEstado = Boolean(
    editTarget?.returnedAt &&
    // Una de fin de campaña pendiente se guarda como "sin trabajar" a la
    // espera: confirmarla como tal también es una respuesta.
    (statusValue !== editTarget.status || editTarget.cierrePendiente)
  );
  const cambiaNota =
    !noteLocked &&
    Boolean(editTarget) &&
    noteValue.trim() !== (editTarget?.notas ?? '').trim();

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!cambiaEstado && !cambiaNota) {
      closeEditDialog();
      return;
    }
    setSavingEdit(true);
    try {
      if (cambiaEstado) {
        const territory =
          territories.find((t) => t.id === editTarget.territoryId) ?? null;
        await cambiarEstadoAsignacion(
          congId,
          editTarget,
          statusValue,
          territory
        );
      }
      if (cambiaNota) {
        await updateAssignmentNote(
          congId,
          editTarget.id,
          noteValue.trim() || undefined,
          masterKey ?? ''
        );
      }
      displaySnackNotification({
        severity: 'success',
        header: 'Asignación corregida',
        message: cambiaEstado
          ? statusValue === 'trabajado'
            ? 'Ahora consta como trabajado, y el territorio cuenta esa fecha.'
            : 'Ahora consta como sin trabajar.'
          : 'La nota se ha guardado.',
      });
      closeEditDialog();
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'No se pudo guardar',
        message:
          (err as Error)?.message === TERRITORY_NO_KEY_MESSAGE
            ? 'Esa nota se guarda cifrada y en este dispositivo falta la llave maestra. Pídesela a un anciano y vuelve a entrar.'
            : 'Comprueba la conexión e inténtalo otra vez.',
      });
    } finally {
      setSavingEdit(false);
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
      message:
        '¿Borrar esta asignación? Esta acción no se puede deshacer y afecta al registro del S-13.',
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (ok) {
      const territory = territories.find((t) => t.id === a.territoryId) ?? null;
      await deleteAssignment(congId, a.id, territory);
    }
  };

  const handleEdit = (a: TerritoryAssignment) => openEditDialog(a);

  const byZone = useMemo(() => {
    const lower = search.trim().toLowerCase();

    return (
      zones
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
        .filter(({ items }) => items.length > 0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, territories, filter, search, assignmentsByTerritory, resolveName]);

  const hasAnyResults = byZone.some(({ items }) => items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}

      <PanelToolbar
        busqueda={search}
        onBuscar={setSearch}
        placeholder="Buscar por territorio o publicador"
      >
        <RielChips>
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
        </RielChips>
      </PanelToolbar>

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
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 'var(--shape-full)',
                backgroundColor: zone.color,
              }}
            />
            <Typography
              className="h2"
              sx={{ color: 'var(--ink)', fontWeight: 600 }}
            >
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
                  onEdit={handleEdit}
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

      {/* ── Diálogo de edición de la asignación ─────────────────────────── */}
      {/* El Dialog del sistema, no el de MUI en crudo: es el que pone los
          márgenes seguros de iOS. Su Paper ya trae el ancho, el radio, el
          fondo y la sombra, así que aquí no se repiten. Ver DESIGN_SYSTEM
          §6.1. */}
      <Dialog open={!!editTarget} onClose={closeEditDialog}>
        <Box>
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Editar asignación
          </Typography>
          {editTarget && (
            <Typography
              className="body-small-regular"
              sx={{ color: 'var(--ink-2)', mt: 0.5 }}
            >
              {(() => {
                const t = territories.find(
                  (x) => x.id === editTarget.territoryId
                );
                const z = zones.find((x) => x.id === t?.zoneId);
                const nombre = t
                  ? `${z?.nombre ?? ''} ${territoryLabel(t)}`.trim()
                  : 'Territorio';
                return `${nombre} · ${resolveName(editTarget.personUid)}`;
              })()}
            </Typography>
          )}
        </Box>

        {/* Solo en las ya entregadas: una en curso todavía no se ha entregado
            de ninguna manera, y para eso está «Entregar». */}
        {editTarget?.returnedAt && (
          <Box>
            <Typography
              className="body-small-semibold"
              sx={{ color: 'var(--ink)', mb: 1 }}
            >
              Cómo se entregó
            </Typography>
            <SegmentedControl
              ariaLabel="Cómo se entregó"
              tabs={['Trabajado', 'Sin trabajar']}
              active={statusValue === 'trabajado' ? 0 : 1}
              onChange={(i) =>
                setStatusValue(i === 0 ? 'trabajado' : 'no_trabajado')
              }
            />
            {editTarget.cierrePendiente && (
              <Typography
                className="label-small-regular"
                sx={{ color: 'var(--ink-2)', mt: 1, display: 'block' }}
              >
                Se cerró con la campaña y el hermano aún no ha dicho si lo
                trabajó. Si lo guardas aquí, ya no se le preguntará.
              </Typography>
            )}
          </Box>
        )}

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
        />

        {/* Cancelar a la izquierda y la acción principal la más a la derecha,
            como en todos los diálogos de la app. */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button
            variant="tertiary"
            onClick={closeEditDialog}
            disabled={savingEdit}
          >
            Cancelar
          </Button>
          <Button
            variant="main"
            onClick={saveEdit}
            disabled={savingEdit || (!cambiaEstado && !cambiaNota)}
          >
            {savingEdit ? 'Guardando…' : 'Guardar'}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AsignacionesTab;
