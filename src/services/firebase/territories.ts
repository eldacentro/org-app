import {
  collection,
  doc as fsDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
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
  TerritorySection,
  TerritorySettings,
  TerritoryTag,
  TerritoryZone,
} from '@definition/territories';
import { dbTerritoryDeleteFile } from '@services/dexie/territories';
import { computeDueAt, ENC_PREFIX } from '@services/app/territories';

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
const sharesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_shares');
const settingsDoc = (congId: string) =>
  fsDoc(firestore, 'congregation', congId, 'territory_settings', 'settings');

// ─── Cifrado de campos sensibles ───────────────────────────────────────────
// Solo cifra texto no vacío; descifra tolerando fallos (devuelve '' si no se
// puede). El prefijo permite distinguir texto cifrado de texto plano heredado.
// El prefijo y el detector viven en services/app/territories para que la
// interfaz pueda usarlos sin importar la capa de Firebase.

/** Mensaje del error que se lanza al intentar guardar texto sensible sin clave. */
export const TERRITORY_NO_KEY_MESSAGE =
  'No se puede guardar: falta la llave maestra en este dispositivo';

const enc = (text: string | undefined, key: string): string | undefined => {
  if (!text) return text;

  // Sin clave NO se guarda en claro. Antes sí —"para no romper"— y el efecto
  // era que las notas y direcciones escritas por quien no tiene la llave
  // maestra (un miembro del departamento de Territorios que no sea anciano,
  // que es un caso previsto por la app) acababan en el servidor legibles,
  // rompiendo justo la promesa de que ahí nadie puede leerlas. Y en silencio:
  // como no llevan el prefijo, nadie las distingue de las cifradas. Mejor
  // fallar y decirlo.
  if (!key) throw new Error(TERRITORY_NO_KEY_MESSAGE);

  return ENC_PREFIX + encryptData(text, key);
};

const dec = (
  value: string | undefined,
  key: string,
  field: string
): string | undefined => {
  if (!value) return value;
  if (!value.startsWith(ENC_PREFIX)) return value; // texto plano heredado
  // NUNCA devolver '' cuando no se puede descifrar. Antes sí, y eso
  // destruía el dato: el '' entraba en el estado de la app y el siguiente
  // guardado de documento completo lo escribía de vuelta en Firestore,
  // borrando para toda la congregación una nota o una dirección "No
  // visitar" que estaba perfectamente guardada — solo porque en ESE
  // dispositivo faltaba la master key. Devolviendo el texto cifrado tal
  // cual, un guardado de ida y vuelta lo deja intacto. Es la misma
  // invariante que ya respeta `decryptObject` en el resto de la app.
  if (!key) return value;
  try {
    return decryptData(value.slice(ENC_PREFIX.length), key, field);
  } catch {
    return value;
  }
};

// Firestore rechaza campos con valor `undefined`; los quitamos del payload.
const stripUndefined = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;

/** ¿`candidate` es posterior a la fecha de último trabajo que ya hay?
 *  (sin fecha previa = siempre sí). Las fechas son ISO 8601 en UTC, así que
 *  se pueden comparar como cadenas sin construir Date. */
const isNewerWorkDate = (candidate: string, current?: string): boolean =>
  !current || candidate > current;

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

/**
 * Los trozos llevan geometría, así que les pasa lo mismo: Firestore no admite
 * arrays anidados. Se guardan con su polígono serializado y se parsean al
 * leer, igual que el del territorio.
 *
 * Sin esto, guardar una división fallaba entera y por pantalla salía
 * "comprueba tu conexión" —con conexión de sobra—, que es lo que dice el
 * catch cuando en realidad el servidor ha rechazado el documento.
 */
export const serializeSecciones = (secciones: TerritorySection[]) =>
  secciones.map((seccion) => ({
    ...seccion,
    geometry: JSON.stringify(seccion.geometry),
  }));

/** La vuelta. Un trozo cuyo polígono no se entienda se descarta: antes que
 *  enseñar medio reparto inventado, se enseña el que sí se entiende. */
