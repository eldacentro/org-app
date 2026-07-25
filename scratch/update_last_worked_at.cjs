const fs = require('fs');

const migrationDataPath = '/Users/carlossacajr./projects/org-app/src/features/territories/migrationData.json';
const migrationData = JSON.parse(fs.readFileSync(migrationDataPath, 'utf8'));

// 1. Calculate lastWorkedAt for each territory based on its assignments
for (const t of migrationData.territories) {
  let latestReturnedAt = null;
  const tAssignments = migrationData.assignments.filter(a => a.territoryId === t.id && !a.isCampaign && a.status === 'trabajado' && a.returnedAt);
  
  for (const a of tAssignments) {
    if (!latestReturnedAt || new Date(a.returnedAt) > new Date(latestReturnedAt)) {
      latestReturnedAt = a.returnedAt;
    }
  }

  if (latestReturnedAt) {
    t.lastWorkedAt = latestReturnedAt;
  }
}

fs.writeFileSync(migrationDataPath, JSON.stringify(migrationData, null, 2));
console.log('Successfully updated migrationData.json with lastWorkedAt.');
