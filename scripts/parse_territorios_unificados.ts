/**
 * Unificación 2026 — genera migrationDataUnificado.json a partir de los CSV
 * unificados (carpeta "Territorios Unificados 2026") para reemplazar SOLO la
 * zona "Elda - Urbano" (120 → 97 territorios renumerados).
 *
 * Diferencias con parse_territories_csv.ts (importación original):
 *  - Solo territorios de Elda - Urbano (Rural y Salinas no se tocan).
 *  - No crea zonas ni campañas nuevas a ciegas: el runner en la app reutiliza
 *    la zona "Elda - Urbano" y la campaña de la Conmemoración existentes, y
 *    crea la de la Asamblea Regional si no existe.
 *  - Dos campañas: Conmemoración 2026 (solo urbano; el resto de zonas ya está
 *    en la app) y Asamblea Regional 2026 (urbano unificado + Rural/Salinas del
 *    CSV original, enlazadas por zona+número a territorios existentes).
 *
 * Uso:  npx tsx scripts/parse_territorios_unificados.ts
 */
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

const DIR = '/Users/carlossacajr./Downloads/Territorios Unificados 2026';
const csvTerritories = `${DIR}/Elda - Centro - Territorio (Unificado).csv`;
const csvAssignments = `${DIR}/Elda - Centro - Territorios asignados (Unificado).csv`;
const csvConmemoracion = `${DIR}/Campaña - Conmemoración 2026 (Unificado).csv`;
const csvAsambleaUnificado = `${DIR}/Campaña - Asamblea Regional 2026 (Unificado).csv`;
const csvAsambleaOriginal =
  '/Users/carlossacajr./Downloads/Campaña - Asamblea Regional 2026.csv';
const outputJson = 'src/features/territories/migrationDataUnificado.json';

const ZONA_URBANO = 'Elda - Urbano';

type RawTerritory = {
  'Zona o Tipo de Territorio': string;
  Número: string;
  Límite: string;
  Notas: string;
};

type RawAssignment = {
  'Zona o Tipo de Territorio': string;
  'Número de Territorio': string;
  Nombre: string;
  'Correo electrónico': string;
  Asignado: string;
  Devuelto: string;
  'No Trabajado': string;
  Notas: string;
};

type RawCampaign = {
  'Zona o Tipo de Territorio': string;
  'Número de Territorio': string;
  Nombre: string;
  'Correo electrónico': string;
  Asignado: string;
  Terminado: string;
  Notas: string;
};

function readCSV<T>(path: string): T[] {
  const content = fs.readFileSync(path, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, bom: true });
}

