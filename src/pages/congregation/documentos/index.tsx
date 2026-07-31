import { useState, useMemo, useEffect } from 'react';
import EmptyState from '@components/empty_state';
import { useSearchParams } from 'react-router';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Typography, Grid, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import { IconAdd, IconInfo } from '@components/icons';
import { useDocumentos } from '@features/documentos/useDocumentos';
import { useCurrentUser, useBreakpoints } from '@hooks/index';
import DialogSubirDocumento from '@features/documentos/DialogSubirDocumento';
import DialogVerDocumento from '@features/documentos/DialogVerDocumento';
import DialogCategorias from '@features/documentos/DialogCategorias';
import DocumentoCard from '@features/documentos/DocumentoCard';
import { DocumentoArchivo } from '@definition/documentos';
import { deleteDocumentoCompleto } from '@services/firebase/documentos';
import { congIDState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
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

  // Se puede llegar aquí con la categoría ya elegida (?categoria=Exhibidores),
  // que es como enlaza el programa semanal. Se busca por NOMBRE y no por id:
  // el id se genera al crear la categoría y no se puede escribir en un enlace.
  const [searchParams] = useSearchParams();
  const categoriaPedida = searchParams.get('categoria');

  useEffect(() => {
    if (!categoriaPedida || categorias.length === 0) return;

    const encontrada = categorias.find(
      (cat) =>
        cat.nombre.trim().toLowerCase() === categoriaPedida.trim().toLowerCase()
    );

    if (encontrada) setFiltroCategoria(encontrada.id);
  }, [categoriaPedida, categorias]);
  const { confirm, ConfirmDialogNode } = useConfirm();

  const docsFiltrados = useMemo(() => {
    const base =
      filtroCategoria === 'all'
        ? documentos
        : documentos.filter((d) => d.categoriaId === filtroCategoria);
    return [...base].sort(
      (a, b) =>
        new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime()
    );
  }, [documentos, filtroCategoria]);

  const handleDelete = async (doc: DocumentoArchivo) => {
    const ok = await confirm({
      title: 'Eliminar documento',
      message:
        '¿Estás seguro de que deseas eliminar este documento permanentemente?',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (ok) {
      try {
        await deleteDocumentoCompleto(congId, doc.id);
        displaySnackNotification({
          severity: 'success',
          header: 'Documento eliminado',
          message: `"${doc.fileName}" ha sido eliminado.`,
        });
      } catch (err) {
        console.error(err);
        displaySnackNotification({
          severity: 'error',
          header: 'Error al eliminar',
          message: 'No se pudo eliminar el documento.',
        });
      }
    }
  };

  const buttons = useMemo(() => {
    if (!canManage) return null;
    return (
      <>
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
      {ConfirmDialogNode}
      {/* Las categorías son configuración de la pantalla, no una acción sobre
          los documentos, así que van al engranaje como en el resto de la app.
          Abajo se queda "Subir documento", que sí es una acción. De paso deja
          de llamarse "Gestionar categorías" en una pantalla y "Configuración"
          en las otras cinco. */}
      <PageTitle
        title="Documentos"
        buttons={buttons}
        quickSettings={canManage ? () => setOpenCategorias(true) : undefined}
        quickSettingsLabel="Categorías de documentos"
      />

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
        <EmptyState
          icon={<IconInfo color="var(--accent-dark)" />}
          title="No hay documentos en esta categoría"
          description="Cuando se suba uno, aparecerá aquí."
        />
      ) : filtroCategoria === 'all' ? (
        <Stack spacing={4}>
          {categorias.map((cat) => {
            const catDocs = docsFiltrados.filter(
              (d) => d.categoriaId === cat.id
            );
            if (catDocs.length === 0) return null;
            return (
              <Box key={cat.id}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 700,
                    color: cat.color,
                    borderBottom: `2px solid color-mix(in srgb, ${cat.color} 19%, transparent)`,
                    paddingBottom: '6px',
                  }}
                >
                  {cat.nombre}
                </Typography>
                <Grid container spacing={2}>
                  {catDocs.map((doc) => (
                    <Grid
                      size={{ mobile: 12, tablet600: 6, laptop: 4 }}
                      key={doc.id}
                    >
                      <DocumentoCard
                        documento={doc}
                        categoria={cat}
                        onView={setDocToView}
                        onDelete={handleDelete}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {docsFiltrados.map((doc) => (
            <Grid size={{ mobile: 12, tablet600: 6, laptop: 4 }} key={doc.id}>
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

      <DialogSubirDocumento
        open={openSubir}
        onClose={() => setOpenSubir(false)}
      />
      <DialogCategorias
        open={openCategorias}
        onClose={() => setOpenCategorias(false)}
      />
      <DialogVerDocumento
        open={!!docToView}
        documento={docToView}
        onClose={() => setDocToView(null)}
      />
    </Box>
  );
};

export default DocumentosPage;