export const parseSecciones = (
  value: unknown
): TerritorySection[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((seccion) => ({
      ...(seccion as TerritorySection),
      geometry: parseGeometry(
        (seccion as { geometry: unknown }).geometry
      ) as TerritorySection['geometry'],
    }))
    .filter((seccion) => Boolean(seccion.geometry));
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
        secciones: parseSecciones(d.secciones),
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

/**
 * Los territorios que ha llevado UNA persona, de una sola consulta.
 *
 * La ficha de persona no puede montar `useTerritories()` solo para esto: ese
 * hook abre nueve suscripciones en tiempo real a todo el módulo, y aquí basta
 * con mirar una vez. Se consulta por `personUid` —que va en claro— y se piden
 * también los territorios para poder poner el número de cada uno; son unos
 * cien documentos pequeños y se leen una única vez al abrir la pestaña.
 *
 * Las notas de la asignación NO se descifran: no hacen falta para la ficha y
 * así esto funciona igual sin la llave maestra.
 */
export const fetchPersonTerritoryHistory = async (
  congId: string,
  personUid: string
): Promise<{ assignment: TerritoryAssignment; territoryLabel: string }[]> => {
  const assignmentsSnap = await getDocs(
    query(assignmentsCol(congId), where('personUid', '==', personUid))
  );

  // Sin asignaciones no hace falta leerse el listado entero de territorios
  // solo para poner nombres a nada.
  if (assignmentsSnap.empty) return [];

  const territoriesSnap = await getDocs(territoriesCol(congId));

  const labels = new Map<string, string>();

  for (const doc of territoriesSnap.docs) {
    const data = doc.data();
    const numero = (data.numero as string) ?? '';
    const nombre = (data.nombre as string) ?? '';

    labels.set(doc.id, [numero, nombre].filter(Boolean).join(' · '));
  }

  return assignmentsSnap.docs.map((doc) => {
    const assignment = { ...doc.data(), notas: undefined } as TerritoryAssignment;

    return {
      assignment,
      territoryLabel: labels.get(assignment.territoryId) ?? '',
    };
  });
};

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
    (snap) => {
      // "No existe" solo se acepta como respuesta REAL del servidor. Con la
      // caché persistente, un dispositivo recién instalado o sin cobertura
      // recibe primero un snapshot vacío desde disco; quien escucha esto
      // siembra entonces los ajustes por defecto y, al recuperar la red,
      // ese guardado pisaba la configuración real de la congregación
      // (días de atraso, mensajes, permisos de los publicadores...). Un
      // dispositivo que solo estaba mirando reseteaba los ajustes de todos.
      const fromCache = snap.metadata.fromCache;
      if (!snap.exists()) {
        if (fromCache) return;
        cb(null);
        return;
      }
      cb(snap.data() as TerritorySettings);
    },
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
      secciones: territory.secciones
        ? serializeSecciones(territory.secciones)
        : undefined,
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

/**
 * Actualiza los campos que edita el diálogo "Editar territorio" (número,
 * nombre, etiquetas, zona, notas, viviendas y geometría) cifrando notas y
 * serializando la geometría igual que `saveTerritory`, pero vía `updateDoc`
 * — así una edición concurrente en otro campo (p. ej. `openAssignmentId` al
 * asignar el territorio desde otro dispositivo) no se pierde al guardar.
 */
/**
 * Actualización parcial y acotada de un territorio para flujos que NO tocan
 * la asignación: subir/borrar la imagen, alternar una etiqueta.
 *
 * Existe porque `saveTerritory` es un `setDoc` del documento entero y esos
 * flujos lo llamaban con una copia del territorio capturada en el render.
 * Si entre medias otro responsable asignaba o entregaba ese territorio, al
 * guardar la imagen se reescribían `openAssignmentId` y `lastWorkedAt` con
 * los valores viejos: o se soltaba el candado de una asignación abierta
 * (dos hermanos con el mismo territorio) o se revivía el candado de una ya
 * cerrada (territorio inasignable para siempre).
 */
export const updateTerritoryPartial = (
  congId: string,
  territoryId: string,
  // `imageURL: null` borra la imagen (Firestore no acepta `undefined`).
  fields: {
    imageURL?: string | null;
    tags?: string[];
    /** Los trozos en los que está dividido. Un array vacío quita la división. */
    secciones?: TerritorySection[];
    updatedAt?: string;
  }
) =>
  updateDoc(
    fsDoc(territoriesCol(congId), territoryId),
    stripUndefined({
      ...fields,
      // El polígono de cada trozo, a texto (ver `serializeSecciones`).
      ...(fields.secciones
        ? { secciones: serializeSecciones(fields.secciones) }
        : {}),
      updatedAt: fields.updatedAt ?? new Date().toISOString(),
    })
  );

export const updateTerritoryEditableFields = (
  congId: string,
  territoryId: string,
  fields: {
    numero: string;
    nombre?: string;
    notas?: string;
    numeroViviendas?: number;
    zoneId: string;
    tags: string[];
    geometry: Territory['geometry'];
    updatedAt: string;
    /** `true` cuando este dispositivo no puede descifrar la nota actual: se
     *  deja EXACTAMENTE como está. Sin esto, el editor mandaba la nota vacía
     *  (porque el campo se bloquea y no se carga) y `?? null` la borraba. */
    keepNotas?: boolean;
    /** `true` si ha cambiado la forma: los trozos de dentro ya no valen. */
    borrarSecciones?: boolean;
  },
  key: string
) => {
  const payload: Record<string, unknown> = {
    numero: fields.numero,
    nombre: fields.nombre || null,
    numeroViviendas: fields.numeroViviendas ?? null,
    zoneId: fields.zoneId,
    tags: fields.tags,
    geometry: serializeGeometry(fields.geometry),
    updatedAt: fields.updatedAt,
  };
  if (!fields.keepNotas) payload.notas = enc(fields.notas, key) ?? null;
  if (fields.borrarSecciones) payload.secciones = [];
  return updateDoc(fsDoc(territoriesCol(congId), territoryId), payload);
};

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
          secciones: t.secciones ? serializeSecciones(t.secciones) : undefined,
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
  // Orden importante: PRIMERO el territorio, DESPUÉS su historial.
  //
  // Antes era al revés y, si el segundo paso fallaba (permiso de Storage, un
  // error al borrar el PNG…), quedaba un territorio vivo con su registro
  // del S-13 completamente vaciado — lo peor de los dos mundos. Así, si algo
  // se tuerce, lo que queda son asignaciones sin territorio: invisibles,
  // inofensivas y recuperables volviendo a lanzar el borrado.
  await Promise.all([
    deleteDoc(fsDoc(territoriesCol(congId), territoryId)),
    deleteTerritoryFiles(congId, territoryId),
    dbTerritoryDeleteFile(territoryId),
  ]);

  // Historial de asignaciones + direcciones "No visitar". Las direcciones
  // antes NO se borraban nunca: quedaban huérfanas en `territory_locations`
  // para siempre, invisibles desde la app y sin forma de purgarlas — datos
  // personales de vecinos que ya no tenían por qué seguir guardados.
  const [assignSnap, locSnap, shareSnap, campSnap] = await Promise.all([
    getDocs(query(assignmentsCol(congId), where('territoryId', '==', territoryId))),
    getDocs(query(locationsCol(congId), where('territoryId', '==', territoryId))),
    // Los enlaces públicos guardan un snapshot CIFRADO del territorio, con
    // sus direcciones "No visitar" dentro, y al lado la clave envuelta con
    // la clave de la congregación. Si no se borran aquí, borrar un
    // territorio precisamente para purgar datos personales dejaba una copia
    // íntegra de esos datos viva para siempre, sin ninguna pantalla desde la
    // que verla o eliminarla.
    getDocs(query(sharesCol(congId), where('territoryId', '==', territoryId))),
    getDocs(query(campaignsCol(congId), where('territoryIds', 'array-contains', territoryId))),
  ]);

  const refs = [...assignSnap.docs, ...locSnap.docs, ...shareSnap.docs].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(firestore);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }

  // Y quitarlo de las campañas que lo incluyeran: si no, el contador seguía
  // diciendo "40 territorios" mientras la lista solo pintaba 39, para
  // siempre y sin forma de limpiarlo desde la interfaz.
  await Promise.all(
    campSnap.docs.map((d) =>
      updateDoc(d.ref, {
        territoryIds: arrayRemove(territoryId),
        updatedAt: new Date().toISOString(),
      })
    )
  );
};

