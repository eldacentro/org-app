import re

with open('src/services/worker/backupUtils.ts', 'r') as f:
    content = f.read()

# The injection string
injection = """

    // restore territories
    if (backupData.territories) {
      const remoteRecord = structuredClone(backupData.territories) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territories', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territories.clear();
      await appDb.territories.bulkPut(toPut);
    }
    if (backupData.territory_zones) {
      const remoteRecord = structuredClone(backupData.territory_zones) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_zones', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_zones.clear();
      await appDb.territory_zones.bulkPut(toPut);
    }
    if (backupData.territory_tags) {
      const remoteRecord = structuredClone(backupData.territory_tags) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_tags', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_tags.clear();
      await appDb.territory_tags.bulkPut(toPut);
    }
    if (backupData.territory_assignments) {
      const remoteRecord = structuredClone(backupData.territory_assignments) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_assignments', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_assignments.clear();
      await appDb.territory_assignments.bulkPut(toPut);
    }
    if (backupData.territory_campaigns) {
      const remoteRecord = structuredClone(backupData.territory_campaigns) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_campaigns', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_campaigns.clear();
      await appDb.territory_campaigns.bulkPut(toPut);
    }
    if (backupData.territory_notices) {
      const remoteRecord = structuredClone(backupData.territory_notices) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_notices', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_notices.clear();
      await appDb.territory_notices.bulkPut(toPut);
    }
    if (backupData.territory_requests) {
      const remoteRecord = structuredClone(backupData.territory_requests) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_requests', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_requests.clear();
      await appDb.territory_requests.bulkPut(toPut);
    }
    if (backupData.territory_settings) {
      const remoteRecord = structuredClone(backupData.territory_settings) as any[];
      const toPut: any[] = [];
      for (const rec of remoteRecord) {
        decryptObject({ data: rec, table: 'territory_settings', accessCode, masterKey });
        toPut.push(rec);
      }
      await appDb.territory_settings.clear();
      await appDb.territory_settings.bulkPut(toPut);
    }
"""

content = content.replace(
    "  } catch (error) {",
    injection + "  } catch (error) {"
)

# Wait, `dbRestoreFromBackup` might have a catch block. Let's make sure it's injected before `} catch (error) {`
# Or better, inside `try {` of `dbRestoreFromBackup`
# Let's find a reliable place. Maybe right after `// update evacucion config` or `await appDb.evacuacion_config.put({ ...remoteRecord, id: '1' });`

with open('src/services/worker/backupUtils.ts', 'w') as f:
    f.write(content)
