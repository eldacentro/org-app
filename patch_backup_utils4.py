import re

with open('src/services/worker/backupUtils.ts', 'r') as f:
    content = f.read()

content = content.replace(
"""    upcoming_events,
    limpieza_config,
    evacuacion_config,
  } = await dbGetTableData();""",
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
  } = await dbGetTableData();"""
)

with open('src/services/worker/backupUtils.ts', 'w') as f:
    f.write(content)