const generateId = () => crypto.randomBytes(16).toString('hex');

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`;
}

const territoriesCSV = readCSV<RawTerritory>(csvTerritories);
const assignmentsCSV = readCSV<RawAssignment>(csvAssignments);
const conmemoracionCSV = readCSV<RawCampaign>(csvConmemoracion);
const asambleaUnificadoCSV = readCSV<RawCampaign>(csvAsambleaUnificado);
const asambleaOriginalCSV = readCSV<RawCampaign>(csvAsambleaOriginal);

// 1. Territorios urbanos nuevos (97)
const territories = territoriesCSV
  .filter((t) => t['Zona o Tipo de Territorio'].trim() === ZONA_URBANO)
  .map((t) => {
    let geometry: unknown = null;
    if (t['Límite']) {
      const coords = JSON.parse(t['Límite']);
      if (Array.isArray(coords) && coords.length > 0) {
        geometry = { type: 'Polygon', coordinates: [coords] };
      }
    }
    return {
      id: generateId(),
      numero: String(t['Número']).trim(),
      geometry,
      tags: [],
      updatedAt: new Date().toISOString(),
    };
  });
if (territories.length !== 97) {
  throw new Error(`Se esperaban 97 territorios urbanos, hay ${territories.length}`);
}
const byNumero = new Map(territories.map((t) => [t.numero, t]));

type OutAssignment = {
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

const assignments: OutAssignment[] = [];

// 2. Historial regular (solo urbano, ya renumerado y depurado)
for (const row of assignmentsCSV) {
  if (row['Zona o Tipo de Territorio'].trim() !== ZONA_URBANO) {
    throw new Error(`Fila no urbana en historial unificado: ${JSON.stringify(row)}`);
  }
  if (!row['Correo electrónico'] && !row['Nombre']) continue;
  const territory = byNumero.get(String(row['Número de Territorio']).trim());
  if (!territory) throw new Error(`Territorio ${row['Número de Territorio']} no existe`);
  const returnedAt = parseDate(row['Devuelto']);
  const noTrabajado = ['sí', 'si'].includes((row['No Trabajado'] || '').toLowerCase());
  assignments.push({
    id: generateId(),
    territoryId: territory.id,
    tempEmail: row['Correo electrónico']?.trim().toLowerCase() || undefined,
    tempName: row['Nombre']?.trim() || undefined,
    assignedAt: parseDate(row['Asignado'])!,
    returnedAt,
    status: returnedAt ? (noTrabajado ? 'no_trabajado' : 'trabajado') : 'asignado',
    isCampaign: false,
    updatedAt: new Date().toISOString(),
  });
}

// 3. Campañas
function pushCampaignRow(row: RawCampaign, ref: 'CONMEMORACION' | 'ASAMBLEA', urbano: boolean) {
  if (!row['Correo electrónico'] && !row['Nombre']) return;
  const numero = String(row['Número de Territorio']).trim();
  const zoneName = row['Zona o Tipo de Territorio'].trim();
  const returnedAt = parseDate(row['Terminado']);
  const base: OutAssignment = {
    id: generateId(),
    tempEmail: row['Correo electrónico']?.trim().toLowerCase() || undefined,
    tempName: row['Nombre']?.trim() || undefined,
    assignedAt: parseDate(row['Asignado'])!,
    returnedAt,
    status: returnedAt ? 'trabajado' : 'asignado',
    isCampaign: true,
    campaignRef: ref,
    updatedAt: new Date().toISOString(),
  };
  if (urbano) {
    const territory = byNumero.get(numero);
    if (!territory) throw new Error(`Territorio urbano ${numero} no existe (campaña)`);
    base.territoryId = territory.id;
  } else {
    base.territoryRef = { zoneName, numero };
  }
  assignments.push(base);
}

// Conmemoración: SOLO urbano (Rural/Salinas ya están en la app desde la
// importación original y no se borran)
for (const row of conmemoracionCSV) {
  if (row['Zona o Tipo de Territorio'].trim() !== ZONA_URBANO) {
    throw new Error('Fila no urbana en Conmemoración unificada');
  }
  pushCampaignRow(row, 'CONMEMORACION', true);
}

// Asamblea Regional: urbano (unificado) + Rural/Salinas (CSV original,
// enlazadas por zona+número a los territorios ya existentes en la app)
for (const row of asambleaUnificadoCSV) {
  if (row['Zona o Tipo de Territorio'].trim() !== ZONA_URBANO) {
    throw new Error('Fila no urbana en Asamblea unificada');
  }
  pushCampaignRow(row, 'ASAMBLEA', true);
}
for (const row of asambleaOriginalCSV) {
  const zone = row['Zona o Tipo de Territorio'].trim();
  if (zone === ZONA_URBANO) continue; // las urbanas van por el CSV unificado
  pushCampaignRow(row, 'ASAMBLEA', false);
}

const output = {
  zoneName: ZONA_URBANO,
  campaigns: {
    CONMEMORACION: { nombre: 'Campaña Conmemoración 2026' },
    ASAMBLEA: { nombre: 'Campaña Asamblea Regional 2026' },
  },
  territories,
  assignments,
};

fs.writeFileSync(outputJson, JSON.stringify(output, null, 2));

const regular = assignments.filter((a) => !a.isCampaign);
const abiertas = regular.filter((a) => !a.returnedAt);
console.log(`Territorios urbanos nuevos: ${territories.length}`);
console.log(`Asignaciones regulares: ${regular.length} (abiertas: ${abiertas.length})`);
console.log(
  `Campaña Conmemoración (urbano): ${assignments.filter((a) => a.campaignRef === 'CONMEMORACION').length}`
);
console.log(
  `Campaña Asamblea (urbano+resto): ${assignments.filter((a) => a.campaignRef === 'ASAMBLEA').length}`
);
console.log(`Escrito ${outputJson}`);
