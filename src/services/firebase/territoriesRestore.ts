import {
  collection,
  doc as fsDoc,
  getDocsFromServer,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './index';

/**
 * Restauración de los datos de Territorios desde una copia de seguridad.
 *
 * Vive aparte de `territories.ts` (que ya ronda las mil líneas) y aparte de
 * `backupScheduler.ts` (que solo sabe de tablas locales de Dexie): los
 * territorios están en Firestore, así que restaurarlos se propaga AL INSTANTE
 * a todos los dispositivos de la congregación. Todo lo de aquí está escrito
 * partiendo de esa premisa.
 *
 * ── Qué significa "restaurar" aquí ──────────────────────────────────────────
 *
 * NO se vacía nada. Para cada documento de la copia:
 *
 *   · si ya no existe          → se vuelve a crear   (deshace un borrado)
 *   · si existe y es distinto  → se escribe el de la copia (deshace un cambio)
 *   · si existe y es igual     → no se toca
 *
 * Y lo que existe AHORA y no estaba en la copia se queda como está: un
 * territorio nuevo, una asignación de esta semana o una campaña recién creada
 * no se pierden por restaurar.
 *
 * Se descartó la otra opción evidente —fusionar por fecha, "gana el más
 * reciente"— porque no sirve para lo único que de verdad se le pide a una
 * restauración: deshacer un estropicio. El estropicio SIEMPRE es más reciente
 * que la copia, así que ganaría siempre y restaurar no haría nada.
 *
 * ── El detalle que hace falta cuidar ────────────────────────────────────────
 *
 * Conservar las asignaciones abiertas y a la vez restaurar los territorios se
 * contradice: un territorio asignado DESPUÉS de la copia aparece en ella con
 * `openAssignmentId: null`, así que restaurarlo tal cual liberaría el candado
 * mientras su asignación sigue viva — y eso es exactamente la doble asignación
 * que el resto del módulo se esfuerza en impedir. Lo mismo con `lastWorkedAt`.
 *
 * Por eso, al terminar de escribir, se RECALCULAN esos dos campos derivados a
 * partir de las asignaciones que hayan quedado. No se copian de la copia: se
 * deducen del estado final, que es la única forma de que sean coherentes
 * vengan de donde vengan los datos.
 */

/** Colecciones que restaura, en el orden en que se escriben. Las asignaciones
 *  van DESPUÉS de los territorios para que la reconciliación final vea ya
 *  todo lo que tiene que ver. */
const COLECCIONES = [
  ['zones', 'territory_zones'],
  ['territories', 'territories'],
  ['assignments', 'territory_assignments'],
  ['locations', 'territory_locations'],
  ['campaigns', 'territory_campaigns'],
  ['requests', 'territory_requests'],
  ['notices', 'territory_notices'],
  ['tags', 'territory_tags'],
  ['settings', 'territory_settings'],
] as const;

/** Nombre visible de cada colección, para el resumen previo. */
export const NOMBRES: Record<string, string> = {
  zones: 'Zonas',
  territories: 'Territorios',
  assignments: 'Asignaciones',
  locations: 'Direcciones "No visitar"',
  campaigns: 'Campañas',
  requests: 'Solicitudes',
  notices: 'Avisos',
  tags: 'Etiquetas',
  settings: 'Ajustes',
};

export type CambioColeccion = {
  clave: string;
  nombre: string;
  crear: number;
  actualizar: number;
  iguales: number;
  /** Documentos que hay ahora y NO están en la copia: se conservan. */
  conservar: number;
};

export type ResumenRestauracion = {
  cambios: CambioColeccion[];
  totalEscrituras: number;
  /** Documentos de la copia sin `id`: no se pueden situar y se omiten. */
  sinIdentificador: number;
};

type DatosCopia = Record<string, DocumentData[]>;

const col = (congId: string, nombre: string) =>
  collection(firestore, 'congregation', congId, nombre);

/** Comparación estable de dos documentos (mismo contenido en distinto orden
 *  de claves cuenta como igual). */
const mismoContenido = (a: DocumentData, b: DocumentData): boolean => {
  const norm = (o: DocumentData) =>
    JSON.stringify(
      Object.keys(o)
        .sort()
        .map((k) => [k, o[k]])
    );
  return norm(a) === norm(b);
};

/** Lee del SERVIDOR el estado actual de una colección, indexado por id. */
const leerActual = async (congId: string, nombre: string) => {
  const snap = await getDocsFromServer(col(congId, nombre));
  const mapa = new Map<string, DocumentData>();
  snap.docs.forEach((d) => mapa.set(d.id, d.data()));
  return mapa;
};

/**
 * Qué haría la restauración, SIN escribir nada. Se enseña antes de confirmar:
 * nadie debería pulsar "restaurar" sin ver primero cuántos documentos se van a
 * crear y cuántos se van a sobrescribir.
 */
export const previsualizarRestauracion = async (
  congId: string,
  datos: DatosCopia
): Promise<ResumenRestauracion> => {
  const cambios: CambioColeccion[] = [];
  let sinIdentificador = 0;

  for (const [clave, nombreColeccion] of COLECCIONES) {
    const deCopia = datos[clave] ?? [];
    if (deCopia.length === 0 && clave !== 'settings') {
      // Sin datos en la copia no hay nada que restaurar de esta colección;
      // NO se interpreta como "bórralo todo".
      continue;
    }

    const actual = await leerActual(congId, nombreColeccion);
    let crear = 0;
    let actualizar = 0;
    let iguales = 0;
    const vistos = new Set<string>();

    for (const doc of deCopia) {
      const id = typeof doc.id === 'string' ? doc.id : null;
      if (!id) {
        sinIdentificador += 1;
        continue;
      }
      vistos.add(id);
      const existente = actual.get(id);
      if (!existente) crear += 1;
      else if (mismoContenido(existente, doc)) iguales += 1;
      else actualizar += 1;
    }

    const conservar = [...actual.keys()].filter((id) => !vistos.has(id)).length;

    if (crear || actualizar || iguales || conservar) {
      cambios.push({
        clave,
        nombre: NOMBRES[clave] ?? clave,
        crear,
        actualizar,
        iguales,
        conservar,
      });
    }
  }

  return {
    cambios,
    totalEscrituras: cambios.reduce((n, c) => n + c.crear + c.actualizar, 0),
    sinIdentificador,
  };
};

/** Firestore corta los lotes en 500 operaciones; se dejan 450 de margen. */
const TAM_LOTE = 450;

const ejecutarPorLotes = async (
  ops: Array<(b: ReturnType<typeof writeBatch>) => void>
) => {
  for (let i = 0; i < ops.length; i += TAM_LOTE) {
    const lote = writeBatch(firestore);
    ops.slice(i, i + TAM_LOTE).forEach((op) => op(lote));
    await lote.commit();
  }
};

/**
 * Recalcula los campos DERIVADOS de cada territorio a partir de las
 * asignaciones que existen de verdad tras la restauración.
 *
 * `openAssignmentId` (el candado que impide la doble asignación) y
 * `lastWorkedAt` no se pueden copiar de la copia de seguridad: describen una
 * relación entre documentos, y tras una fusión esa relación puede haber
 * cambiado. Se deducen del estado final.
 */
const reconciliarTerritorios = async (congId: string) => {
  const [territoriosSnap, asignacionesSnap] = await Promise.all([
    getDocsFromServer(col(congId, 'territories')),
    getDocsFromServer(col(congId, 'territory_assignments')),
  ]);

  const porTerritorio = new Map<string, DocumentData[]>();
  asignacionesSnap.docs.forEach((d) => {
    const a = d.data();
    const lista = porTerritorio.get(a.territoryId) ?? [];
    lista.push(a);
    porTerritorio.set(a.territoryId, lista);
  });

  const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
  let corregidos = 0;
  let dobles = 0;

  for (const d of territoriosSnap.docs) {
    const t = d.data();
    const suyas = porTerritorio.get(d.id) ?? [];

    const abiertas = suyas
      .filter((a) => !a.returnedAt)
      .sort((a, b) => (a.assignedAt > b.assignedAt ? -1 : 1));
    if (abiertas.length > 1) dobles += 1;
    const candado = abiertas[0]?.id ?? null;

    const trabajadas = suyas
      .filter((a) => a.returnedAt && a.status === 'trabajado')
      .map((a) => a.returnedAt as string)
      .sort();
    const ultimo = trabajadas.length ? trabajadas[trabajadas.length - 1] : null;

    const cambios: Record<string, unknown> = {};
    if ((t.openAssignmentId ?? null) !== candado) cambios.openAssignmentId = candado;
    if ((t.lastWorkedAt ?? null) !== ultimo) cambios.lastWorkedAt = ultimo;

    if (Object.keys(cambios).length > 0) {
      corregidos += 1;
      cambios.updatedAt = new Date().toISOString();
      const ref = fsDoc(col(congId, 'territories'), d.id);
      ops.push((b) => b.update(ref, cambios));
    }
  }

  await ejecutarPorLotes(ops);
  return { corregidos, dobles };
};

export type ResultadoRestauracion = {
  escritos: number;
  omitidos: number;
  /** Territorios cuyo candado o fecha de último trabajo hubo que recalcular. */
  reconciliados: number;
  /** Territorios que quedaron con más de una asignación abierta. */
  doblesAsignaciones: number;
};

/**
 * Restaura los datos de Territorios. Ver la cabecera del fichero para las
 * reglas; en resumen: crea lo que falta, devuelve a su sitio lo que cambió,
 * no borra nada, y al final deja los candados coherentes.
 */
export const restaurarTerritorios = async (
  congId: string,
  datos: DatosCopia
): Promise<ResultadoRestauracion> => {
  let escritos = 0;
  let omitidos = 0;

  for (const [clave, nombreColeccion] of COLECCIONES) {
    const deCopia = datos[clave] ?? [];
    if (deCopia.length === 0) continue;

    const actual = await leerActual(congId, nombreColeccion);
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];

    for (const doc of deCopia) {
      const id = typeof doc.id === 'string' ? doc.id : null;
      if (!id) {
        omitidos += 1;
        continue;
      }
      const existente = actual.get(id);
      if (existente && mismoContenido(existente, doc)) continue;
      const ref = fsDoc(col(congId, nombreColeccion), id);
      ops.push((b) => b.set(ref, doc));
      escritos += 1;
    }

    await ejecutarPorLotes(ops);
  }

  const { corregidos, dobles } = await reconciliarTerritorios(congId);

  return {
    escritos,
    omitidos,
    reconciliados: corregidos,
    doblesAsignaciones: dobles,
  };
};