/**
 * Actualiza SOLO la nota de una asignación.
 *
 * Antes esto se hacía con `saveAssignment` (setDoc del documento entero)
 * partiendo de la copia que el diálogo capturó al abrirse. Si mientras la
 * nota estaba abierta el publicador entregaba el territorio desde su móvil,
 * al guardar se reescribían `returnedAt: null` y `status: 'asignado'`: la
 * entrega desaparecía del historial y el territorio quedaba con una
 * asignación abierta pero sin candado, así que se podía asignar otra vez a
 * un segundo hermano.
 */
/**
 * Presta el territorio (o deja de prestarlo). Se escribe la lista entera,
 * que es un puñado de entradas y se resuelve en una sola escritura.
 */
export const updateAssignmentShares = (
  congId: string,
  assignmentId: string,
  compartidoCon: { personUid: string; hasta: string }[]
) =>
  updateDoc(fsDoc(assignmentsCol(congId), assignmentId), {
    compartidoCon,
    updatedAt: new Date().toISOString(),
  });

export const updateAssignmentNote = (
  congId: string,
  assignmentId: string,
  nota: string | undefined,
  key: string
) =>
  updateDoc(fsDoc(assignmentsCol(congId), assignmentId), {
    notas: enc(nota, key) ?? null,
    updatedAt: new Date().toISOString(),
  });

