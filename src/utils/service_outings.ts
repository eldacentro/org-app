import {
  ServiceOutingSettingsType,
  ServiceOutingWeekType,
} from '../definition/service_outings';

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

export type DerivedOutingSlot = {
  date: string; // "YYYY/MM/DD"
  time: string;
  slotType: string; // ej. "wednesday_morning"
  person: string;
  location: string;
  cancelled: boolean;
};

/**
 * Deriva los turnos efectivos de UNA semana (lunes a domingo) a partir de la
 * configuración global + el registro de la semana, con las mismas reglas que
 * el planificador y "Programas semanales": horas por mes de CADA día,
 * inhabilitados y suspensión mensual con excepciones. Solo salen los turnos
 * que la congregación TIENE configurados — la semana del superintendente no
 * inventa turnos nuevos; lo que hace es que los turnos de miércoles a
 * domingo sin hermano asignado muestren al propio superintendente.
 * Único punto de verdad para cualquier vista que necesite "qué salidas hay
 * esta semana" sin duplicar esta lógica.
 */
export const deriveWeekOutingSlots = (
  settings: ServiceOutingSettingsType | null,
  weekRecord:
    | {
        isCircuitOverseerWeek?: boolean;
        weekOverrideHours?: Record<string, string>;
        outings?: {
          date: string;
          time: string;
          person: string;
          location: string;
          cancelled: boolean;
        }[];
      }
    | undefined,
  weekOf: string
): DerivedOutingSlot[] => {
  if (!weekOf) return [];

  const parts = weekOf.split('/');
  const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);

  const disabledSlots = settings?.disabledSlots || [];
  const defaultLocation = settings?.locations?.[0] || 'Salón del Reino';
  // filter(Boolean): un registro sincronizado desde otro dispositivo puede
  // traer huecos/nulls en el array — un elemento null aquí tumbaba el render
  // ("undefined is not an object (evaluating 'o.date')").
  const outings = (weekRecord?.outings || []).filter(Boolean);
  const overrideHours = weekRecord?.weekOverrideHours || {};

  // Semana del CO: los turnos EXISTENTES de miércoles a domingo sin hermano
  // asignado se muestran con el superintendente (él sale a predicar esos
  // días). El martes es su llegada + reunión de entre semana.
  const CO_DAYS = ['wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const isCoWeek = !!weekRecord?.isCircuitOverseerWeek;

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const slots: DerivedOutingSlot[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dayLabel = dayKeys[i];
    const dbDateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const dayMonthStr = dbDateStr.slice(0, 7);
    const defaultHours = getEffectiveHoursForMonth(settings, dayMonthStr);

    for (const turn of ['morning', 'afternoon'] as const) {
      const slotType = `${dayLabel}_${turn}`;
      const enabled =
        !disabledSlots.includes(slotType) &&
        !disabledSlots.includes(dayLabel) &&
        !isOutingSlotSuppressedByMonth(settings, dayMonthStr, slotType);

      if (!enabled) continue;

      const time =
        overrideHours[slotType] ||
        defaultHours[slotType] ||
        (turn === 'morning' ? '10:00' : '17:00');
      const assigned = outings.find((o) => o.date === dbDateStr && o.time === time);

      const coHere = isCoWeek && CO_DAYS.includes(dayLabel);

      slots.push({
        date: dbDateStr,
        time,
        slotType,
        person: assigned?.person || (coHere ? 'CIRCUIT_OVERSEER' : ''),
        location: assigned?.location || defaultLocation,
        cancelled: assigned?.cancelled || false,
      });
    }
  }

  return slots;
};

