import { doc, writeBatch } from 'firebase/firestore';
import { firestore as db } from './index';
import { PersonType } from '@definition/persons';

export const runMigrationDB = async (migrationData: Record<string, unknown>, persons: PersonType[], congId: string) => {
  if (!congId) throw new Error("No hay congregación activa");

  const stripUndefined = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

  const serializeGeometry = (g: unknown) => (g ? JSON.stringify(g) : null);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, ' ');

  // Create lookup dictionary for persons by email
  const emailToUid = new Map<string, string>();
  const nameToUid = new Map<string, string>();

  persons.forEach(p => {
    const email = p.person_data?.email?.value;
    const name = p.person_data?.person_display_name?.value;
    const firstName = p.person_data?.person_firstname?.value;
    const lastName = p.person_data?.person_lastname?.value;
    const uid = p.person_uid;

    if (email) emailToUid.set(normalize(email), uid);
    if (name) nameToUid.set(normalize(name), uid);
    if (firstName && lastName) nameToUid.set(normalize(`${firstName} ${lastName}`), uid);
  });

  const missingNames = new Set<string>();

  const getPersonUid = (email?: string, name?: string) => {
    if (email && emailToUid.has(normalize(email))) return emailToUid.get(normalize(email))!;
    if (name && nameToUid.has(normalize(name))) return nameToUid.get(normalize(name))!;
    
    // Fallback: try matching just by first word or last word if it's unique? Better just log.
    if (name) missingNames.add(name);
    return 'UNKNOWN_USER'; 
  };

  const batches = [];
  let currentBatch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      batches.push(currentBatch.commit());
      currentBatch = writeBatch(db);
      opCount = 0;
    }
  };

  const addOp = async (colName: string, id: string, data: Record<string, unknown>) => {
    const ref = doc(db, `congregation/${congId}/${colName}`, id);
    currentBatch.set(ref, data);
    opCount++;
    if (opCount === 450) await commitBatch();
  };

  // 1. Zonas
  for (const z of migrationData.zones) {
    await addOp('territory_zones', z.id, stripUndefined(z));
  }

  // 2. Territorios
  for (const t of migrationData.territories) {
    const payload = stripUndefined({
      ...t,
      geometry: serializeGeometry(t.geometry),
      notas: '', // Borramos las notas internas según solicitud
    });
    await addOp('territories', t.id, payload);
  }

  // 3. Campaña
  if (migrationData.campaign) {
    await addOp('territory_campaigns', migrationData.campaign.id, stripUndefined(migrationData.campaign));
  }

  // 4. Asignaciones
  for (const a of migrationData.assignments) {
    const personUid = getPersonUid(a.tempEmail, a.tempName);
    
    // Convert status
    let status = 'asignado';
    if (a.returnedAt) {
      status = a.status === 'no_trabajado' ? 'no_trabajado' : 'trabajado';
    }

    const assignmentData = stripUndefined({
      id: a.id,
      territoryId: a.territoryId,
      personUid,
      assignedAt: a.assignedAt,
      returnedAt: a.returnedAt,
      status,
      isCampaign: a.isCampaign,
      campaignId: a.campaignId || null,
      notas: '', // Borramos las notas
      updatedAt: a.updatedAt,
      assignedBy: 'MIGRATION_SCRIPT'
    });

    await addOp('territory_assignments', a.id, assignmentData);
  }

  await commitBatch();
  await Promise.all(batches);

  if (missingNames.size > 0) {
    console.warn("No se encontraron los siguientes publicadores para enlazar:", Array.from(missingNames));
    alert("Algunos publicadores no se pudieron enlazar y saldrán con el guion (-). Revisa la consola (F12) para ver la lista de los nombres exactos que no coincidieron.");
  }
};
