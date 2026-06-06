import re

with open('src/services/worker/backupUtils.ts', 'r') as f:
    content = f.read()

# 1. dbGetTableData
content = content.replace(
"""  const limpieza_config = await appDb.limpieza_config.get('1');
  const evacuacion_config = await appDb.evacuacion_config.get('1');
  const metadata = await appDb.metadata.get(1);""",
"""  const limpieza_config = await appDb.limpieza_config.get('1');
  const evacuacion_config = await appDb.evacuacion_config.get('1');
  const metadata = await appDb.metadata.get(1);

  const territories = await appDb.territories.toArray();
  const territory_zones = await appDb.territory_zones.toArray();
  const territory_tags = await appDb.territory_tags.toArray();
  const territory_assignments = await appDb.territory_assignments.toArray();
  const territory_campaigns = await appDb.territory_campaigns.toArray();
  const territory_notices = await appDb.territory_notices.toArray();
  const territory_requests = await appDb.territory_requests.toArray();
  const territory_settings = await appDb.territory_settings.toArray();"""
)

content = content.replace(
"""    upcoming_events,
    limpieza_config,
    evacuacion_config,
  };
};""",
"""    upcoming_events,
    limpieza_config,
    evacuacion_config,
    territories,
    territory_zones,
    territory_tags,
    territory_assignments,
    territory_campaigns,
    territory_notices,
    territory_requests,
    territory_settings,
  };
};"""
)

# 2. dbExportDataBackup

injection = """

        // include territories data
        if (adminRole || elderRole || metadata.metadata.territories?.send_local) {
          const toAdd = [
            { name: 'territories', data: territories },
            { name: 'territory_zones', data: territory_zones },
            { name: 'territory_tags', data: territory_tags },
            { name: 'territory_assignments', data: territory_assignments },
            { name: 'territory_campaigns', data: territory_campaigns },
            { name: 'territory_notices', data: territory_notices },
            { name: 'territory_requests', data: territory_requests },
            { name: 'territory_settings', data: territory_settings },
          ];

          for (const item of toAdd) {
            if (item.data && item.data.length > 0) {
              const toBackup = structuredClone(item.data);
              toBackup.forEach((rec: any) => {
                encryptObject({
                  data: rec,
                  table: item.name,
                  accessCode,
                  masterKey,
                });
              });
              (obj as any)[item.name] = toBackup;
            }
          }
        }
"""

content = content.replace(
    "        // for admin role",
    injection + "        // for admin role"
)

# 3. dbRestoreFromBackup
# Let's find "evacuacion_config.clear()" or similar to know where to inject.
injection_restore = """
    // restore territories
    const territoryTables = ['territories', 'territory_zones', 'territory_tags', 'territory_assignments', 'territory_campaigns', 'territory_notices', 'territory_requests', 'territory_settings'];
    for (const table of territoryTables) {
      if ((backupData as any)[table]) {
        const remoteRecord = structuredClone((backupData as any)[table]) as any[];
        const toPut: any[] = [];
        for (const rec of remoteRecord) {
          decryptObject({ data: rec, table, accessCode, masterKey });
          toPut.push(rec);
        }
        await (appDb as any)[table].clear();
        await (appDb as any)[table].bulkPut(toPut);
      }
    }
"""

# Let's inject it right before `// update metadata` in dbRestoreFromBackup
content = content.replace(
    "    // update metadata\n    await appDb.metadata.clear();",
    injection_restore + "    // update metadata\n    await appDb.metadata.clear();"
)

with open('src/services/worker/backupUtils.ts', 'w') as f:
    f.write(content)

