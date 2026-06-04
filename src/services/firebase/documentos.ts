import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadDocumentoPDF = async (congId: string, docId: string, blob: Blob): Promise<string> => {
  const storage = getStorage();
  const fileRef = ref(storage, `congregation/${congId}/documentos/${docId}.pdf`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
};

export const getDocumentoPDFUrl = async (congId: string, docId: string): Promise<string> => {
  const storage = getStorage();
  const fileRef = ref(storage, `congregation/${congId}/documentos/${docId}.pdf`);
  return await getDownloadURL(fileRef);
};

export const deleteDocumentoPDF = async (congId: string, docId: string): Promise<void> => {
  const storage = getStorage();
  const fileRef = ref(storage, `congregation/${congId}/documentos/${docId}.pdf`);
  try {
    await deleteObject(fileRef);
  } catch (error: any) {
    if (error.code !== 'storage/object-not-found') {
      throw error;
    }
  }
};
