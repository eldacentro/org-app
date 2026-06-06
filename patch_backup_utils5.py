import re

with open('src/services/worker/backupUtils.ts', 'r') as f:
    content = f.read()

content = content.replace(
"""      evacuacion_config,
      sources,
      meeting_attendance,
      metadata,
      delegated_field_service_reports,
      upcoming_events,
    } = await dbGetTableData();""",
"""      evacuacion_config,
      sources,
      meeting_attendance,
      metadata,
      delegated_field_service_reports,
      upcoming_events,
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

