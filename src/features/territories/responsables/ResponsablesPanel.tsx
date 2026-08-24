import { useState } from 'react';
import { Box } from '@mui/material';
import ScrollableTabs from '@components/scrollable_tabs';
import { useAtomValue } from 'jotai';
import TabLabelWithBadge from '@components/tab_label_with_badge';
import {
  territoriesState,
  territoryZonesSortedState,
  territoryAssignedIdsState,
  territoryPendingLocationsState,
  territoryPendingRequestsState,
  territorySettingsState,
  territoryTagsState,
  territoriesLoadingState,
} from '@states/territories';
import { congIDState } from '@states/settings';
import { useConfirm } from '@components/confirm_dialog';
import { displaySnackNotification } from '@services/states/app';
import { deleteTerritoryCompleto } from '@services/firebase/territories';
import {
  Territory,
  TerritoryAssignment,
  TerritoryRequest,
} from '@definition/territories';
import AsignacionesTab from './AsignacionesTab';
import SolicitudesTab from './SolicitudesTab';
import HistorialTab from './HistorialTab';
import EstadisticasTab from './EstadisticasTab';
import ConfiguracionTab from './ConfiguracionTab';
import CampanasTab from './CampanasTab';
import EnlacesTab from './EnlacesTab';
import ImportExportTab from './ImportExportTab';
import TerritoriesOverviewMap from '../map/TerritoriesOverviewMap';
import TerritoriosTab from './TerritoriosTab';
import UbicacionesTab from './UbicacionesTab';

/**
 * Posición de la pestaña "Solicitudes" dentro de `tabs`.
 *
 * Vive aquí, y no como un 2 escrito en la página, porque el orden de las
 * pestañas se cambia de vez en cuando: la primera vez que se movió una, el
 * engranaje con la insignia roja siguió abriendo "la tercera", que ya era
 * otra cosa. Si vuelves a reordenar, cambia este número.
 */
export const TAB_SOLICITUDES = 3;

type Props = {
  onView: (t: Territory) => void;
  onAsignar: (t: Territory) => void;
  onEntregar: (a: TerritoryAssignment) => void;
  onAsignarParaSolicitud: (req: TerritoryRequest) => void;
  onAsignarCampana: (t: Territory, campaignId: string) => void;
  /** Asigna varios territorios de una vez al mismo publicador — usado desde
   *  la selección múltiple de la pestaña "Territorios", para no tener que
   *  asignar uno a uno durante una campaña grande. */
  onAsignarBulk: (territories: Territory[]) => void;
  /** Pestaña inicial. Se usa para abrir en "Solicitudes" cuando se entra
   *  desde la insignia roja del engranaje — ver `TAB_SOLICITUDES`. */
  initialTab?: number;
  onOpenZonas: () => void;
  onOpenEtiquetas: () => void;
  onOpenImport: () => void;
  onOpenCrear: () => void;
};