// `saveAssignment` (un `setDoc` directo, sin candado) se ha eliminado a
// propósito: ya no lo llamaba nadie, pero seguía exportado y era la forma más
// fácil de reintroducir sin querer el error de las asignaciones duplicadas —
// basta con que alguien lo autocomplete en un flujo nuevo. Para abrir una
// asignación, usa siempre `saveAssignmentTransactional`.

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
      atendidaComo: 'asignada',
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
  // `update` de solo los campos que cambia una entrega, NUNCA `set` del
  // documento entero. Con `set` se reescribían también `dueAt`,
  // `campaignId`, `assignedBy` e `isCampaign` desde el snapshot local de
  // quien entrega, pisando cambios hechos a la vez desde otro dispositivo.
  // Y peor con `notas`: el publicador no tiene la master key, así que el
  // campo llegaba a su móvil sin descifrar y al guardar lo dejaba como
  // estuviera — la nota que hubiera escrito el responsable se perdía.
  batch.update(
    fsDoc(assignmentsCol(congId), assignment.id),
    stripUndefined({
      returnedAt: assignment.returnedAt,
      status: assignment.status,
      // Solo se toca la nota si de verdad se está escribiendo una; si el
      // publicador no escribió nada, la que ya hubiera se deja intacta.
      notas: assignment.notas ? enc(assignment.notas, key) : undefined,
      updatedAt: assignment.updatedAt,
    })
  );
  if (territory) {
    const territoryUpdate: Record<string, unknown> = {};
    if (territory.openAssignmentId === assignment.id) {
      territoryUpdate.openAssignmentId = null;
    }
    // Solo AVANZA la fecha, nunca la retrocede: `lastWorkedAt` significa
    // "la última vez que este territorio se trabajó de verdad". Cuando hay
    // dos asignaciones solapadas del mismo territorio y se cierran en orden
    // distinto al cronológico (o se cierra tarde una vieja), escribirla sin
    // comparar la hacía retroceder y el territorio parecía menos trabajado
    // de lo que estaba — con eso, "En descanso" y el S-13 mostraban datos
    // incorrectos. Ver también `recomputeLastWorkedAt`.
    if (
      assignment.status === 'trabajado' &&
      assignment.returnedAt &&
      isNewerWorkDate(assignment.returnedAt, territory.lastWorkedAt)
    ) {
      territoryUpdate.lastWorkedAt = assignment.returnedAt;
      territoryUpdate.updatedAt = assignment.updatedAt;
    }
    // La división se va con quien lo tenía.
    //
    // Las partes las hace uno para SU salida —con los nombres de los que
    // salieron aquel día, o "esta semana" y "la que viene"—, así que dejarlas
    // puestas para el siguiente sería darle un reparto ajeno que no entiende
    // y que encima parece oficial. Cada uno lo parte como quiera cuando le
    // toque; cuesta diez segundos.
    if (territory.secciones?.length) {
      territoryUpdate.secciones = [];
      territoryUpdate.updatedAt = assignment.updatedAt;
    }

    if (Object.keys(territoryUpdate).length > 0) {
      batch.update(fsDoc(territoriesCol(congId), territory.id), territoryUpdate);
    }
  }

  // Entregado el territorio, los avisos que lo reclamaban dejan de tener
  // sentido: se dan por leídos aquí y desaparecen solos de la campanita, del
  // panel de inicio y de "Mis territorios". Antes había que descartarlos a
  // mano, así que quien devolvía el territorio desde el propio aviso se
  // quedaba con el aviso puesto y parecía que no había servido de nada.
  //
  // Se marcan como leídos, NO se borran: el registro de que se avisó es lo
  // que apaga el botón "Notificar" del responsable durante unos días.
  //
  // Y no rompe la entrega si falla: es cosmético comparado con cerrar la
  // asignación, así que se pide aparte del batch y su error solo se anota.
  try {
    const avisos = await getDocs(
      query(
        noticesCol(congId),
        where('territoryId', '==', assignment.territoryId),
        where('personUid', '==', assignment.personUid)
      )
    );

    avisos.forEach((d) => {
      if ((d.data() as TerritoryNotice).leido) return;
      batch.update(d.ref, { leido: true });
    });
  } catch (err) {
    console.error('No se pudieron cerrar los avisos del territorio', err);
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
  const batch = writeBatch(firestore);
  batch.delete(fsDoc(assignmentsCol(congId), assignmentId));

  if (territory) {
    const fields: Record<string, unknown> = {};
    if (territory.openAssignmentId === assignmentId) fields.openAssignmentId = null;

    // Recalcular la fecha de último trabajo del territorio a partir de lo
    // que QUEDA. Borrar una asignación es la única forma que tiene un
    // responsable de corregir un registro equivocado, y antes el territorio
    // se quedaba con la fecha de una devolución que ya no existe: seguía
    // contando como trabajado, aparecía "En descanso" y bloqueaba el
    // reparto, sin forma de arreglarlo desde ninguna pantalla.
    //
    // Se lee del SERVIDOR (no del array en memoria) porque esa lista puede
    // venir de la caché de disco y estar desactualizada.
    const restSnap = await getDocsFromServer(
      query(assignmentsCol(congId), where('territoryId', '==', territory.id))
    );
    const worked = restSnap.docs
      .filter((d) => d.id !== assignmentId)
      .map((d) => d.data() as TerritoryAssignment)
      .filter((a) => a.returnedAt && a.status === 'trabajado')
      .sort((a, b) => (a.returnedAt! > b.returnedAt! ? -1 : 1));
    const expected = worked[0]?.returnedAt ?? null;
    if ((territory.lastWorkedAt ?? null) !== expected) fields.lastWorkedAt = expected;

    if (Object.keys(fields).length > 0) {
      fields.updatedAt = new Date().toISOString();
      batch.update(fsDoc(territoriesCol(congId), territory.id), fields);
    }
  }

  await batch.commit();
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

/**
 * Migración de un solo uso (idempotente por comparación, no por marca): antes
 * "Vence"/dueAt se calculaba con daysUntilExpiration (90 días por defecto);
 * ahora comparte el mismo umbral que "Atrasado" (daysUntilOverdue, 120 por
 * defecto) para que al pasar "Vence" la asignación quede directamente como
 * Atrasada. Las asignaciones ABIERTAS creadas antes de este cambio tienen un
 * `dueAt` calculado con la fórmula vieja — se recalcula aquí con la nueva.
 * Las CERRADAS no se tocan (su dueAt es histórico, ya no importa). Se puede
 * llamar en cada carga: en cuanto el valor coincide con la fórmula nueva deja
 * de aparecer en `stale`, así que no vuelve a escribirse.
 */
export const backfillDueAtFormula = async (
  congId: string,
  assignments: TerritoryAssignment[],
  daysUntilOverdue: number
): Promise<void> => {
  const stale = assignments.filter(
    (a) =>
      !a.returnedAt &&
      a.dueAt &&
      a.dueAt !== computeDueAt(a.assignedAt, daysUntilOverdue)
  );
  if (stale.length === 0) return;

  for (let i = 0; i < stale.length; i += 450) {
    const slice = stale.slice(i, i + 450);
    const batch = writeBatch(firestore);
    slice.forEach((a) =>
      batch.update(fsDoc(assignmentsCol(congId), a.id), {
        dueAt: computeDueAt(a.assignedAt, daysUntilOverdue),
      })
    );
    await batch.commit();
  }
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

/** Aprueba una dirección "No visitar" tocando SOLO los campos de aprobación.
 *  `saveLocation` reescribe el documento entero, incluida la dirección
 *  cifrada: si el dispositivo que aprueba no puede descifrarla, ese guardado
 *  la habría dejado mal. */
export const approveLocation = (
  congId: string,
  locationId: string,
  approvedBy: string
) =>
  updateDoc(fsDoc(locationsCol(congId), locationId), {
    aprobada: true,
    approvedBy,
    updatedAt: new Date().toISOString(),
  });

export const deleteLocation = (congId: string, locationId: string) =>
  deleteDoc(fsDoc(locationsCol(congId), locationId));

/** Crea una campaña nueva. Para modificar una que ya existe, usa las
 *  funciones de abajo: `setDoc` del documento entero pisa lo que otro
 *  responsable haya cambiado entretanto. */
export const saveCampaign = (congId: string, c: TerritoryCampaign) =>
  setDoc(fsDoc(campaignsCol(congId), c.id), c);

/**
 * Añade o quita territorios de una campaña con `arrayUnion`/`arrayRemove`,
 * que resuelve el servidor.
 *
 * Antes se leía `territoryIds`, se modificaba en memoria y se guardaba el
 * documento entero. Con el diálogo de selección abierto un par de minutos,
 * esa copia se quedaba vieja: si otro responsable añadía territorios
 * mientras tanto, al confirmar desaparecían sin ningún error. Y si la
 * campaña se había cerrado entretanto, ese mismo guardado la resucitaba
 * como 'activa' con todas sus asignaciones ya devueltas.
 */
export const addCampaignTerritories = (
  congId: string,
  campaignId: string,
  territoryIds: string[]
) =>
  updateDoc(fsDoc(campaignsCol(congId), campaignId), {
    territoryIds: arrayUnion(...territoryIds),
    updatedAt: new Date().toISOString(),
  });

export const removeCampaignTerritory = (
  congId: string,
  campaignId: string,
  territoryId: string
) =>
  updateDoc(fsDoc(campaignsCol(congId), campaignId), {
    territoryIds: arrayRemove(territoryId),
    updatedAt: new Date().toISOString(),
  });

/**
 * Pasa una campaña de 'planificada' a 'activa', pero SOLO si en el servidor
 * sigue estando 'planificada'.
 *
 * La transacción es imprescindible: los listeners de campañas y de
 * asignaciones son suscripciones independientes, así que un responsable
 * puede tener la campaña todavía como 'planificada' en memoria justo cuando
 * otro acaba de finalizarla. Sin esta comprobación, la auto-activación la
 * devolvía a 'activa' con todas sus asignaciones ya cerradas y los candados
 * liberados — un estado imposible que no se arreglaba solo.
 */
export const activateCampaignIfPlanned = (congId: string, campaignId: string) =>
  runTransaction(firestore, async (tx) => {
    const ref = fsDoc(campaignsCol(congId), campaignId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    if ((snap.data() as TerritoryCampaign).estado !== 'planificada') return;
    tx.update(ref, { estado: 'activa', updatedAt: new Date().toISOString() });
  });

/**
 * Finaliza una campaña: devuelve como "trabajado" (con la fecha de fin de la
 * campaña) todas sus asignaciones todavía abiertas, libera el candado de
 * cada territorio si lo tenía, y marca la campaña como 'pasada'.
 *
 * Centralizado aquí (antes vivía como un useCallback local dentro de
 * CampanasTab.tsx) para que tanto el botón "Finalizar" manual como el
 * auto-cierre en segundo plano (useTerritories.tsx, que corre para
 * cualquier responsable con la app abierta, no solo si tiene la pestaña
 * Campañas abierta) usen exactamente la misma lógica.
 */
export const closeCampaign = async (
  congId: string,
  campaign: TerritoryCampaign
): Promise<void> => {
  const now = new Date().toISOString();

  // Qué asignaciones cerrar se decide con datos del SERVIDOR, nunca con el
  // array que tiene la app en memoria. Firestore está configurado con caché
  // persistente (ver services/firebase/index.ts), así que al abrir la app
  // los listeners disparan primero con datos de disco que pueden llevar días
  // desactualizados. Cerrando desde esa foto vieja se reescribían entregas
  // individuales que ya se habían hecho: se perdía su fecha real y una
  // devolución "sin trabajar" pasaba a figurar como "trabajado".
  // Si no hay conexión, getDocsFromServer lanza y no se escribe nada — la
  // campaña sigue abierta y el siguiente intento la cierra bien.
  const [openSnap, terrSnap] = await Promise.all([
    getDocsFromServer(
      query(
        assignmentsCol(congId),
        where('campaignId', '==', campaign.id),
        where('returnedAt', '==', null)
      )
    ),
    getDocsFromServer(territoriesCol(congId)),
  ]);
  const open = openSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as TerritoryAssignment
  );
  const territories = terrSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Territory
  );

  // Fecha de devolución: la de fin de la campaña, PERO nunca en el futuro.
  // "Finalizar" se puede pulsar antes de tiempo (y en campañas todavía
  // planificadas), y usar `fechaFin` a secas escribía fechas futuras en
  // `returnedAt` y `lastWorkedAt`. Eso además se auto-blindaba: una
  // `lastWorkedAt` futura hace que `isNewerWorkDate` rechace la fecha real
  // de la siguiente entrega, así que el territorio se quedaba con la fecha
  // falsa hasta que el calendario la alcanzaba.
  const closedAt = campaign.fechaFin > now ? now : campaign.fechaFin;

  // Siempre `update` de solo los campos que cambian, NUNCA `set` del
  // documento entero: `set` reescribía también `notas`, que va cifrada, y si
  // esto corría antes de que la master key estuviera en memoria la nota se
  // guardaba VACÍA (pérdida silenciosa e irreversible).
  //
  // Se trocea en lotes de 450 porque Firestore no admite más de 500
  // operaciones por batch y cada asignación genera 2 escrituras. Trocear
  // rompe la atomicidad global, pero aquí es seguro y además preferible:
  // como la lista de asignaciones a cerrar se relee del servidor en cada
  // intento, un cierre interrumpido a medias se completa solo en el
  // siguiente (solo quedan abiertas las que falten). Antes, con un único
  // batch, una campaña de más de ~250 territorios fallaba entera y dejaba
  // todos los territorios bloqueados sin forma de repararlo desde la app.
  const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];

  open.forEach((a) => {
    ops.push((b) =>
      b.update(fsDoc(assignmentsCol(congId), a.id), {
        returnedAt: closedAt,
        status: 'trabajado',
        updatedAt: now,
      })
    );
    const t = territories.find((x) => x.id === a.territoryId);
    if (t) {
      // Actualización parcial (no saveTerritory completo) — así no se pisa
      // una edición concurrente de nombre/notas/geometría.
      const fields: Partial<Territory> = { updatedAt: now };
      // Igual que en finalizeAssignmentBatch: la fecha de último trabajo
      // solo avanza, para que cerrar una campaña antigua no pise una fecha
      // de trabajo más reciente.
      if (isNewerWorkDate(closedAt, t.lastWorkedAt)) {
        fields.lastWorkedAt = closedAt;
      }
      // Libera el candado si esta era la asignación de campaña que lo
      // tenía — sin esto, cerrar una campaña dejaba el territorio marcado
      // como ocupado para siempre.
      if (t.openAssignmentId === a.id) fields.openAssignmentId = null;
      ops.push((b) => b.update(fsDoc(territoriesCol(congId), t.id), fields));
    }
  });

  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(firestore);
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }

  // La campaña se marca 'pasada' AL FINAL y en su propia escritura: si algo
  // falla antes, sigue sin cerrarse y se reintenta. Al revés (marcarla
  // primero) el código dejaría de mirarla y las asignaciones que quedaran
  // abiertas no se cerrarían nunca.
  await updateDoc(fsDoc(campaignsCol(congId), campaign.id), {
    estado: 'pasada',
    updatedAt: now,
  });
};

