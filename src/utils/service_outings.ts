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

type CancelOverride = { isCancelledMonth: boolean; keepActiveSlots?: string[] };

/**
 * Devuelve el override de suspensión del mes si está activo, o null. Uso
 * interno para no repetir la comprobación 'isCancelledMonth' in override.
 */
const getMonthCancelOverride = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string
): CancelOverride | null => {
  const override = settings?.monthlyOverrides?.[monthStr];
  if (override && 'isCancelledMonth' in override && override.isCancelledMonth) {
    return override as CancelOverride;
  }
  return null;
};

/**
 * ¿El mes está marcado como suspendido? (con o sin excepciones). Se conserva
 * para el estado de la UI ("este mes está suspendido") y la compatibilidad con
 * quien ya lo usaba. Para saber si NO queda ninguna salida, usar
 * isOutingsMonthFullyCancelled; para un turno concreto, isOutingSlotSuppressedByMonth.
 *
 * @param settings The global Service Outings settings
 * @param monthStr The month in "YYYY/MM" format
 */
export const isOutingsMonthCancelled = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string
): boolean => {
  return getMonthCancelOverride(settings, monthStr) !== null;
};

/**
 * ¿El mes está suspendido SIN ninguna salida mantenida activa? Es la
 * suspensión total (no hay absolutamente nada que planificar/exportar ese mes).
 */
export const isOutingsMonthFullyCancelled = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string
): boolean => {
  const cancel = getMonthCancelOverride(settings, monthStr);
  return cancel !== null && (cancel.keepActiveSlots?.length ?? 0) === 0;
};

/**
 * ¿Este turno concreto queda suprimido por la suspensión del mes? Un mes
 * suspendido suprime TODOS los turnos salvo los mantenidos activos en
 * keepActiveSlots (por clave exacta de turno, ej. "saturday_morning", o por día
 * completo, ej. "saturday"). Es el único punto que decide la excepción, y lo
 * consultan por igual el planificador, "Programas semanales", el PDF y el
 * autorrelleno, así que las cuatro vistas quedan siempre coherentes.
 *
 * @param slotType clave del turno, ej. "saturday_morning"
 */
export const isOutingSlotSuppressedByMonth = (
  settings: ServiceOutingSettingsType | null,
  monthStr: string,
  slotType: string
): boolean => {
  const cancel = getMonthCancelOverride(settings, monthStr);
  if (!cancel) return false;

  const kept = cancel.keepActiveSlots ?? [];
  if (kept.length === 0) return true; // suspensión total

  const dayLabel = slotType.split('_')[0]; // "saturday_morning" -> "saturday"
  return !(kept.includes(slotType) || kept.includes(dayLabel));
};
