import { useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { documentosState, documentoCategoriasState } from '@states/documentos';
import { dbDocumentosGetAll, dbDocumentosGetCategorias, dbDocumentosCheckExpiracion, dbCategoriasSave } from '@services/dexie/documentos';

const CATEGORIAS_INICIALES = [
  { nombre: 'Cuentas', color: '#10B981' },
  { nombre: 'Visita del Superintendente', color: '#6366F1' },
  { nombre: 'Asambleas', color: '#F59E0B' },
  { nombre: 'Anuncios', color: '#306CB4' },
  { nombre: 'Otros', color: '#9CA3AF' },
];

export const useDocumentos = () => {
  const setDocumentos = useSetAtom(documentosState);
  const setCategorias = useSetAtom(documentoCategoriasState);
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);

  const loadData = async () => {
    await dbDocumentosCheckExpiracion();
    
    const docs = await dbDocumentosGetAll();
    let cats = await dbDocumentosGetCategorias();
    
    // Auto-initialize categories if empty
    if (cats.length === 0) {
      const initialCats = CATEGORIAS_INICIALES.map((c, i) => ({
        id: crypto.randomUUID(),
        nombre: c.nombre,
        color: c.color,
        orden: i,
        updatedAt: new Date().toISOString()
      }));
      await dbCategoriasSave(initialCats);
      cats = await dbDocumentosGetCategorias();
    }
    
    setDocumentos(docs);
    setCategorias(cats);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    documentos,
    categorias,
    reload: loadData,
  };
};