/**
 * Borra la campaña Y todas las asignaciones que le pertenecen.
 * Las asignaciones de campaña son temporales; al borrar la campaña
 * deben desaparecer también del historial activo para no dejar huérfanos.
 */
export const deleteCampaign = async (
  congId: string,
  campaignId: string,
  /** Territorios actuales — para liberar el candado de los que estuvieran
   *  ocupados por una asignación de esta campaña. Sin esto, borrar una
   *  campaña con territorios asignados los dejaba con `openAssignmentId`
   *  apuntando a una asignación recién borrada: la lista los mostraba
   *  libres, pero asignarlos fallaba con "Este territorio ya está
   *  asignado" para siempre, sin forma de repararlo desde la app. */
  territories: Territory[] = []
): Promise<void> => {
  // 1. Obtener todas las asignaciones de esta campaña
  const q = query(
    assignmentsCol(congId),
    where('campaignId', '==', campaignId)
  );
  const snap = await getDocs(q);

  const deletedIds = new Set(snap.docs.map((d) => d.id));
  const lockedTerritories = territories.filter(
    (t) => t.openAssignmentId && deletedIds.has(t.openAssignmentId)
  );

  // 2. Borrar y liberar candados, troceando por el límite de 500 ops por
  //    batch (una campaña muy antigua puede acumular mucho historial).
  const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [
    ...snap.docs.map((d) => (b: ReturnType<typeof writeBatch>) => b.delete(d.ref)),
    ...lockedTerritories.map(
      (t) => (b: ReturnType<typeof writeBatch>) =>
        b.update(fsDoc(territoriesCol(congId), t.id), {
          openAssignmentId: null,
          updatedAt: new Date().toISOString(),
        })
    ),
    (b: ReturnType<typeof writeBatch>) =>
      b.delete(fsDoc(campaignsCol(congId), campaignId)),
  ];

  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(firestore);
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
};

export const saveRequest = (congId: string, r: TerritoryRequest) =>
  setDoc(fsDoc(requestsCol(congId), r.id), stripUndefined(r));

export const atenderRequest = (
  congId: string,
  requestId: string,
  personUid: string,
  /** Cómo se cerró. Por defecto 'asignada': es de donde más se llama. */
  como: 'asignada' | 'descartada' = 'asignada'
) =>
  updateDoc(fsDoc(requestsCol(congId), requestId), {
    atendidaPor: personUid,
    atendidaAt: new Date().toISOString(),
    atendidaComo: como,
  });

/**
 * Retira una solicitud que aún no ha atendido nadie.
 *
 * Se borra en vez de marcarse: una solicitud retirada por quien la hizo no
 * es un registro que interese guardar, y dejarla con `atendidaPor` la haría
 * indistinguible de una que un responsable sí atendió.
 */
export const deleteRequest = (congId: string, requestId: string) =>
  deleteDoc(fsDoc(requestsCol(congId), requestId));

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
