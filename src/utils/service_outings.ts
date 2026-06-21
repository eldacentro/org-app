import { ServiceOutingSettingsType } from '../definition/service_outings';

export const DEFAULT_OUTINGS_HOURS: Record<string, string> = {
  monday_morning: '10:00',
  monday_afternoon: '17:00',
  tuesday_morning: '10:00',
  tuesday_afternoon: '17:00',
  wednesday_morning: '10:00',
  wednesday_afternoon: '17:00',
  thursday_morning: '10:00',
  thursday_afternoon: '17:00',
  friday_morning: '10:00',
  friday_afternoon: '17:30',
  saturday_morning: '09:45',
  saturday_afternoon: '17:00',
  sunday_morning: '10:30',
  sunday_afternoon: '17:00',
};

/**
 * Gets the effective default hours for a given month.
 * If the month has an override, returns the override's hours in full
 * (or the global default if the month is cancelled — the cancelled flag
 * itself is what matters then, see isOutingsMonthCancelled).
 * Otherwise falls back to the global defaultHours.
 *
 * @param settings The global Service Outings settings
 * @param monthStr The month in "YYYY/MM" format
 */
export const getEffectiveHoursForMonth = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string
): Record<string, string> => {
  const base = settings?.defaultHours || DEFAULT_OUTINGS_HOURS;

  if (!settings?.monthlyOverrides || !settings.monthlyOverrides[monthStr]) {
    return base;
  }

  const override = settings.monthlyOverrides[monthStr];

  if ('isCancelledMonth' in override && override.isCancelledMonth) {
    return base;
  }

  return override as Record<string, string>;
};

/**
 * Checks if a specific month is explicitly suspended (no outings at all)
 * in the overrides.
 *
 * @param settings The global Service Outings settings
 * @param monthStr The month in "YYYY/MM" format
 */
export const isOutingsMonthCancelled = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string
): boolean => {
  if (!settings?.monthlyOverrides || !settings.monthlyOverrides[monthStr]) {
    return false;
  }

  const override = settings.monthlyOverrides[monthStr];
  return 'isCancelledMonth' in override && override.isCancelledMonth === true;
};
