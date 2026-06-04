import { useEffect } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { documentosState, documentoCategoriasState } from '@states/documentos';
import { dbDocumentosGetAll, dbDocumentosGetCategorias, dbDocumentosCheckExpiracion } from '@services/dexie/documentos';

export const useDocumentos = () => {
  const setDocumentos = useSetAtom(documentosState);
  const setCategorias = useSetAtom(documentoCategoriasState);
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);

  const loadData = async () => {
    await dbDocumentosCheckExpiracion();
    
    const docs = await dbDocumentosGetAll();
    const cats = await dbDocumentosGetCategorias();
    
    setDocumentos(docs);
    setCategorias(cats);
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    documentos,
    categorias,
    reload: loadData,
  };
};
