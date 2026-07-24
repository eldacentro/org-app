/**
 * Unificación de territorios Elda - Urbano 2026 (120 → 97, renumerados).
 *
 * Reemplaza SOLO la zona "Elda - Urbano" de la importación original:
 *  1. Borra los territorios urbanos existentes con TODAS sus asignaciones
 *     (regulares y de campaña) y sus archivos de Storage. Rural y Salinas no
 *     se tocan.
 *  2. Crea los 97 territorios unificados reutilizando la zona existente.
 *  3. Crea las asignaciones según migrationDataUnificado.json (historial
 *     depurado: completo en los no unificados, último registro por componente
 *     en los unificados; 19 asignaciones abiertas se conservan).
 *  4. Reutiliza la campaña "Campaña Conmemoración 2026" existente (le añade
 *     los territorios urbanos nuevos) y crea "Campaña Asamblea Regional 2026"
 *     con sus registros de todas las zonas.
 *
 * Operación de un solo uso, pensada para ejecutarse desde la consola del
 * navegador con la sesión de un responsable (ver ResponsablesPanel).
 */
import {
  collection,
  doc as fsDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './index';
import { deleteTerritoryCompleto } from './territories';
import { PersonType } from '@definition/person';

type MigrationAssignment = {
  id: string;
  territoryId?: string;
  territoryRef?: { zoneName: string; numero: string };
  tempEmail?: string;
  tempName?: string;
  assignedAt: string;
  returnedAt: string | null;
  status: string;
  isCampaign: boolean;
  campaignRef?: 'CONMEMORACION' | 'ASAMBLEA';
  updatedAt: string;
};

type MigrationData = {
  zoneName: string;
  campaigns: Record<'CONMEMORACION' | 'ASAMBLEA', { nombre: string }>;
  territories: {
    id: string;
    numero: string;
    geometry: unknown;
    tags: string[];
    updatedAt: string;
  }[];
  assignments: MigrationAssignment[];
};

const col = (congId: string, name: string) =>
  collection(firestore, 'congregation', congId, name);

const stripUndefined = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;

export const runUnificacion2026 = async (
  data: MigrationData,
  persons: PersonType[],
  congId: string
) => {
  if (!congId) throw new Error('No hay congregación activa');
  if (data.territories.length !== 97) {
    throw new Error(`migrationData corrupto: ${data.territories.length} territorios`);
  }

  const log = (msg: string) => console.log(`[unificación] ${msg}`);

  // ── Estado actual ────────────────────────────────────────────────────────
  const [zonesSnap, territoriesSnap, campaignsSnap] = await Promise.all([
    getDocs(col(congId, 'territory_zones')),
    getDocs(col(congId, 'territories')),
    getDocs(col(congId, 'territory_campaigns')),
  ]);

  const zones = zonesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as {
    id: string;
    nombre: string;
  }[];
  const urbanZone = zones.find((z) => z.nombre?.trim() === data.zoneName);
  if (!urbanZone) {
    throw new Error(`No existe la zona "${data.zoneName}" — nada que reemplazar`);
  }
  const zoneById = new Map(zones.map((z) => [z.id, z.nombre?.trim()]));

  const existing = territoriesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { zoneId?: string; numero?: string }),
  }));
  const urbanExisting = existing.filter((t) => t.zoneId === urbanZone.id);
  const otherByKey = new Map(
    existing
      .filter((t) => t.zoneId !== urbanZone.id)
      .map((t) => [`${zoneById.get(t.zoneId ?? '')}|${String(t.numero).trim()}`, t.id])
  );
  log(
    `Zona "${data.zoneName}" (${urbanZone.id}): ${urbanExisting.length} territorios a borrar; ${otherByKey.size} de otras zonas se conservan`
  );

  // ── Campañas: reutilizar/crear ───────────────────────────────────────────
  const campaigns = campaignsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { nombre?: string; territoryIds?: string[] }),
  }));
  const campaignIds: Record<string, string> = {};
  const findCampaign = (nombre: string) =>
    campaigns.find((c) => c.nombre?.trim() === nombre);

  const conmem = findCampaign(data.campaigns.CONMEMORACION.nombre);
  if (!conmem) {
    throw new Error(
      `No existe la campaña "${data.campaigns.CONMEMORACION.nombre}" de la importación original`
    );
  }
  campaignIds.CONMEMORACION = conmem.id;

  let asamblea = findCampaign(data.campaigns.ASAMBLEA.nombre);
  const asambleaId = asamblea?.id ?? crypto.randomUUID().replace(/-/g, '');
  campaignIds.ASAMBLEA = asambleaId;

  // ── Resolución de publicadores (igual que la importación original) ───────
  const normalize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  const emailToUid = new Map<string, string>();
  const nameToUid = new Map<string, string>();
  persons.forEach((p) => {
    const email = p.person_data?.email?.value;
    const name = p.person_data?.person_display_name?.value;
    const firstName = p.person_data?.person_firstname?.value;
    const lastName = p.person_data?.person_lastname?.value;
    if (email) emailToUid.set(normalize(email), p.person_uid);
    if (name) nameToUid.set(normalize(name), p.person_uid);
    if (firstName && lastName)
      nameToUid.set(normalize(`${firstName} ${lastName}`), p.person_uid);
  });
  const missingNames = new Set<string>();
  const getPersonUid = (email?: string, name?: string) => {
    if (email && emailToUid.has(normalize(email))) return emailToUid.get(normalize(email))!;
    if (name && nameToUid.has(normalize(name))) return nameToUid.get(normalize(name))!;
    if (name) missingNames.add(name);
    return 'UNKNOWN_USER';
  };

  // ── Validar refs cruzadas ANTES de borrar nada ───────────────────────────
  const newIds = new Set(data.territories.map((t) => t.id));
  for (const a of data.assignments) {
    if (a.territoryId && !newIds.has(a.territoryId)) {
      throw new Error(`Asignación ${a.id}: territoryId desconocido`);
    }
    if (a.territoryRef) {
      const key = `${a.territoryRef.zoneName}|${a.territoryRef.numero}`;
      if (!otherByKey.has(key)) {
        throw new Error(`Asignación ${a.id}: no existe territorio ${key} en la app`);
      }
    }
  }

  // ── 1. Borrar territorios urbanos viejos (con asignaciones y archivos) ──
  log('Borrando territorios urbanos antiguos…');
  let deleted = 0;
  for (const t of urbanExisting) {
    await deleteTerritoryCompleto(congId, t.id);
    deleted++;
    if (deleted % 20 === 0) log(`  …${deleted}/${urbanExisting.length}`);
  }
  log(`Borrados ${deleted} territorios urbanos con sus asignaciones`);

  // ── 2/3/4. Crear lo nuevo en lotes ───────────────────────────────────────
  const batches: Promise<void>[] = [];
  let batch = writeBatch(firestore);
  let opCount = 0;
  const commit = () => {
    if (opCount > 0) {
      batches.push(batch.commit());
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };
  const addOp = (colName: string, id: string, payload: Record<string, unknown>) => {
    batch.set(fsDoc(col(congId, colName), id), payload);
    opCount++;
    if (opCount === 450) commit();
  };

  for (const t of data.territories) {
    addOp('territories', t.id, {
      id: t.id,
      zoneId: urbanZone.id,
      numero: t.numero,
      geometry: t.geometry ? JSON.stringify(t.geometry) : null,
      notas: '',
      tags: [],
      updatedAt: t.updatedAt,
    });
  }

  const campaignTerritoryIds: Record<string, Set<string>> = {
    CONMEMORACION: new Set(conmem.territoryIds ?? []),
    ASAMBLEA: new Set(asamblea?.territoryIds ?? []),
  };
  // quitar de la Conmemoración los ids urbanos borrados
  urbanExisting.forEach((t) => campaignTerritoryIds.CONMEMORACION.delete(t.id));

  for (const a of data.assignments) {
    const territoryId =
      a.territoryId ??
      otherByKey.get(`${a.territoryRef!.zoneName}|${a.territoryRef!.numero}`)!;
    const campaignId = a.campaignRef ? campaignIds[a.campaignRef] : null;
    if (a.campaignRef) campaignTerritoryIds[a.campaignRef].add(territoryId);
    addOp(
      'territory_assignments',
      a.id,
      stripUndefined({
        id: a.id,
        territoryId,
        personUid: getPersonUid(a.tempEmail, a.tempName),
        assignedAt: a.assignedAt,
        returnedAt: a.returnedAt,
        status: a.status,
        isCampaign: a.isCampaign,
        campaignId,
        notas: '',
        updatedAt: a.updatedAt,
        assignedBy: 'UNIFICACION_2026',
      })
    );
  }

  // candado openAssignmentId para las asignaciones abiertas recién creadas
  const openByTerritory = new Map<string, string>();
  for (const a of data.assignments) {
    if (!a.returnedAt && !a.isCampaign && a.territoryId) {
      openByTerritory.set(a.territoryId, a.id);
    }
  }
  for (const [territoryId, assignmentId] of openByTerritory) {
    batch.update(fsDoc(col(congId, 'territories'), territoryId), {
      openAssignmentId: assignmentId,
    });
    opCount++;
    if (opCount === 450) commit();
  }

  // campañas: actualizar Conmemoración, crear/actualizar Asamblea
  addOp('territory_campaigns', conmem.id, {
    ...stripUndefined(conmem as unknown as Record<string, unknown>),
    territoryIds: Array.from(campaignTerritoryIds.CONMEMORACION),
    updatedAt: new Date().toISOString(),
  });
  const asambleaDates = data.assignments
    .filter((a) => a.campaignRef === 'ASAMBLEA')
    .map((a) => a.assignedAt)
    .sort();
  addOp('territory_campaigns', asambleaId, {
    id: asambleaId,
    nombre: data.campaigns.ASAMBLEA.nombre,
    fechaInicio: asamblea?.['fechaInicio'] ?? asambleaDates[0] ?? new Date().toISOString(),
    fechaFin: asamblea?.['fechaFin'] ?? asambleaDates[asambleaDates.length - 1] ?? new Date().toISOString(),
    estado: 'pasada',
    territoryIds: Array.from(campaignTerritoryIds.ASAMBLEA),
    updatedAt: new Date().toISOString(),
  });

  commit();
  await Promise.all(batches);

  log(`Creados ${data.territories.length} territorios y ${data.assignments.length} asignaciones`);
  log(`Asignaciones abiertas restauradas: ${openByTerritory.size}`);
  if (missingNames.size > 0) {
    console.warn(
      '[unificación] Publicadores no enlazados (saldrán con guion):',
      Array.from(missingNames)
    );
  }
  log('COMPLETADO. Recarga la app para ver los datos nuevos.');
  return {
    borrados: deleted,
    creados: data.territories.length,
    asignaciones: data.assignments.length,
    abiertas: openByTerritory.size,
    noEnlazados: Array.from(missingNames),
  };
};
