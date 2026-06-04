import { useState, useMemo } from 'react';
import { Box, Typography, Grid, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { IconAdd, IconSettings } from '@components/icons';
import { useDocumentos } from '@features/documentos/useDocumentos';
import { useCurrentUser, useBreakpoints } from '@hooks/index';
import DialogSubirDocumento from '@features/documentos/DialogSubirDocumento';
import DialogVerDocumento from '@features/documentos/DialogVerDocumento';
import DialogCategorias from '@features/documentos/DialogCategorias';
import DocumentoCard from '@features/documentos/DocumentoCard';
import { DocumentoArchivo } from '@definition/documentos';
import { deleteDocumentoCompleto } from '@services/firebase/documentos';
import { congIDState } from '@states/settings';
import FilterChip from '@components/filter_chip';

const DocumentosPage = () => {
  const { isElder, isAdmin } = useCurrentUser();
  const { tablet688Up } = useBreakpoints();
  const { documentos, categorias } = useDocumentos();
  const congId = useAtomValue(congIDState);
  const canManage = isElder || isAdmin;

  const [openSubir, setOpenSubir] = useState(false);
  const [openCategorias, setOpenCategorias] = useState(false);
  const [docToView, setDocToView] = useState<DocumentoArchivo | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all');

  const docsFiltrados = useMemo(() => {
    const base =
      filtroCategoria === 'all'
        ? documentos
        : documentos.filter((d) => d.categoriaId === filtroCategoria);
    return [...base].sort(
      (a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime()
    );
  }, [documentos, filtroCategoria]);

  const handleDelete = async (doc: DocumentoArchivo) => {
    const ok = window.confirm('¿Estás seguro de que deseas eliminar este documento permanentemente?');
    if (ok) {
      await deleteDocumentoCompleto(congId, doc.id);
    }
  };

  const buttons = useMemo(() => {
    if (!canManage) return null;
    return (
      <>
        <NavBarButton
          key="manage-categories"
          text={tablet688Up ? 'Gestionar categorías' : 'Categorías'}
          icon={<IconSettings />}
          onClick={() => setOpenCategorias(true)}
        />
        <NavBarButton
          key="upload-document"
          text={tablet688Up ? 'Subir documento' : 'Subir'}
          icon={<IconAdd />}
          onClick={() => setOpenSubir(true)}
          main
        />
      </>
    );
  }, [canManage, tablet688Up]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageTitle title="Documentos" buttons={buttons} />

      {/* Filtros por categoría */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: 'auto',
          pb: '8px',
          flexWrap: 'nowrap',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <FilterChip
          label="Todos"
          selected={filtroCategoria === 'all'}
          onClick={() => setFiltroCategoria('all')}
        />
        {categorias.map((cat) => (
          <FilterChip
            key={cat.id}
            label={cat.nombre}
            selected={filtroCategoria === cat.id}
            onClick={() => setFiltroCategoria(cat.id)}
          />
        ))}
      </Stack>

      {/* Lista de documentos o empty state */}
      {docsFiltrados.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 2,
            background: 'var(--card)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--r-lg)',
            border: '1px dashed var(--line)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Box sx={{ fontSize: '48px', mb: 1, lineHeight: 1 }}>📂</Box>
          <Typography color="var(--ink-2)" className="body-regular">
            No hay documentos en esta categoría
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {docsFiltrados.map((doc) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
              <DocumentoCard
                documento={doc}
                categoria={categorias.find((c) => c.id === doc.categoriaId)}
                onView={setDocToView}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <DialogSubirDocumento open={openSubir} onClose={() => setOpenSubir(false)} />
      <DialogCategorias open={openCategorias} onClose={() => setOpenCategorias(false)} />
      <DialogVerDocumento
        open={!!docToView}
        documento={docToView}
        onClose={() => setDocToView(null)}
      />
    </Box>
  );
};

export default DocumentosPage;
