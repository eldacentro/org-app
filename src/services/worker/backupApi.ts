import { BackupDataType } from './backupType';

/** Timeout (ms) for every backup fetch. Prevents indefinite hangs when the
 *  server stalls — without this the worker posts 'Syncing' and never resolves. */
const FETCH_TIMEOUT_MS = 60_000;

/** Returns an AbortSignal that fires after FETCH_TIMEOUT_MS. */
const fetchSignal = () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return controller.signal;
};

/**
 * Comprime un string a gzip y lo codifica en base64, para mandarlo dentro
 * del mismo cuerpo JSON de siempre (el servidor lo descomprime una vez que
 * junta todos los chunks). Devuelve null si el navegador no soporta
 * CompressionStream o si algo falla — el llamador debe mandar el string sin
 * comprimir en ese caso, nunca debe fallar la sincronización por esto.
 */
const gzipCompressToBase64 = async (text: string): Promise<string | null> => {
  if (typeof CompressionStream === 'undefined') return null;

  try {
    const inputBytes = new TextEncoder().encode(text);

    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(inputBytes);
    writer.close();

    const compressedBuffer = await new Response(cs.readable).arrayBuffer();
    const bytes = new Uint8Array(compressedBuffer);

    // Codificar a base64 en bloques — pasar un array de cientos de miles de
    // bytes de una sola vez a String.fromCharCode(...bytes) puede reventar
    // el límite de argumentos de la función en algunos motores.
    let binary = '';
    const BLOCK = 0x8000;
    for (let i = 0; i < bytes.length; i += BLOCK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + BLOCK));
    }

    return btoa(binary);
  } catch (error) {
    console.error('[backup] gzip compression failed, sending uncompressed:', error);
    return null;
  }
};

/** Núm. de chunks que se mandan en paralelo a la vez — sin límite, mandar
 *  decenas de peticiones simultáneas en una conexión móvil lenta puede ser
 *  contraproducente; con este tope siguen yendo en paralelo, pero sin saturar. */
const CHUNK_CONCURRENCY = 6;

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);

  return results;
};

