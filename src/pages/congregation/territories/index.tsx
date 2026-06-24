import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { Box, Badge } from '@mui/material';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import ScrollableTabs from '@components/scrollable_tabs';
import { IconAdd } from '@components/icons';
import { useBreakpoints } from '@hooks/index';
import { useTerritories } from '@features/territories/useTerritories';
import { useIsTerritoryManager } from '@features/territories/useIsTerritoryManager';
import DialogZonas from '@features/territories/responsables/DialogZonas';
import DialogEtiquetas from '@features/territories/responsables/DialogEtiquetas';
import DialogImportarKml from '@features/territories/responsables/DialogImportarKml';
import ResponsablesPanel from '@features/territories/responsables/ResponsablesPanel';
import DialogVerTerritorio from '@features/territories/DialogVerTerritorio';
import DialogEditarTerritorio from '@features/territories/dialogs/DialogEditarTerritorio';
import DialogEntregar from '@features/territories/dialogs/DialogEntregar';
import DialogAsignar from '@features/territories/dialogs/DialogAsignar';
import DialogSolicitar from '@features/territories/dialogs/DialogSolicitar';
import MisTerritoriosSection from '@features/territories/MisTerritorios/MisTerritoriosSection';
import { Territory, TerritoryAssignment } from '@definition/territories';
import { territoriesState, territoryPendingRequestsState } from '@states/territories';

type AsignarState = {
  open: boolean;
  territory: Territory | null;
  /** Modo masivo: varios territorios a la vez al mismo publicador. */
  bulkTerritories?: Territory[];
  defaultPersonUid?: string;
  requestId?: string;
  isCampaign?: boolean;
  campaignId?: string;
};

const CLOSED_ASIGNAR: AsignarState = { open: false, territory: null };

const TerritoriesPage = () => {
  const { tablet688Up } = useBreakpoints();
  useTerritories();
  const canManage = useIsTerritoryManager();
  const territories = useAtomValue(territoriesState);
  const pendingRequestsCount = useAtomValue(territoryPendingRequestsState).length;
  const [searchParams, setSearchParams] = useSearchParams();

  const [openZonas, setOpenZonas] = useState(false);
  const [openEtiquetas, setOpenEtiquetas] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openSolicitar, setOpenSolicitar] = useState(false);
  const [viewing, setViewing] = useState<Territory | null>(null);
  const [editing, setEditing] = useState<Territory | null>(null);
  const [asignar, setAsignar] = useState<AsignarState>(CLOSED_ASIGNAR);
  const [entregando, setEntregando] = useState<TerritoryAssignment | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && territories.length > 0) {
      const t = territories.find((t) => t.id === viewId);
      if (t && (!viewing || viewing.id !== t.id)) {
        setViewing(t);
        // Clean up URL so it doesn't stay open if closed
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('view');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, territories, viewing, setSearchParams]);

  const buttons = (
    <NavBarButton
      text={tablet688Up ? 'Solicitar territorio' : 'Solicitar'}
      icon={<IconAdd />}
      onClick={() => setOpenSolicitar(true)}
      main
    />
  );

  const misTerritorios = (
    <MisTerritoriosSection
      onView={(t) => setViewing(t)}
      onEntregar={(a) => setEntregando(a)}
    />
  );

  const responsables = canManage ? (
    <ResponsablesPanel
      onView={(t) => setViewing(t)}
      onAsignar={(t) => setAsignar({ open: true, territory: t })}
      onEntregar={(a) => setEntregando(a)}
      onAsignarParaSolicitud={(req) =>
        setAsignar({
          open: true,
          territory: null,
          defaultPersonUid: req.personUid,
          requestId: req.id,
        })
      }
      onAsignarCampana={(t, campaignId) =>
        setAsignar({
          open: true,
          territory: t,
          isCampaign: true,
          campaignId,
        })
      }
      onAsignarBulk={(ts) =>
        setAsignar({ open: true, territory: null, bulkTerritories: ts })
      }
      onOpenZonas={() => setOpenZonas(true)}
      onOpenEtiquetas={() => setOpenEtiquetas(true)}
      onOpenImport={() => setOpenImport(true)}
    />
  ) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageTitle title="Territorios" buttons={buttons} />

      {/* Los publicadores normales solo tienen "Mis territorios" — sin
          pestañas. Los responsables ven dos secciones separadas para que
          el panel de gestión no quede empujado debajo de sus propias
          asignaciones personales. */}
      {canManage ? (
        <Box sx={{ marginBottom: '-24px' }}>
          <ScrollableTabs
            indicatorMode
            tabs={[
              { label: 'Mis territorios', Component: misTerritorios },
              {
                label: pendingRequestsCount > 0 ? (
                  <Badge badgeContent={pendingRequestsCount} color="primary" sx={{ pr: '6px' }}>
                    Responsables
                  </Badge>
                ) : (
                  'Responsables'
                ),
                Component: responsables,
              },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </Box>
      ) : (
        misTerritorios
      )}

      {/* Diálogos */}
      {canManage && (
        <>
          <DialogZonas open={openZonas} onClose={() => setOpenZonas(false)} />
          <DialogEtiquetas open={openEtiquetas} onClose={() => setOpenEtiquetas(false)} />
          <DialogImportarKml open={openImport} onClose={() => setOpenImport(false)} />
        </>
      )}
      <DialogSolicitar open={openSolicitar} onClose={() => setOpenSolicitar(false)} />
      <DialogVerTerritorio
        territory={viewing}
        onClose={() => setViewing(null)}
        canManage={canManage}
        showLiveLocation
        onEntregar={(a) => {
          setViewing(null);
          setEntregando(a);
        }}
        onAsignar={(t) => {
          setViewing(null);
          setAsignar({ open: true, territory: t });
        }}
        onEdit={() => {
          setViewing(null);
          setEditing(viewing);
        }}
      />
      {editing && (
        <DialogEditarTerritorio
          open={!!editing}
          territory={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DialogEntregar assignment={entregando} onClose={() => setEntregando(null)} />
      <DialogAsignar
        open={asignar.open}
        territory={asignar.territory}
        bulkTerritories={asignar.bulkTerritories}
        defaultPersonUid={asignar.defaultPersonUid}
        requestId={asignar.requestId}
        isCampaign={asignar.isCampaign}
        campaignId={asignar.campaignId}
        onClose={() => setAsignar(CLOSED_ASIGNAR)}
      />
    </Box>
  );
};

export default TerritoriesPage;
