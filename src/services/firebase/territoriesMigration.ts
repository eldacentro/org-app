import { doc, writeBatch } from 'firebase/firestore';
import { firestore as db } from './index';
import { PersonType } from '@definition/persons';

export const runMigrationDB = async (migrationData: Record<string, unknown>, persons: PersonType[], congId: string) => {
  if (!congId) throw new Error("No hay congregación activa");

  const stripUndefined = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

  const serializeGeometry = (g: unknown) => (g ? JSON.stringify(g) : null);

  // Create lookup dictionary for persons by email
  const emailToUid = new Map<string, string>();
  const nameToUid = new Map<string, string>();

  persons.forEach(p => {
    const email = p.person_data?.email?.value;
    const name = p.person_data?.person_display_name?.value;
    const uid = p.person_uid;

    if (email) emailToUid.set(email.toLowerCase().trim(), uid);
    if (name) nameToUid.set(name.toLowerCase().trim(), uid);
  });

  const getPersonUid = (email?: string, name?: string) => {
    if (email && emailToUid.has(email.toLowerCase().trim())) return emailToUid.get(email.toLowerCase().trim())!;
    if (name && nameToUid.has(name.toLowerCase().trim())) return nameToUid.get(name.toLowerCase().trim())!;
    return 'UNKNOWN_USER'; // O podemos saltarlos si no cuadran
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
      notas: a.notas || '',
      updatedAt: a.updatedAt,
      assignedBy: 'MIGRATION_SCRIPT'
    });

    await addOp('territory_assignments', a.id, assignmentData);
  }

  await commitBatch();
  await Promise.all(batches);
};
