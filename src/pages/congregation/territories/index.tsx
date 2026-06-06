import { useState } from 'react';
import { Box } from '@mui/material';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
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

type AsignarState = {
  open: boolean;
  territory: Territory | null;
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

  const [openZonas, setOpenZonas] = useState(false);
  const [openEtiquetas, setOpenEtiquetas] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openSolicitar, setOpenSolicitar] = useState(false);
  const [viewing, setViewing] = useState<Territory | null>(null);
  const [editing, setEditing] = useState<Territory | null>(null);
  const [entregando, setEntregando] = useState<TerritoryAssignment | null>(null);
  const [asignar, setAsignar] = useState<AsignarState>(CLOSED_ASIGNAR);

  const buttons = (
    <NavBarButton
      text={tablet688Up ? 'Solicitar territorio' : 'Solicitar'}
      icon={<IconAdd />}
      onClick={() => setOpenSolicitar(true)}
      main
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageTitle title="Territorios" buttons={buttons} />

      <MisTerritoriosSection
        onView={(t) => setViewing(t)}
        onEntregar={(a) => setEntregando(a)}
      />

      {canManage && (
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
          onOpenZonas={() => setOpenZonas(true)}
          onOpenEtiquetas={() => setOpenEtiquetas(true)}
          onOpenImport={() => setOpenImport(true)}
        />
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