export const apiGetCongregationBackup = async ({
  apiHost,
  userID,
  idToken,
  metadata,
}: {
  apiHost: string;
  userID: string;
  idToken: string;
  metadata: string;
}) => {
  const start = performance.now();

  const res = await fetch(`${apiHost}api/v3/users/${userID}/backup`, {
    method: 'GET',
    credentials: 'include',
    signal: fetchSignal(),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${idToken}`,
      appclient: 'organized',
      appversion: '3.37.1',
      metadata,
    },
  });

  // Leer como texto primero (no res.json()) para poder loguear el tamaño
  // real recibido sin tener que volver a serializar el objeto ya parseado
  // — JSON.parse(text) cuesta lo mismo que res.json() hace internamente,
  // así que esto no añade trabajo extra, solo reordena el mismo trabajo.
  const text = await res.text();
  console.log(
    `[backup] GET en ${Math.round(performance.now() - start)}ms — ${text.length} bytes recibidos (descomprimido)`
  );

  const data = JSON.parse(text);

  if (res.status !== 200) {
    throw new Error(data.message);
  }

  return data as BackupDataType;
};

export const apiSendCongregationBackup = async ({
  apiHost,
  userID,
  reqPayload,
  idToken,
  metadata,
}: {
  apiHost: string;
  userID: string;
  reqPayload: object;
  idToken: string;
  metadata: Record<string, string>;
}) => {
  const data = await apiSendCongregationBackupChunk({
    apiHost,
    userID,
    reqPayload,
    idToken,
    metadata,
  });

  return data;
};

export const apiGetPocketBackup = async ({
  apiHost,
  metadata,
}: {
  apiHost: string;
  metadata: string;
}) => {
  const res = await fetch(`${apiHost}api/v3/pockets/backup`, {
    method: 'GET',
    credentials: 'include',
    signal: fetchSignal(),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      appclient: 'organized',
      appversion: '3.37.1',
      metadata,
    },
  });

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data.message);
  }

  return data as BackupDataType;
};

export const apiSendPocketBackup = async ({
  apiHost,
  reqPayload,
  metadata,
}) => {
  const res = await fetch(`${apiHost}api/v3/pockets/backup`, {
    method: 'POST',
    credentials: 'include',
    signal: fetchSignal(),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      appclient: 'organized',
      appversion: '3.37.1',
      metadata,
    },
    body: JSON.stringify({ cong_backup: reqPayload }),
  });

  const data = await res.json();

  return data;
};

export const apiSendCongregationBackupChunk = async ({
  apiHost,
  userID,
  reqPayload,
  idToken,
  metadata,
}: {
  apiHost: string;
  userID: string;
  reqPayload: object;
  idToken: string;
  metadata: Record<string, string>;
}) => {
  // Comprimido y en base64, 1MB de string representa MUCHO más JSON
  // original que antes (un payload típico, repetitivo, comprime 70-90%) —
  // así que este tamaño sigue siendo seguro para el límite del servidor
  // (10MB) incluso cuando no hay compresión disponible y se manda en plano.
  const CHUNK_SIZE = 1024 * 1024;

  const jsonStr = JSON.stringify(reqPayload);

  // Para payloads chiquitos, la cabecera fija de gzip + la sobrecarga de
  // base64 (~33%) puede pesar MÁS que el original (confirmado con una
  // prueba: "hello world" comprimido pesaba un 150% más). Por eso siempre
  // se compara contra el tamaño sin comprimir y solo se usa si de verdad
  // gana — nunca se manda más de lo que se mandaría sin este cambio.
  const compressStart = performance.now();
  const compressedAttempt = await gzipCompressToBase64(jsonStr);
  const compressed = compressedAttempt !== null && compressedAttempt.length < jsonStr.length;
  const dataToSend = compressed ? compressedAttempt : jsonStr;

  const totalChunks = Math.ceil(dataToSend.length / CHUNK_SIZE);
  const uploadId = crypto.randomUUID();

  const ratio = compressed ? Math.round((1 - dataToSend.length / jsonStr.length) * 100) : 0;
  console.log(
    `[backup] upload: ${jsonStr.length} bytes original → ${dataToSend.length} bytes a mandar ` +
      `(${compressed ? `comprimido ${ratio}%, ${Math.round(performance.now() - compressStart)}ms` : 'sin comprimir'}), ` +
      `${totalChunks} chunk(s) en paralelo (máx ${CHUNK_CONCURRENCY} a la vez)`
  );

  const uploadStart = performance.now();

  const chunkIndexes = Array.from({ length: totalChunks }, (_, i) => i);

  // Los chunks no dependen de orden de llegada (el servidor los guarda por
  // posición), así que se mandan en paralelo en vez de uno a uno — eso es
  // lo que realmente se sentía lento en conexiones con más de un chunk.
  // Si CUALQUIER chunk topa con un 409, se deja de pedir trabajo nuevo
  // (los que ya estaban en vuelo no se cancelan, pero son inofensivos: el
  // servidor solo los guarda, nunca llega a procesarlos porque el conteo
  // de chunks recibidos nunca completa).
  //
  // Importante: como van en paralelo, el chunk que el SERVIDOR procesa
  // último (el que dispara 'BACKUP_SENT') no es necesariamente el último en
  // resolver en el cliente — así que se busca explícitamente esa respuesta
  // en vez de simplemente quedarse con "la que resolvió más tarde".
  let conflict = false;
  let sentMessage: string | null = null;
  let lastMessage = '';

  await mapWithConcurrency(chunkIndexes, CHUNK_CONCURRENCY, async (i) => {
    if (conflict || sentMessage) return;

    const chunkData = dataToSend.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

    const res = await fetch(`${apiHost}api/v3/users/${userID}/backup/chunked`, {
      method: 'POST',
      credentials: 'include',
      signal: fetchSignal(),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${idToken}`,
        appclient: 'organized',
        appversion: '3.37.1',
        metadata: JSON.stringify(metadata),
      },
      body: JSON.stringify({ uploadId, chunkIndex: i, totalChunks, chunkData, compressed }),
    });

    if (res.status === 409) {
      conflict = true;
      return;
    }

    const resData = await res.json();

    if (!res.ok) {
      throw new Error(resData.message);
    }

    if (resData.message === 'BACKUP_SENT') {
      sentMessage = resData.message;
    }

    lastMessage = resData.message;
  });

  console.log(`[backup] upload terminado en ${Math.round(performance.now() - uploadStart)}ms`);

  if (conflict) {
    return { message: 'error_api_sync-conflict' };
  }

  return { message: sentMessage ?? lastMessage };
};