/**
 * Deja los ajustes de salidas con la FORMA correcta al leerlos.
 *
 * `publishedMonthsAt` viaja cifrado, y un dispositivo que todavía no se haya
 * actualizado no sabe descifrarlo: se queda con la cadena cifrada tal cual. Si
 * esa cadena llegara a `setMonthPublishedAt`, el `{...cadena}` la desharía en
 * un objeto de letras sueltas y eso es lo que se guardaría. Aquí se normaliza
 * una sola vez, al leer.
 *
 * Nunca a `null`: al descifrar, un campo a `null` se BORRA del registro, y el
 * mes perdería su sello sin que nadie lo haya retirado.
 *
 * Lo mismo vale ahora para `monthlyOverrides`, `disabledSlots` y
 * `sharedSlots`, que hasta ahora viajaban en claro y han pasado a cifrarse:
 * durante la ventana en que la congregación se actualiza, quien tenga la
 * versión anterior no sabe descifrarlos y se queda con la cadena cifrada.
 * `sharedSlots.map(...)` sobre un texto rompe la página entera; `disabledSlots`
 * no rompe pero contesta que sí a cualquier trozo de texto que case por
 * casualidad, y ahí se cuelan turnos inhabilitados que nadie inhabilitó.
 *
 * No es solo para la transición: cualquier dato que llegue con una forma que no
 * toca —de una importación antigua, de un fallo de fusión— se queda en el valor
 * vacío en vez de reventar la pantalla.
 *
 * `defaultHours`, `locations` y `availability` siguen con su propio arreglo en
 * `dbServiceOutingsGetSettings`: ya iban cifrados de antes, así que no tienen
 * esta transición por delante.
 */
export const normalizeServiceOutingSettings = <
  T extends ServiceOutingSettingsType,
>(
  settings: T
): T => {
  if (!settings) return settings;

  const esObjetoLlano = (valor: unknown) =>
    typeof valor === 'object' && valor !== null && !Array.isArray(valor);

  const sello = settings.publishedMonthsAt;

  if (typeof sello !== 'object' || sello === null || Array.isArray(sello)) {
    settings.publishedMonthsAt = {};
  }

  // A diferencia del sello, aquí AUSENTE es un estado con significado propio
  // ("no hay ninguna excepción de mes", "no hay ningún turno inhabilitado"), y
  // todo el módulo ya lo lee con `|| []` / `?.`. Solo se corrige lo que está
  // presente con la forma equivocada; lo que no está se deja sin estar.
  if (
    settings.monthlyOverrides !== undefined &&
    !esObjetoLlano(settings.monthlyOverrides)
  ) {
    settings.monthlyOverrides = {};
  }

  if (
    settings.disabledSlots !== undefined &&
    !Array.isArray(settings.disabledSlots)
  ) {
    settings.disabledSlots = [];
  }

  if (
    settings.sharedSlots !== undefined &&
    !Array.isArray(settings.sharedSlots)
  ) {
    settings.sharedSlots = [];
  }

  return settings;
};

/**
 * Lo mismo para un registro SEMANAL. `isCircuitOverseerWeek` y
 * `weekOverrideHours` también han pasado a cifrarse, y aquí el booleano tiene
 * un filo propio: la cadena cifrada es un valor VERDADERO, así que un registro
 * sin descifrar marcaría la semana como la del superintendente de circuito —y
 * `deriveWeekOutingSlots` pondría al superintendente en todos los turnos
 * libres de miércoles a domingo— sin que nadie lo haya marcado.
 *
 * Se BORRA en vez de ponerse a `false`: ausente es exactamente lo que el módulo
 * entero entiende por "esta semana no es la del superintendente" (`!!undefined`),
 * y el registro no se queda con un campo que nadie ha puesto. Igual con las
 * horas: `setShowAdjustHours(!!weekRecord?.weekOverrideHours)` abre el bloque de
 * horas a medida con solo que el campo exista, así que un `{}` de relleno
 * abriría un ajuste que nadie pidió.
 */
export const normalizeServiceOutingWeek = <T extends ServiceOutingWeekType>(
  week: T
): T => {
  if (!week) return week;

  if (
    week.isCircuitOverseerWeek !== undefined &&
    typeof week.isCircuitOverseerWeek !== 'boolean'
  ) {
    delete week.isCircuitOverseerWeek;
  }

  const horas = week.weekOverrideHours;

  if (
    horas !== undefined &&
    (typeof horas !== 'object' || horas === null || Array.isArray(horas))
  ) {
    delete week.weekOverrideHours;
  }

  return week;
};
