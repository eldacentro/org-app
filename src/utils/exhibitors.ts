import { ExhibitorSettingsType, ExhibitorTurnType } from '../definition/exhibitors';

/**
 * Gets the effective turns for a given month.
 * If the month has an override, it returns the override's turns (or an empty array if the month is cancelled).
 * Otherwise, it falls back to the global turns.
 * 
 * @param settings The global Exhibitor settings
 * @param monthStr The month in "YYYY/MM" format
 * @returns Array of ExhibitorTurnType
 */
export const getEffectiveTurnsForMonth = (
  settings: ExhibitorSettingsType | null,
  monthStr: string
): ExhibitorTurnType[] => {
  if (!settings) return [];
  
  if (settings.monthlyOverrides && settings.monthlyOverrides[monthStr]) {
    const override = settings.monthlyOverrides[monthStr];
    if ('isCancelledMonth' in override && override.isCancelledMonth) {
      return [];
    }
    return override as ExhibitorTurnType[];
  }
  
  return settings.turns || [];
};

/**
 * Checks if a specific month is explicitly cancelled in the overrides.
 * 
 * @param settings The global Exhibitor settings
 * @param monthStr The month in "YYYY/MM" format
 * @returns boolean
 */
export const isMonthCancelled = (
  settings: ExhibitorSettingsType | null,
  monthStr: string
): boolean => {
  if (!settings || !settings.monthlyOverrides || !settings.monthlyOverrides[monthStr]) {
    return false;
  }
  
  const override = settings.monthlyOverrides[monthStr];
  return 'isCancelledMonth' in override && override.isCancelledMonth === true;
};
