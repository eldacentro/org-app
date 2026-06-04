import { useState, useMemo } from 'react';
import { Box, Typography, Grid, Accordion, AccordionSummary, AccordionDetails, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import { dbDocumentosSave, dbDocumentosDelete } from '@services/dexie/documentos';
import { deleteDocumentoPDF } from '@services/firebase/documentos';
import FilterChip from '@components/filter_chip';

const DocumentosPage = () => {
  const { isElder, isAdmin, congregation } = useCurrentUser();
  const { tablet688Up } = useBreakpoints();
  const { documentos, categorias, reload } = useDocumentos();
  const canManage = isElder || isAdmin;

  const [openSubir, setOpenSubir] = useState(false);
  const [openCategorias, setOpenCategorias] = useState(false);
  const [docToView, setDocToView] = useState<DocumentoArchivo | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all');

  const docsActivos = useMemo(() => documentos.filter(d => d.activo && !d.archivado), [documentos]);
  const docsArchivados = useMemo(() => documentos.filter(d => !d.activo || d.archivado), [documentos]);

  const docsFiltrados = useMemo(() => {
    let filtrados = docsActivos;
    if (filtroCategoria !== 'all') {
      filtrados = filtrados.filter(d => d.categoriaId === filtroCategoria);
    }
    // Ordenar por más recientes primero
    return filtrados.sort((a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime());
  }, [docsActivos, filtroCategoria]);

  const handleArchive = async (doc: DocumentoArchivo) => {
    const updated = { ...doc, activo: false, archivado: true, updatedAt: new Date().toISOString() };
    await dbDocumentosSave(updated);
    reload();
  };

  const handleDelete = async (doc: DocumentoArchivo) => {
    const confirm = window.confirm('¿Estás seguro de que deseas eliminar este documento permanentemente?');
    if (confirm) {
      await dbDocumentosDelete(doc.id);
      if (congregation?.id) {
        await deleteDocumentoPDF(congregation.id, doc.id);
      }
      reload();
    }
  };

  const buttons = useMemo(() => {
    const btns: React.ReactNode[] = [];

    if (canManage) {
      btns.push(
        <NavBarButton
          key="manage-categories"
          text={tablet688Up ? "Gestionar categorías" : "Categorías"}
          icon={<IconSettings />}
          onClick={() => setOpenCategorias(true)}
        />,
        <NavBarButton
          key="upload-document"
          text={tablet688Up ? "Subir documento" : "Subir"}
          icon={<IconAdd />}
          onClick={() => setOpenSubir(true)}
          main
        />
      );
    }

    return <>{btns}</>;
  }, [canManage, tablet688Up]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageTitle title="Documentos" buttons={buttons} />

      <Stack 
        direction="row" 
        spacing={1} 
        sx={{ 
          overflowX: 'auto', 
          pb: '8px',
          width: '100%',
          flexWrap: 'nowrap',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <FilterChip 
          label="Todos" 
          selected={filtroCategoria === 'all'} 
          onClick={() => setFiltroCategoria('all')} 
        />
        {categorias.map(cat => (
          <FilterChip 
            key={cat.id} 
            label={cat.nombre} 
            selected={filtroCategoria === cat.id} 
            onClick={() => setFiltroCategoria(cat.id)} 
          />
        ))}
      </Stack>

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
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Typography variant="h5" sx={{ color: 'var(--ink-3)', mb: 1, fontSize: '48px' }}>
            📂
          </Typography>
          <Typography color="var(--ink-2)" className="body-regular">
            No hay documentos en esta categoría
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {docsFiltrados.map(doc => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <DocumentoCard 
                documento={doc} 
                categoria={categorias.find(c => c.id === doc.categoriaId)}
                onView={setDocToView}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {canManage && docsArchivados.length > 0 && (
        <Accordion 
          sx={{ 
            mt: 4, 
            borderRadius: 'var(--r-md) !important', 
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-sm)',
            '&:before': { display: 'none' },
            '&.Mui-expanded': {
              boxShadow: 'var(--shadow-md)',
            }
          }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon sx={{ color: 'var(--ink-3)' }} />}
            sx={{
              px: 3,
              borderRadius: 'var(--r-md)',
            }}
          >
            <Typography variant="h6" className="h3" sx={{ color: 'var(--ink)', fontWeight: 700 }}>
              Documentos archivados/expirados ({docsArchivados.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pb: 3, pt: 1 }}>
            <Grid container spacing={2}>
              {docsArchivados.map(doc => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <DocumentoCard 
                    documento={doc} 
                    categoria={categorias.find(c => c.id === doc.categoriaId)}
                    onView={setDocToView}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      <DialogSubirDocumento open={openSubir} onClose={() => setOpenSubir(false)} />
      <DialogCategorias open={openCategorias} onClose={() => setOpenCategorias(false)} />
      
      <DialogVerDocumento 
        open={!!docToView} 
        documento={docToView} 
        onClose={() => setDocToView(null)} 
        onViewed={reload}
      />
    </Box>
  );
};

export default DocumentosPage;
