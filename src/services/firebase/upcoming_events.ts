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

  // Sin esto, Storage sirve el archivo sin Cache-Control explícito, así
  // que el navegador vuelve a pedirlo por red cada vez que se abre la
  // página (de ahí la demora, aunque el archivo pese poco). Con caché
  // larga + un parámetro de versión en la URL guardada, la MISMA foto se
  // sirve al instante desde caché en visitas futuras, y "Cambiar portada"
  // sigue funcionando porque genera una URL distinta (nunca sirve la
  // versión vieja cacheada).
  await uploadBytes(fileRef, blob, {
    cacheControl: 'public, max-age=31536000, immutable',
  });

  const url = await getDownloadURL(fileRef);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
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
