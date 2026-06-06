import appDb from '@db/appDb';

/** Devuelve la imagen (PNG base64) cacheada de un territorio, si existe. */
export const dbTerritoryGetLocalImage = async (
  territoryId: string
): Promise<string | undefined> => {
  const rec = await appDb.territories_files.get(territoryId);
  return rec?.imageData;
};

/** Guarda la imagen/KML de un territorio en la caché local del dispositivo. */
export const dbTerritorySaveFile = async (
  territoryId: string,
  data: { imageData?: string; kmlData?: string }
): Promise<void> => {
  const existing = await appDb.territories_files.get(territoryId);
  await appDb.territories_files.put({
    id: territoryId,
    territoryId,
    ...existing,
    ...data,
  });
};

/** Limpia la caché local al borrar un territorio. */
export const dbTerritoryDeleteFile = async (
  territoryId: string
): Promise<void> => {
  await appDb.territories_files.delete(territoryId);
};
