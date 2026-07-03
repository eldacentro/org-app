import {
  collection,
  doc as fsDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
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

export const deleteTerritoryImage = async (
  congId: string,
  territoryId: string
): Promise<void> => {
  const storage = getStorage();
  const r = ref(storage, `congregation/${congId}/territories/${territoryId}.png`);
  await deleteObject(r).catch((error) => {
    const err = error as Error & { code?: string };
    if (err.code !== 'storage/object-not-found') throw error;
  });
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

/**
 * Actualiza solo los campos indicados del territorio (`updateDoc`, no
 * `setDoc`) — a diferencia de `saveTerritory`, no sobrescribe el documento
 * entero, así que no hay riesgo de pisar una edición concurrente (nombre,
 * notas, geometría) que el snapshot local todavía no reflejaba.
 */
export const updateTerritoryFields = (
  congId: string,
  territoryId: string,
  fields: Partial<Territory>
) => updateDoc(fsDoc(territoriesCol(congId), territoryId), fields);

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
  // 1. Borrar asignaciones huérfanas en batch (evita que queden en el S-13 para siempre)
  const assignSnap = await getDocs(
    query(assignmentsCol(congId), where('territoryId', '==', territoryId))
  );
  if (assignSnap.docs.length > 0) {
    const batch = writeBatch(firestore);
    assignSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 2. Borrar el territorio, sus archivos en Storage y su caché Dexie en paralelo
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

/** Mensaje mostrado cuando dos responsables intentan asignar el mismo
 *  territorio casi a la vez — el segundo pierde la carrera y ve este error
 *  igual que si el territorio ya hubiera estado asignado de antes. */
export const TERRITORY_ALREADY_ASSIGNED_MESSAGE = 'Este territorio ya está asignado';

/**
 * Abre una asignación nueva de forma segura frente a condiciones de
 * carrera: antes `saveAssignment` era un `setDoc` directo sin comprobar
 * nada en el servidor, así que si dos responsables (o el mismo en dos
 * pestañas) asignaban casi a la vez el mismo territorio libre, ambos
 * escribían con éxito y quedaban dos asignaciones abiertas duplicadas. Esta
 * transacción usa `territory.openAssignmentId` como candado: lee el
 * territorio, aborta si ya está ocupado, y si no, crea la asignación y
 * marca el territorio como ocupado en la misma transacción atómica.
 */
export const saveAssignmentTransactional = (
  congId: string,
  a: TerritoryAssignment,
  key: string
) =>
  runTransaction(firestore, async (tx) => {
    const territoryRef = fsDoc(territoriesCol(congId), a.territoryId);
    const territorySnap = await tx.get(territoryRef);
    if (territorySnap.data()?.openAssignmentId) {
      throw new Error(TERRITORY_ALREADY_ASSIGNED_MESSAGE);
    }
    tx.set(
      fsDoc(assignmentsCol(congId), a.id),
      stripUndefined({ ...a, notas: enc(a.notas, key) })
    );
    tx.update(territoryRef, { openAssignmentId: a.id });
  });

/**
 * Igual que `saveAssignmentTransactional`, pero además marca la solicitud
 * de origen como atendida en la misma transacción — antes eran dos
 * escrituras (`saveAssignment` + `atenderRequest`) sueltas; si la conexión
 * se cortaba entre medias, la solicitud quedaba "pendiente" para siempre
 * aunque el territorio ya se había asignado, y un segundo responsable
 * podía asignarle otro territorio más sin darse cuenta.
 */
export const saveAssignmentAndAttendRequest = (
  congId: string,
  a: TerritoryAssignment,
  key: string,
  requestId: string,
  attendedBy: string
) =>
  runTransaction(firestore, async (tx) => {
    const territoryRef = fsDoc(territoriesCol(congId), a.territoryId);
    const territorySnap = await tx.get(territoryRef);
    if (territorySnap.data()?.openAssignmentId) {
      throw new Error(TERRITORY_ALREADY_ASSIGNED_MESSAGE);
    }
    tx.set(
      fsDoc(assignmentsCol(congId), a.id),
      stripUndefined({ ...a, notas: enc(a.notas, key) })
    );
    tx.update(territoryRef, { openAssignmentId: a.id });
    tx.update(fsDoc(requestsCol(congId), requestId), {
      atendidaPor: attendedBy,
      atendidaAt: new Date().toISOString(),
    });
  });

/**
 * Finaliza una asignación (entregada trabajada o devuelta sin trabajar) y
 * libera el candado del territorio (`openAssignmentId`) si esta era la
 * asignación que lo tenía — antes solo se actualizaba el territorio cuando
 * status==='trabajado' (para lastWorkedAt), así que al "devolver sin
 * trabajar" el territorio se quedaba marcado como ocupado para siempre.
 * Un único batch evita estado inconsistente si falla la red entre escrituras.
 */
export const finalizeAssignmentBatch = async (
  congId: string,
  assignment: TerritoryAssignment,
  territory: Territory | null,
  key: string
): Promise<void> => {
  const batch = writeBatch(firestore);
  batch.set(
    fsDoc(assignmentsCol(congId), assignment.id),
    stripUndefined({ ...assignment, notas: enc(assignment.notas, key) })
  );
  if (territory) {
    const territoryUpdate: Record<string, unknown> = {};
    if (territory.openAssignmentId === assignment.id) {
      territoryUpdate.openAssignmentId = null;
    }
    if (assignment.status === 'trabajado') {
      territoryUpdate.lastWorkedAt = assignment.returnedAt;
      territoryUpdate.updatedAt = assignment.updatedAt;
    }
    if (Object.keys(territoryUpdate).length > 0) {
      batch.update(fsDoc(territoriesCol(congId), territory.id), territoryUpdate);
    }
  }
  await batch.commit();
};

/**
 * Borra una asignación y libera el candado del territorio si era la que lo
 * tenía — sin esto, borrar manualmente una asignación abierta (en vez de
 * "Entregar") dejaba el territorio marcado como ocupado para siempre.
 */
export const deleteAssignment = async (
  congId: string,
  assignmentId: string,
  territory?: Territory | null
): Promise<void> => {
  if (territory && territory.openAssignmentId === assignmentId) {
    const batch = writeBatch(firestore);
    batch.delete(fsDoc(assignmentsCol(congId), assignmentId));
    batch.update(fsDoc(territoriesCol(congId), territory.id), {
      openAssignmentId: null,
    });
    await batch.commit();
    return;
  }
  await deleteDoc(fsDoc(assignmentsCol(congId), assignmentId));
};

/**
 * Migración de un solo uso (idempotente): rellena returnedAt: null en las
 * asignaciones abiertas que se crearon antes de que ese campo se escribiera
 * explícito (antes simplemente se omitía). Necesario para poder filtrar más
 * adelante con where('returnedAt','==',null) — Firestore no encuentra
 * documentos donde el campo no existe en absoluto.
 *
 * Recibe las asignaciones ya cargadas (vía la suscripción existente) en vez
 * de volver a consultarlas, así no duplica lecturas. Se puede llamar en cada
 * carga: una vez migrada una asignación, deja de aparecer en `stale` y no
 * vuelve a escribirse.
 */
export const backfillMissingReturnedAt = async (
  congId: string,
  assignments: TerritoryAssignment[]
): Promise<void> => {
  const stale = assignments.filter((a) => a.returnedAt === undefined);
  if (stale.length === 0) return;

  for (let i = 0; i < stale.length; i += 450) {
    const slice = stale.slice(i, i + 450);
    const batch = writeBatch(firestore);
    slice.forEach((a) =>
      batch.update(fsDoc(assignmentsCol(congId), a.id), { returnedAt: null })
    );
    await batch.commit();
  }
};

/**
 * Migración de un solo uso: repara `territory.openAssignmentId` para
 * territorios que ya existían ANTES de que este campo existiera (por eso se
 * mira específicamente `undefined`, no `null` — `null` significa "ya
 * migrado y libre", no "sin migrar"). Sin esto, esos territorios se verían
 * como "libres" para el candado de la transacción de asignación aunque ya
 * estuvieran ocupados.
 *
 * A propósito NO compara contra el estado local `assignments` para decidir
 * si hay que escribir (ese estado viene de onSnapshot y va un paso por
 * detrás de Firestore) — una primera versión de esta función comparaba
 * "¿coincide con lo que debería ser?" usando el snapshot local, y podía
 * pisar un candado recién puesto por una transacción de asignación real
 * que el listener local todavía no había reflejado. Ahora cada territorio
 * se repara con su propia transacción, que solo actúa si el campo sigue
 * siendo `undefined` en el momento de leer — si alguien ya lo asignó
 * (o cualquier otra escritura ya fijó el campo, aunque sea a `null`) esta
 * migración ya no lo vuelve a tocar nunca.
 */
export const backfillOpenAssignmentLocks = async (
  congId: string,
  territories: Territory[],
  assignments: TerritoryAssignment[]
): Promise<void> => {
  const openByTerritory = new Map<string, string>();
  assignments.forEach((a) => {
    if (!a.returnedAt) openByTerritory.set(a.territoryId, a.id);
  });

  const unmigrated = territories.filter((t) => t.openAssignmentId === undefined);
  if (unmigrated.length === 0) return;

  await Promise.all(
    unmigrated.map((t) =>
      runTransaction(firestore, async (tx) => {
        const territoryRef = fsDoc(territoriesCol(congId), t.id);
        const snap = await tx.get(territoryRef);
        if (snap.data()?.openAssignmentId !== undefined) return; // ya migrado
        tx.update(territoryRef, { openAssignmentId: openByTerritory.get(t.id) ?? null });
      }).catch((err) => {
        console.error(`Failed to backfill openAssignmentId for ${t.id}:`, err);
      })
    )
  );
};

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

/**
 * Borra la campaña Y todas las asignaciones que le pertenecen.
 * Las asignaciones de campaña son temporales; al borrar la campaña
 * deben desaparecer también del historial activo para no dejar huérfanos.
 */
export const deleteCampaign = async (
  congId: string,
  campaignId: string
): Promise<void> => {
  // 1. Obtener todas las asignaciones de esta campaña
  const q = query(
    assignmentsCol(congId),
    where('campaignId', '==', campaignId)
  );
  const snap = await getDocs(q);

  // 2. Borrar en batch (máx. 500 ops; las campañas rara vez tienen más)
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(fsDoc(campaignsCol(congId), campaignId));
  await batch.commit();
};

export const saveRequest = (congId: string, r: TerritoryRequest) =>
  setDoc(fsDoc(requestsCol(congId), r.id), stripUndefined(r));

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

// `merge: true` — antes era un setDoc de documento completo, así que el
// efecto que auto-sincroniza `managers` (useTerritories.tsx) podía pisar
// cambios de Configuración guardados casi al mismo tiempo (y viceversa) si
// cada uno partía de una copia local de `settings` ligeramente distinta.
// Con merge, cada llamada solo toca los campos que de verdad pasa.
export const saveSettings = (
  congId: string,
  settings: Partial<TerritorySettings>
) => setDoc(settingsDoc(congId), settings, { merge: true });

// ─── Backup helper ─────────────────────────────────────────────────────────────
/**
 * Reads all territory collections from Firestore in parallel and returns them
 * as a plain-object snapshot for inclusion in the congregation backup.
 * NOTE: sensitive fields (notas, direccion) are returned in their encrypted
 * form (enc:: prefix) intentionally — the backup mirrors the server state and
 * only the owning congregation can decrypt them.
 */
export const fetchTerritoryBackupData = async (
  congId: string
): Promise<Record<string, DocumentData[]>> => {
  const read = async (col: ReturnType<typeof collection>) => {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data());
  };

  const [
    zones,
    territories,
    assignments,
    locations,
    campaigns,
    requests,
    notices,
    tags,
    settingsSnap,
  ] = await Promise.all([
    read(zonesCol(congId)),
    read(territoriesCol(congId)),
    read(assignmentsCol(congId)),
    read(locationsCol(congId)),
    read(campaignsCol(congId)),
    read(requestsCol(congId)),
    read(noticesCol(congId)),
    read(tagsCol(congId)),
    getDocs(collection(firestore, 'congregation', congId, 'territory_settings')),
  ]);

  return {
    zones,
    territories,
    assignments,
    locations,
    campaigns,
    requests,
    notices,
    tags,
    settings: settingsSnap.docs.map((d) => d.data()),
  };
};
