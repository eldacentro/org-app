import {
  collection,
  doc as fsDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
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
import { encryptData, decryptData } from '@services/encryption';
import {
  Territory,
  TerritoryAssignment,
  TerritoryCampaign,
  TerritoryLocation,
  TerritoryNotice,
  TerritoryRequest,
  TerritorySettings,
  TerritoryTag,
  TerritoryZone,
} from '@definition/territories';
import { dbTerritoryDeleteFile } from '@services/dexie/territories';

// ─── Colección helpers ─────────────────────────────────────────────────────
const zonesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_zones');
const territoriesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territories');
const assignmentsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_assignments');
const locationsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_locations');
const campaignsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_campaigns');
const requestsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_requests');
const noticesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_notices');
const tagsCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_tags');
const settingsDoc = (congId: string) =>
  fsDoc(firestore, 'congregation', congId, 'territory_settings', 'settings');

// ─── Cifrado de campos sensibles ───────────────────────────────────────────
// Solo cifra texto no vacío; descifra tolerando fallos (devuelve '' si no se
// puede). El prefijo permite distinguir texto cifrado de texto plano heredado.
const ENC_PREFIX = 'enc::';

const enc = (text: string | undefined, key: string): string | undefined => {
  if (!text) return text;
  if (!key) return text; // sin clave: no romper (se guardará en claro)
  return ENC_PREFIX + encryptData(text, key);
};

const dec = (
  value: string | undefined,
  key: string,
  field: string
): string | undefined => {
  if (!value) return value;
  if (!value.startsWith(ENC_PREFIX)) return value; // texto plano heredado
  if (!key) return '';
  try {
    return decryptData(value.slice(ENC_PREFIX.length), key, field);
  } catch {
    return '';
  }
};

// Firestore rechaza campos con valor `undefined`; los quitamos del payload.
const stripUndefined = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;

// ─── Geometría ──────────────────────────────────────────────────────────────
// Firestore no admite arrays anidados (los polígonos GeoJSON lo son), así que
// la geometría se guarda serializada como string JSON y se parsea al leer.
const serializeGeometry = (g: Territory['geometry']): string | null =>
  g ? JSON.stringify(g) : null;

const parseGeometry = (value: unknown): Territory['geometry'] => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Territory['geometry']; // tolera docs antiguos no serializados
};

// ─── Firebase Storage (KML / PNG) ──────────────────────────────────────────
export const uploadTerritoryImage = async (
  congId: string,
  territoryId: string,
  blob: Blob
): Promise<string> => {
  const storage = getStorage();
  const r = ref(storage, `congregation/${congId}/territories/${territoryId}.png`);
  await uploadBytes(r, blob);
  return getDownloadURL(r);
};

export const uploadTerritoryKml = async (
  congId: string,
  territoryId: string,
  blob: Blob
): Promise<string> => {
  const storage = getStorage();
  const r = ref(storage, `congregation/${congId}/territories/${territoryId}.kml`);
  await uploadBytes(r, blob);
  return getDownloadURL(r);
};

const deleteTerritoryFiles = async (
  congId: string,
  territoryId: string
): Promise<void> => {
  const storage = getStorage();
  const targets = ['png', 'kml'].map((ext) =>
    ref(storage, `congregation/${congId}/territories/${territoryId}.${ext}`)
  );
  await Promise.all(
    targets.map((r) =>
      deleteObject(r).catch((error) => {
        const err = error as Error & { code?: string };
        if (err.code !== 'storage/object-not-found') throw error;
      })
    )
  );
};

// ─── Suscripciones (onSnapshot, tiempo real) ───────────────────────────────
const subscribe = <T>(
  col: ReturnType<typeof collection>,
  map: (data: Record<string, unknown>) => T,
  onUpdate: (rows: T[]) => void,
  label: string
): (() => void) =>
  onSnapshot(
    col,
    (snap) => onUpdate(snap.docs.map((d) => map(d.data()))),
    (error) => console.error(`Error en suscripción de ${label}:`, error)
  );

export const subscribeZones = (
  congId: string,
  cb: (rows: TerritoryZone[]) => void
) => subscribe(zonesCol(congId), (d) => d as TerritoryZone, cb, 'zonas');

export const subscribeTerritories = (
  congId: string,
  key: string,
  cb: (rows: Territory[]) => void
) =>
  subscribe(
    territoriesCol(congId),
    (d) =>
      ({
        ...d,
        geometry: parseGeometry(d.geometry),
        notas: dec(d.notas as string, key, 'territory.notas'),
      }) as Territory,
    cb,
    'territorios'
  );

export const subscribeAssignments = (
  congId: string,
  key: string,
  cb: (rows: TerritoryAssignment[]) => void
) =>
  subscribe(
    assignmentsCol(congId),
    (d) =>
      ({ ...d, notas: dec(d.notas as string, key, 'assignment.notas') }) as TerritoryAssignment,
    cb,
    'asignaciones'
  );

export const subscribeLocations = (
  congId: string,
  key: string,
  cb: (rows: TerritoryLocation[]) => void
) =>
  subscribe(
    locationsCol(congId),
    (d) =>
      ({
        ...d,
        direccion: dec(d.direccion as string, key, 'location.direccion'),
        nota: dec(d.nota as string, key, 'location.nota'),
      }) as TerritoryLocation,
    cb,
    'direcciones'
  );

