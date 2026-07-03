import { useEffect, useRef } from 'react';
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
import { useCurrentUser } from '@hooks/index';

export const CATEGORIAS_INICIALES = [
  { nombre: 'Cuentas', color: '#10B981' },
  { nombre: 'Visita del Superintendente', color: '#6366F1' },
  { nombre: 'Asambleas', color: '#F59E0B' },
  { nombre: 'Anuncios', color: 'var(--accent-main)' },
  { nombre: 'Otros', color: '#64748B' },
];

// Singletons de módulo — evitan suscripciones duplicadas cuando varios
// componentes llaman a useDocumentos simultáneamente
let _activeCongId: string | null = null;
let _unsubDocs: (() => void) | null = null;
let _unsubCats: (() => void) | null = null;
// Evita sembrar categorías dos veces si onSnapshot dispara el callback con
// cats.length === 0 más de una vez (cache local + confirmación del servidor)
// antes de que el primer saveCategoriasFirestore() se refleje de vuelta.
let _seedingCategories = false;

export const useDocumentos = () => {
  const setDocumentos = useSetAtom(documentosState);
  const setCategorias = useSetAtom(documentoCategoriasState);
  const documentos = useAtomValue(documentosState);
  const categorias = useAtomValue(documentoCategoriasState);
  const congId = useAtomValue(congIDState);
  const { isElder, isAdmin } = useCurrentUser();
  const canDelete = isElder || isAdmin;
  // Ref para que la closure de onSnapshot siempre use el valor más reciente
  const canDeleteRef = useRef(canDelete);
  canDeleteRef.current = canDelete;

  // Teardown al hacer logout (congId pasa a '')
  useEffect(() => {
    if (congId) return;
    _unsubDocs?.();
    _unsubCats?.();
    _unsubDocs = null;
    _unsubCats = null;
    _activeCongId = null;
  }, [congId]);

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

      // Borrar documentos expirados en segundo plano — solo admins/ancianos.
      // Usamos la ref para leer el valor más reciente aunque la closure sea vieja.
      if (canDeleteRef.current) {
        expired.forEach((d) =>
          deleteDocumentoCompleto(congId, d.id).catch(console.error)
        );
      }
    });

    _unsubCats = subscribeCategories(congId, (cats) => {
      if (cats.length === 0) {
        if (_seedingCategories) return;
        _seedingCategories = true;

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
        saveCategoriasFirestore(congId, initialCats)
          .catch(console.error)
          .finally(() => {
            _seedingCategories = false;
          });
        return;
      }
      setCategorias(cats);
    });

    // Las suscripciones son globales — no se cancelan al desmontar componentes
    // Solo se cancelan si congId cambia (logout / cambio de cuenta)
  }, [congId, setDocumentos, setCategorias]);

  return { documentos, categorias };
};
