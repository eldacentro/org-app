import {
  collection,
  doc as fsDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { firestore } from './index';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import { dbDocumentosDelete } from '@services/dexie/documentos';

// ─── Colección helpers ────────────────────────────────────────────────────────

const docsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'documentos');

const catsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'documento_categorias');

// ─── Firebase Storage ─────────────────────────────────────────────────────────

export const uploadDocumentoPDF = async (
  congId: string,
  docId: string,
  blob: Blob
): Promise<string> => {
  const storage = getStorage();
  const fileRef = ref(storage, `congregation/${congId}/documentos/${docId}.pdf`);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
};

export const deleteDocumentoPDF = async (
  congId: string,
  docId: string
): Promise<void> => {
  const storage = getStorage();
  const fileRef = ref(storage, `congregation/${congId}/documentos/${docId}.pdf`);
  try {
    await deleteObject(fileRef);
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code !== 'storage/object-not-found') throw error;
  }
};

// ─── Firestore: Documentos ────────────────────────────────────────────────────

export const subscribeDocumentos = (
  congId: string,
  onUpdate: (docs: DocumentoArchivo[]) => void
): (() => void) => {
  return onSnapshot(
    docsCol(congId),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as DocumentoArchivo);
      onUpdate(docs);
    },
    (error) => console.error('Error en suscripción de documentos:', error)
  );
};

export const saveDocumentoFirestore = async (
  congId: string,
  documento: DocumentoArchivo
): Promise<void> => {
  // fileData es solo caché local — no va a Firestore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fileData: _fileData, ...docToSave } = documento;
  await setDoc(fsDoc(docsCol(congId), documento.id), docToSave);
};

export const deleteDocumentoFirestore = async (
  congId: string,
  docId: string
): Promise<void> => {
  await deleteDoc(fsDoc(docsCol(congId), docId));
};

export const marcarDocumentoVisto = async (
  congId: string,
  docId: string,
  personUid: string
): Promise<void> => {
  await updateDoc(fsDoc(docsCol(congId), docId), {
    vistoPor: arrayUnion(personUid),
  });
};

// Borra de Firestore + Storage + caché local en paralelo
export const deleteDocumentoCompleto = async (
  congId: string,
  docId: string
): Promise<void> => {
  await Promise.all([
    deleteDocumentoFirestore(congId, docId),
    deleteDocumentoPDF(congId, docId),
    dbDocumentosDelete(docId),
  ]);
};

// ─── Firestore: Categorías ────────────────────────────────────────────────────

export const subscribeCategories = (
  congId: string,
  onUpdate: (cats: DocumentoCategoria[]) => void
): (() => void) => {
  return onSnapshot(
    catsCol(congId),
    (snapshot) => {
      const cats = snapshot.docs
        .map((d) => d.data() as DocumentoCategoria)
        .sort((a, b) => a.orden - b.orden);
      onUpdate(cats);
    },
    (error) => console.error('Error en suscripción de categorías:', error)
  );
};

export const saveCategoriasFirestore = async (
  congId: string,
  categorias: DocumentoCategoria[]
): Promise<void> => {
  const batch = writeBatch(firestore);

  // Borrar las categorías existentes y escribir las nuevas en una sola operación
  const existing = await getDocs(catsCol(congId));
  existing.docs.forEach((d) => batch.delete(d.ref));
  categorias.forEach((cat) =>
    batch.set(fsDoc(catsCol(congId), cat.id), cat)
  );

  await batch.commit();
};