export const subscribeCampaigns = (
  congId: string,
  cb: (rows: TerritoryCampaign[]) => void
) => subscribe(campaignsCol(congId), (d) => d as TerritoryCampaign, cb, 'campañas');

export const subscribeRequests = (
  congId: string,
  cb: (rows: TerritoryRequest[]) => void
) => subscribe(requestsCol(congId), (d) => d as TerritoryRequest, cb, 'solicitudes');

export const subscribeNotices = (
  congId: string,
  cb: (rows: TerritoryNotice[]) => void
) => subscribe(noticesCol(congId), (d) => d as TerritoryNotice, cb, 'avisos');

export const subscribeTags = (
  congId: string,
  cb: (rows: TerritoryTag[]) => void
) => subscribe(tagsCol(congId), (d) => d as TerritoryTag, cb, 'etiquetas');

export const subscribeSettings = (
  congId: string,
  cb: (settings: TerritorySettings | null) => void
) =>
  onSnapshot(
    settingsDoc(congId),
    (snap) => cb(snap.exists() ? (snap.data() as TerritorySettings) : null),
    (error) => console.error('Error en suscripción de ajustes:', error)
  );

// ─── Guardado ──────────────────────────────────────────────────────────────
export const saveZone = (congId: string, zone: TerritoryZone) =>
  setDoc(fsDoc(zonesCol(congId), zone.id), zone);

export const deleteZone = (congId: string, zoneId: string) =>
  deleteDoc(fsDoc(zonesCol(congId), zoneId));

export const saveTerritory = (
  congId: string,
  territory: Territory,
  key: string
) =>
  setDoc(
    fsDoc(territoriesCol(congId), territory.id),
    stripUndefined({
      ...territory,
      geometry: serializeGeometry(territory.geometry),
      notas: enc(territory.notas, key),
    })
  );

/** Guarda muchos territorios de una vez (importación KML). */
export const saveTerritoriesBatch = async (
  congId: string,
  territories: Territory[],
  key: string
): Promise<void> => {
  // Firestore: máx. 500 escrituras por batch
  for (let i = 0; i < territories.length; i += 450) {
    const slice = territories.slice(i, i + 450);
    const batch = writeBatch(firestore);
    slice.forEach((t) =>
      batch.set(
        fsDoc(territoriesCol(congId), t.id),
        stripUndefined({
          ...t,
          geometry: serializeGeometry(t.geometry),
          notas: enc(t.notas, key),
        })
      )
    );
    await batch.commit();
  }
};

export const deleteTerritoryCompleto = async (
  congId: string,
  territoryId: string
): Promise<void> => {
  await Promise.all([
    deleteDoc(fsDoc(territoriesCol(congId), territoryId)),
    deleteTerritoryFiles(congId, territoryId),
    dbTerritoryDeleteFile(territoryId),
  ]);
};

export const saveAssignment = (
  congId: string,
  a: TerritoryAssignment,
  key: string
) =>
  setDoc(
    fsDoc(assignmentsCol(congId), a.id),
    stripUndefined({ ...a, notas: enc(a.notas, key) })
  );

export const deleteAssignment = (congId: string, assignmentId: string) =>
  deleteDoc(fsDoc(assignmentsCol(congId), assignmentId));

export const saveLocation = (
  congId: string,
  l: TerritoryLocation,
  key: string
) =>
  setDoc(
    fsDoc(locationsCol(congId), l.id),
    stripUndefined({
      ...l,
      direccion: enc(l.direccion, key),
      nota: enc(l.nota, key),
    })
  );

export const deleteLocation = (congId: string, locationId: string) =>
  deleteDoc(fsDoc(locationsCol(congId), locationId));

export const saveCampaign = (congId: string, c: TerritoryCampaign) =>
  setDoc(fsDoc(campaignsCol(congId), c.id), c);

export const deleteCampaign = (congId: string, campaignId: string) =>
  deleteDoc(fsDoc(campaignsCol(congId), campaignId));

export const saveRequest = (congId: string, r: TerritoryRequest) =>
  setDoc(fsDoc(requestsCol(congId), r.id), r);

export const atenderRequest = (
  congId: string,
  requestId: string,
  personUid: string
) =>
  updateDoc(fsDoc(requestsCol(congId), requestId), {
    atendidaPor: personUid,
    atendidaAt: new Date().toISOString(),
  });

export const saveNotice = (congId: string, notice: TerritoryNotice) =>
  setDoc(fsDoc(noticesCol(congId), notice.id), stripUndefined(notice));

export const markNoticeRead = (congId: string, noticeId: string) =>
  updateDoc(fsDoc(noticesCol(congId), noticeId), { leido: true });

export const deleteNotice = (congId: string, noticeId: string) =>
  deleteDoc(fsDoc(noticesCol(congId), noticeId));

export const saveTag = (congId: string, tag: TerritoryTag) =>
  setDoc(fsDoc(tagsCol(congId), tag.id), tag);

export const deleteTag = (congId: string, tagId: string) =>
  deleteDoc(fsDoc(tagsCol(congId), tagId));

export const saveSettings = (congId: string, settings: TerritorySettings) =>
  setDoc(settingsDoc(congId), settings);
