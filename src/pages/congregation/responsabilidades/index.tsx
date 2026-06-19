import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { IconEdit, IconSave, IconClose } from '@components/icons';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import LastModifiedInfo from '@components/last_modified_info';
import ResponsabilidadesFeature from '@features/congregation/responsabilidades';
import ExportResponsabilidades from '@features/congregation/responsabilidades/export_responsabilidades';
import { responsabilidadesState } from '@states/responsabilidades';
import { dbResponsabilidadesSave } from '@services/dexie/responsabilidades';
import { ResponsabilidadesType } from '@definition/responsabilidades';
import { useCurrentUser } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import backupWorker from '@services/worker/backupWorker';

const ResponsabilidadesPage = () => {
  const data = useAtomValue(responsabilidadesState);

  const { isElder, isAdmin } = useCurrentUser();
  const canEdit = isElder || isAdmin;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResponsabilidadesType | null>(null);
  const [saving, setSaving] = useState(false);

  // Trigger a sync when the page mounts so we always see the latest changes
  // from other admins/elders (the backup worker is the authoritative sync path
  // for responsabilidades — it does a GET→merge→POST round-trip).
  useEffect(() => {
    backupWorker.postMessage('startWorker');
  }, []);

  const startEdit = useCallback(() => {
    if (!data) return;
    setDraft(structuredClone(data));
    setIsEditing(true);
  }, [data]);

  const cancelEdit = useCallback(() => {
    setDraft(null);
    setIsEditing(false);
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await dbResponsabilidadesSave(draft);
      setIsEditing(false);
      setDraft(null);
    } catch (err) {
      console.error('No se pudo guardar Responsabilidades:', err);
      displaySnackNotification({ header: 'Error', message: (err as Error).message || 'Error al guardar. Puede que la información esté corrupta o haya conflicto.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const buttons = useMemo(() => {
    const btns: ReactNode[] = [];

    if (isElder || isAdmin) {
      btns.push(<ExportResponsabilidades key="export" />);
    }

    if (canEdit) {
      if (!isEditing) {
        btns.push(
          <NavBarButton
            key="edit"
            text="Editar"
            onClick={startEdit}
            icon={<IconEdit color="var(--accent-main)" />}
          />
        );
      } else {
        btns.push(
          <NavBarButton
            key="cancel"
            text="Cancelar"
            onClick={cancelEdit}
            disabled={saving}
            icon={<IconClose color="var(--accent-dark)" />}
          />,
          <NavBarButton
            key="save"
            text={saving ? 'Guardando…' : 'Guardar'}
            main
            onClick={save}
            disabled={saving}
            icon={<IconSave />}
          />
        );
      }
    }

    return <>{btns}</>;
  }, [canEdit, isEditing, saving, isElder, isAdmin, startEdit, cancelEdit, save]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle title="Responsabilidades" buttons={buttons} />

      {data && (
        <LastModifiedInfo
          updatedAt={data.updatedAt}
          lastModifiedBy={data.lastModifiedBy ?? ''}
        />
      )}

      <ResponsabilidadesFeature
        isEditing={isEditing}
        draft={draft}
        setDraft={setDraft}
      />
    </Box>
  );
};

export default ResponsabilidadesPage;
