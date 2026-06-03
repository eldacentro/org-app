import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { IconEdit, IconSave, IconClose, IconPrint } from '@components/icons';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import LastModifiedInfo from '@components/last_modified_info';
import ResponsabilidadesFeature from '@features/congregation/responsabilidades';
import useResponsabilidadesExport from '@features/congregation/responsabilidades/useResponsabilidadesExport';
import { responsabilidadesState } from '@states/responsabilidades';
import { pdfExportEnabledState } from '@states/settings';
import { dbResponsabilidadesSave } from '@services/dexie/responsabilidades';
import { ResponsabilidadesType } from '@definition/responsabilidades';
import useCurrentUser from '@hooks/useCurrentUser';

const ResponsabilidadesPage = () => {
  const data = useAtomValue(responsabilidadesState);
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);

  const { isElder, isAdmin } = useCurrentUser();
  const canEdit = isElder || isAdmin;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResponsabilidadesType | null>(null);
  const [saving, setSaving] = useState(false);

  const { handleExportPDF, isProcessing } = useResponsabilidadesExport();

  const startEdit = () => {
    if (!data) return;
    setDraft(structuredClone(data));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await dbResponsabilidadesSave(draft);
      setIsEditing(false);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const buttons = useMemo(() => {
    const btns: React.ReactNode[] = [];

    if (pdfExportEnabled) {
      btns.push(
        <NavBarButton
          key="export"
          text="Exportar"
          onClick={handleExportPDF}
          icon={<IconPrint color="var(--accent-main)" />}
          disabled={isProcessing}
        />
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, isEditing, saving, pdfExportEnabled, isProcessing]);

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
        saving={saving}
        onSave={save}
        onCancelEdit={cancelEdit}
      />
    </Box>
  );
};

export default ResponsabilidadesPage;