const ResponsablesPanel = ({
  onView,
  onAsignar,
  onEntregar,
  onAsignarParaSolicitud,
  onAsignarCampana,
  onAsignarBulk,
  initialTab,
  onOpenZonas,
  onOpenEtiquetas,
  onOpenImport,
  onOpenCrear,
}: Props) => {
  const congId = useAtomValue(congIDState);
  const loading = useAtomValue(territoriesLoadingState);

  const zones = useAtomValue(territoryZonesSortedState);
  const tags = useAtomValue(territoryTagsState);
  const territories = useAtomValue(territoriesState);
  const assignedIds = useAtomValue(territoryAssignedIdsState);
  const settings = useAtomValue(territorySettingsState);
  const pending = useAtomValue(territoryPendingRequestsState);
  const pendingLocations = useAtomValue(territoryPendingLocationsState);
  // Si se entra con solicitudes pendientes, abrir directamente en
  // "Solicitudes" (ver `TAB_SOLICITUDES`). La insignia roja del engranaje
  // solo se enciende por eso, y antes te dejaba en "Estadísticas": había que
  // descubrir y deslizar hasta la tercera pestaña de nueve cada vez.
  const [tab, setTab] = useState(() => initialTab ?? 0);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      // Al salir se olvida lo marcado: volver a entrar y encontrarse ocho
      // territorios ya seleccionados de una sesión anterior es la manera más
      // fácil de borrar algo sin querer.
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const handleBulkAsignar = () => {
    if (selectedIds.size === 0) return;

    const selected = territories.filter((t) => selectedIds.has(t.id));
    const toAssign = selected.filter((t) => !assignedIds.has(t.id));
    const skipped = selected.length - toAssign.length;

    if (toAssign.length === 0) {
      displaySnackNotification({
        severity: 'error',
        header: 'Acción no permitida',
        message: 'Todos los territorios seleccionados ya están asignados.',
      });
      return;
    }

    if (skipped > 0) {
      // No 'success': la acción se completó SOLO A MEDIAS y en verde pasaba
      // desapercibido. La app solo tiene 'success' y 'error', así que se usa
      // 'error' — es lo que de verdad transmite "revisa esto".
      displaySnackNotification({
        severity: 'error',
        header: 'Algunos territorios se omitieron',
        message:
          skipped === 1
            ? '1 territorio ya estaba asignado y no se incluyó.'
            : `${skipped} territorios ya estaban asignados y no se incluyeron.`,
      });
    }

    onAsignarBulk(toAssign);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const selectedArr = Array.from(selectedIds);
    // Filtrar los que tienen asignación abierta
    const toDelete = selectedArr.filter((id) => !assignedIds.has(id));
    const skipped = selectedArr.length - toDelete.length;

    if (toDelete.length === 0) {
      displaySnackNotification({
        severity: 'error',
        header: 'Acción no permitida',
        message:
          'Todos los territorios seleccionados están asignados. No se pueden borrar.',
      });
      return;
    }

    // La confirmación DEBE decir que se lleva el historial por delante:
    // borrar un territorio borra todas sus asignaciones (el registro del
    // S-13) y sus direcciones "No visitar". Antes solo hablaba del
    // territorio, así que quien limpiaba territorios obsoletos destruía
    // años de registro creyendo que solo borraba un polígono.
    let msg =
      toDelete.length === 1
        ? '¿Eliminar este territorio? Se borrarán también todo su historial de asignaciones (el registro del S-13) y sus direcciones de "No visitar". No se puede deshacer.'
        : `¿Eliminar estos ${toDelete.length} territorios? Se borrarán también todo su historial de asignaciones (el registro del S-13) y sus direcciones de "No visitar". No se puede deshacer.`;
    if (skipped > 0) {
      msg +=
        skipped === 1
          ? ' Se omitirá 1 territorio porque está asignado ahora mismo.'
          : ` Se omitirán ${skipped} territorios porque están asignados ahora mismo.`;
    }

    const ok = await confirm({
      message: msg,
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!ok) return;

    setDeleting(true);
    try {
      await Promise.all(
        toDelete.map((id) => deleteTerritoryCompleto(congId, id))
      );
      displaySnackNotification({
        severity: 'success',
        header: 'Territorios eliminados',
        message:
          toDelete.length === 1
            ? 'Se ha eliminado 1 territorio correctamente.'
            : `Se han eliminado ${toDelete.length} territorios correctamente.`,
      });
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudieron eliminar todos los territorios.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {ConfirmDialogNode}
      <ScrollableTabs
        value={tab}
        onChange={setTab}
        indicatorMode
        tabs={[
          {
            label: 'Estadísticas',
            Component: (
              <EstadisticasTab
                onAsignar={onAsignar}
                onEntregar={onEntregar}
                onView={onView}
              />
            ),
          },
          {
            label: 'Territorios',
            Component: (
              <TerritoriosTab
                zones={zones}
                territories={territories}
                tags={tags}
                assignedIds={assignedIds}
                daysUntilReassignable={settings.daysUntilReassignable}
                loading={loading}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                deleting={deleting}
                onToggleSelect={handleToggleSelect}
                onToggleSelectionMode={handleToggleSelectionMode}
                onBulkAsignar={handleBulkAsignar}
                onBulkDelete={handleBulkDelete}
                onView={onView}
                onOpenZonas={onOpenZonas}
                onOpenEtiquetas={onOpenEtiquetas}
                onOpenImport={onOpenImport}
                onOpenCrear={onOpenCrear}
              />
            ),
          },
          {
            label: 'Asignaciones',
            Component: (
              <AsignacionesTab
                onView={onView}
                onAsignar={onAsignar}
                onEntregar={onEntregar}
              />
            ),
          },
          {
            // El contador iba en un Badge de MUI (paleta de MUI, no la
            // nuestra) colgado sobre la esquina, y el hueco para que no
            // tapara la letra se hacía con un `<span style>` a mano. Es la
            // misma pastilla de contador que usan las demás pestañas de la
            // app; sin solicitudes, ni pastilla ni hueco.
            label:
              pending.length > 0 ? (
                <TabLabelWithBadge label="Solicitudes" count={pending.length} />
              ) : (
                'Solicitudes'
              ),
            Component: (
              <SolicitudesTab onAsignarParaSolicitud={onAsignarParaSolicitud} />
            ),
          },
          {
            // Mismo contador que "Solicitudes": las direcciones pendientes
            // son la otra cosa de esta pantalla que espera por alguien.
            label:
              pendingLocations.length > 0 ? (
                <TabLabelWithBadge
                  label="Ubicaciones"
                  count={pendingLocations.length}
                />
              ) : (
                'Ubicaciones'
              ),
            Component: <UbicacionesTab onView={onView} />,
          },
          {
            label: 'Historial',
            Component: <HistorialTab />,
          },
          {
            label: 'Mapa',
            Component: <TerritoriesOverviewMap onViewTerritory={onView} />,
          },
          {
            label: 'Enlaces',
            Component: <EnlacesTab onView={onView} />,
          },
          {
            label: 'Campañas',
            Component: (
              <CampanasTab
                onAsignarCampana={onAsignarCampana}
                onView={onView}
              />
            ),
          },
          {
            label: 'Importar/Exportar',
            Component: <ImportExportTab />,
          },
          {
            label: 'Configuración',
            Component: <ConfiguracionTab />,
          },
        ]}
      />
    </Box>
  );
};

export default ResponsablesPanel;
