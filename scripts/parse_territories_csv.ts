import fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

const csvTerritories = '/Users/carlossacajr./Downloads/Elda - Centro - Territorio.csv';
const csvAssignments = '/Users/carlossacajr./Downloads/Elda - Centro - Territorios asignados.csv';
const csvCampaign = '/Users/carlossacajr./Downloads/Campaña - Conmemoración 2026.csv';
const outputJson = 'src/features/territories/migrationData.json';

type RawTerritory = {
  TerritoryId: string;
  'Zona o Tipo de Territorio': string;
  'Número': string;
  'Límite': string;
  'Notas': string;
};

type RawAssignment = {
  'Zona o Tipo de Territorio': string;
  'Número de Territorio': string;
  'Nombre': string;
  'Correo electrónico': string;
  'Asignado': string;
  'Devuelto': string;
  'No Trabajado': string;
  'Notas': string;
};

type RawCampaign = {
  'Zona o Tipo de Territorio': string;
  'Número de Territorio': string;
  'Nombre': string;
  'Correo electrónico': string;
  'Asignado': string;
  'Terminado': string;
  'Notas': string;
};

function readCSV<T>(path: string): T[] {
  if (!fs.existsSync(path)) return [];
  const content = fs.readFileSync(path, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Convert DD-MM-YYYY to ISO String
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  // DD-MM-YYYY -> YYYY-MM-DD
  const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`;
  return isoDate;
}

const territoriesCSV = readCSV<RawTerritory>(csvTerritories);
const assignmentsCSV = readCSV<RawAssignment>(csvAssignments);
const campaignCSV = readCSV<RawCampaign>(csvCampaign);

console.log(`Loaded ${territoriesCSV.length} territories`);
console.log(`Loaded ${assignmentsCSV.length} assignments`);
console.log(`Loaded ${campaignCSV.length} campaign records`);

const zones = new Map<string, any>();
const territories: any[] = [];
const assignments: any[] = [];
let campaign: any = null;

// Colores pastel variados para las zonas
const zoneColors = ['#FAD02E', '#F28D35', '#E54B4B', '#9A4C95', '#1D3557', '#457B9D', '#2A9D8F', '#E9C46A'];
let colorIdx = 0;

territoriesCSV.forEach((t) => {
  const zoneName = t['Zona o Tipo de Territorio']?.trim() || 'Desconocida';
  if (!zones.has(zoneName)) {
    zones.set(zoneName, {
      id: generateId(),
      nombre: zoneName,
      color: zoneColors[colorIdx % zoneColors.length],
      orden: zones.size,
      updatedAt: new Date().toISOString(),
    });
    colorIdx++;
  }

  const zoneId = zones.get(zoneName)!.id;

  // Transform Límite (JSON string of coordinates array) to GeoJSON Polygon
  let geometry = null;
  if (t['Límite']) {
    try {
      const coords = JSON.parse(t['Límite']);
      if (Array.isArray(coords) && coords.length > 0) {
        // En GeoJSON, un Polygon es un array de arrays de coordenadas (anillos)
        geometry = {
          type: 'Polygon',
          coordinates: [coords],
        };
      }
    } catch (e) {
      console.error(`Error parsing geometry for territory ${t['Número']}`);
    }
  }

  territories.push({
    id: generateId(),
    zoneId,
    zoneName, // temp helper
    numero: String(t['Número']).trim(),
    geometry,
    notas: t['Notas'] ? t['Notas'].trim() : '',
    tags: [],
    updatedAt: new Date().toISOString(),
  });
});

console.log(`Created ${zones.size} zones`);
console.log(`Created ${territories.length} structured territories`);

const campaignId = generateId();

// Procesar Campaña "Conmemoración 2026"
let campaignStart = new Date().toISOString();
let campaignEnd = new Date().toISOString();
const campaignTerritoryIds = new Set<string>();

const campaignAssignmentsData = campaignCSV.map(row => {
  const zoneName = row['Zona o Tipo de Territorio']?.trim();
  const num = String(row['Número de Territorio']).trim();
  
  const territory = territories.find(t => t.zoneName === zoneName && t.numero === num);
  if (territory) campaignTerritoryIds.add(territory.id);

  const start = parseDate(row['Asignado']);
  if (start && start < campaignStart) campaignStart = start;

  return {
    ...row,
    territoryId: territory ? territory.id : null,
  };
});

if (campaignCSV.length > 0) {
  campaign = {
    id: campaignId,
    nombre: 'Campaña Conmemoración 2026',
    fechaInicio: campaignStart,
    fechaFin: campaignStart, // Will just use same for now or static past date
    estado: 'pasada',
    territoryIds: Array.from(campaignTerritoryIds),
    updatedAt: new Date().toISOString(),
  };

  campaignAssignmentsData.forEach(row => {
    if (!row.territoryId) return;
    if (!row['Correo electrónico'] && !row['Nombre']) return;
    
    const assignedAt = parseDate(row['Asignado']) || new Date().toISOString();
    const returnedAt = parseDate(row['Terminado']) || null;
    let status = 'asignado';
    if (returnedAt) status = 'trabajado'; // default

    assignments.push({
      id: generateId(),
      territoryId: row.territoryId,
      tempEmail: row['Correo electrónico']?.trim().toLowerCase(),
      tempName: row['Nombre']?.trim(),
      assignedAt,
      returnedAt,
      status,
      isCampaign: true,
      campaignId: campaignId,
      notas: row['Notas'] ? row['Notas'].trim() : '',
      updatedAt: new Date().toISOString(),
    });
  });
}

// Procesar Asignaciones regulares
assignmentsCSV.forEach(row => {
  const zoneName = row['Zona o Tipo de Territorio']?.trim();
  const num = String(row['Número de Territorio']).trim();
  
  const territory = territories.find(t => t.zoneName === zoneName && t.numero === num);
  if (!territory) return;
  if (!row['Correo electrónico'] && !row['Nombre']) return;

  const assignedAt = parseDate(row['Asignado']) || new Date().toISOString();
  const returnedAt = parseDate(row['Devuelto']) || null;
  const noTrabajado = row['No Trabajado']?.toLowerCase() === 'sí' || row['No Trabajado']?.toLowerCase() === 'si';
  
  let status = 'asignado';
  if (returnedAt) {
    status = noTrabajado ? 'no_trabajado' : 'trabajado';
  }

  assignments.push({
    id: generateId(),
    territoryId: territory.id,
    tempEmail: row['Correo electrónico']?.trim().toLowerCase(),
    tempName: row['Nombre']?.trim(),
    assignedAt,
    returnedAt,
    status,
    isCampaign: false,
    notas: row['Notas'] ? row['Notas'].trim() : '',
    updatedAt: new Date().toISOString(),
  });
});

console.log(`Created ${assignments.length} assignments in total`);

const output = {
  zones: Array.from(zones.values()),
  territories: territories.map(({ zoneName, ...t }) => t), // remover zoneName temporal
  campaign,
  assignments,
};

fs.writeFileSync(outputJson, JSON.stringify(output, null, 2));
console.log(`Successfully wrote ${outputJson}`);
