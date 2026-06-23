const fs = require('fs');
const path = require('path');

const kmlDir = '/Users/carlossacajr./Documents/3. JW/3. Territorios/Cambios/Importación a app nueva/KML';
const migrationDataPath = '/Users/carlossacajr./projects/org-app/src/features/territories/migrationData.json';

const migrationData = JSON.parse(fs.readFileSync(migrationDataPath, 'utf8'));
let updatedCount = 0;

const kmlFiles = fs.readdirSync(kmlDir).filter(f => f.endsWith('.kml'));

for (const kmlFile of kmlFiles) {
  const content = fs.readFileSync(path.join(kmlDir, kmlFile), 'utf8');
  
  // Extraer todos los Placemarks
  const placemarks = content.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  
  for (const pm of placemarks) {
    const numMatch = pm.match(/<territoryNumber>([^<]*)<\/territoryNumber>/);
    const typeMatch = pm.match(/<territoryType>([^<]*)<\/territoryType>/);
    const coordsMatch = pm.match(/<coordinates>([^<]*)<\/coordinates>/);
    
    if (numMatch && typeMatch && coordsMatch) {
      const num = numMatch[1].trim();
      const type = typeMatch[1].trim();
      const coordsStr = coordsMatch[1].trim();
      
      const zone = migrationData.zones.find(z => z.nombre === type);
      if (!zone) {
        console.warn(`No se encontró zona: ${type}`);
        continue;
      }

      const territory = migrationData.territories.find(t => String(t.numero) === num && t.zoneId === zone.id);
      if (territory) {
        // Parse coordinates: -0.7816,38.4586,100 ...
        const points = coordsStr.split(/\s+/).map(pt => {
          const parts = pt.split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1])]; // lng, lat
        }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
        
        territory.geometry = {
          type: 'Polygon',
          coordinates: [points]
        };
        updatedCount++;
      } else {
        console.warn(`No se encontró territorio en migrationData: ${type} ${num}`);
      }
    }
  }
}

fs.writeFileSync(migrationDataPath, JSON.stringify(migrationData, null, 2));
console.log(`Geometrías actualizadas: ${updatedCount}`);
