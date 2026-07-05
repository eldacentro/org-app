import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// ─── Firebase Storage: portada de asamblea ────────────────────────────────────
// Mismo patrón que Documentos/Territorios: el binario vive en Storage, y solo
// la URL de descarga se guarda en el registro sincronizado (event_data.coverPhotoUrl).

export const uploadUpcomingEventCoverPhoto = async (
  congId: string,
  eventUid: string,
  blob: Blob
): Promise<string> => {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `congregation/${congId}/upcoming_events/${eventUid}.jpg`
  );
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
};

export const deleteUpcomingEventCoverPhoto = async (
  congId: string,
  eventUid: string
): Promise<void> => {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `congregation/${congId}/upcoming_events/${eventUid}.jpg`
  );
  try {
    await deleteObject(fileRef);
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code !== 'storage/object-not-found') throw error;
  }
};
