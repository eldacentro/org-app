import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { documentosState, documentoCategoriasState } from '@states/documentos';
import { congIDState } from '@states/settings';
import {
  subscribeDocumentos,
  subscribeCategories,
  saveCategoriasFirestore,
  deleteDocumentoCompleto,
} from '@services/firebase/documentos';
import { DocumentoCategoria } from '@definition/documentos';

export const CATEGORIAS_INICIALES = [
  { nombre: 'Cuentas', color: '#10B981' },
  { nombre: 'Visita del Superintendente', color: '#6366F1' },
  { nombre: 'Asambleas', color: '#F59E0B' },
  { nombre: 'Anuncios', color: '#306CB4' },
  { nombre: 'Otros', color: '#64748B' },
];

// Singletons de módulo — evitan suscripciones duplicadas cuando varios
// componentes llaman a useDocumentos simultáneamente
let _activeCongId: string | null = null;
let _unsubDocs: (() => void) | null = null;
let _unsubCats: (() => void) | null = null;

export const useDocumentos = () => {
  const setDocumentos = useSetAtom(documentosState);
  const setCategorias = useSetAtom(documentoCategoriasState);
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);
  const congId = useAtomValue(congIDState);

  useEffect(() => {
    if (!congId || _activeCongId === congId) return;

    // Si cambia la congregación, cancelar suscripciones anteriores
    _unsubDocs?.();
    _unsubCats?.();
    _activeCongId = congId;

    _unsubDocs = subscribeDocumentos(congId, (docs) => {
      const now = new Date();
      const expired = docs.filter(
        (d) => d.fechaExpiracion && new Date(d.fechaExpiracion) < now
      );
      const active = docs.filter(
        (d) => !d.fechaExpiracion || new Date(d.fechaExpiracion) >= now
      );

      setDocumentos(active);

      // Borrar documentos expirados en segundo plano
      // (Firestore onSnapshot se actualizará solo cuando se confirme el borrado)
      expired.forEach((d) =>
        deleteDocumentoCompleto(congId, d.id).catch(console.error)
      );
    });

    _unsubCats = subscribeCategories(congId, (cats) => {
      if (cats.length === 0) {
        // Primera vez: sembrar categorías por defecto
        const initialCats: DocumentoCategoria[] = CATEGORIAS_INICIALES.map(
          (c, i) => ({
            id: crypto.randomUUID(),
            nombre: c.nombre,
            color: c.color,
            orden: i,
            updatedAt: new Date().toISOString(),
          })
        );
        saveCategoriasFirestore(congId, initialCats).catch(console.error);
        return;
      }
      setCategorias(cats);
    });

    // Las suscripciones son globales — no se cancelan al desmontar componentes
    // Solo se cancelan si congId cambia (logout / cambio de cuenta)
  }, [congId, setDocumentos, setCategorias]);

  return { documentos, categorias };
};
