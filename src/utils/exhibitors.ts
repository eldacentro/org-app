import { ExhibitorSettingsType, ExhibitorTurnType, ExhibitorWeekType } from '../definition/exhibitors';
import { addDays, addWeeks, formatDate, getWeekDate } from './date';
import { isExhibitorMonthPublished } from '@services/app/exhibitors_publish';

/**
 * Gets the effective turns for a given month.
 * If the month has an override, it returns the override's turns (or an empty array if the month is cancelled).
 * Otherwise, it falls back to the global turns.
 * 
 * @param settings The global Exhibitor settings
 * @param monthStr The month in "YYYY/MM" format
 * @returns Array of ExhibitorTurnType
 */
/**
 * Deja los ajustes con la FORMA correcta, venga como venga.
 *
 * `locations` y `monthlyOverrides` no estaban en el mapa de cifrado, así que
 * viajaban en claro. Al añadirlos, un dispositivo que todavía tenga la versión
 * anterior no sabe descifrarlos y se queda con la cadena cifrada tal cual: una
 * lista de ubicaciones pasaría a ser un texto, y `.map` sobre un texto rompe la
 * página. Aquí se normaliza una sola vez, al leer, en lugar de repartir
 * `Array.isArray` por media aplicación.
 *
 * No es solo para la transición: cualquier dato que llegue con una forma que no
 * toca —de una importación antigua, de un fallo de fusión— se queda en el valor
 * vacío en vez de reventar la pantalla.
 */
export const normalizeExhibitorSettings = <T extends ExhibitorSettingsType>(
  settings: T
): T => {
  if (!settings) return settings;

  const isPlainObject = (value: unknown) =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  if (!Array.isArray(settings.turns)) settings.turns = [];
  if (!Array.isArray(settings.locations)) settings.locations = [];
  if (!Array.isArray(settings.responsibles)) settings.responsibles = [];
  if (!Array.isArray(settings.fixedAssignments)) settings.fixedAssignments = [];
  if (!Array.isArray(settings.publishedMonths)) settings.publishedMonths = [];

  if (!isPlainObject(settings.availability)) settings.availability = {};

  if (
    settings.monthlyOverrides !== undefined &&
    !isPlainObject(settings.monthlyOverrides)
  ) {
    settings.monthlyOverrides = {};
  }

  return settings;
};

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

/**
 * Texto personalizado opcional que el responsable puede agregar al
 * suspender los turnos de un mes completo (ej. para explicar el motivo).
 * Sale debajo del aviso de suspensión en "Programas semanales".
 */
export const getMonthCancelledMessage = (
  settings: ExhibitorSettingsType | null,
  monthStr: string
): string => {
  if (!settings || !settings.monthlyOverrides || !settings.monthlyOverrides[monthStr]) {
    return '';
  }

  const override = settings.monthlyOverrides[monthStr];
  if ('isCancelledMonth' in override && override.isCancelledMonth) {
    return override.cancelledMessage ?? '';
  }

  return '';
};

export type MyExhibitorTurn = {
  date: string; // "YYYY/MM/DD"
  weekOf: string;
  turnId: string;
  startTime: string;
  endTime: string;
  location: string;
  isResponsible: boolean;
  companions: string[]; // person_uids de los demás en el mismo turno
};

/**
 * Genera los turnos de exhibidores de una persona entre dos fechas,
 * incluyendo los cubiertos por una asignación FIJA/recurrente
 * (settings.fixedAssignments) — esos nunca se guardan como override de una
 * semana concreta hasta que alguien la edita a mano, así que no basta con
 * recorrer los registros guardados en `exhibitors` (eso es justo lo que
 * generaba el desfase entre lo que mostraba el programa semanal y lo que
 * mostraban "Mis asignaciones" y el contador del panel).
 *
 * Se usa tanto desde "Mis asignaciones" como desde el contador del
 * dashboard, para que ambos cuenten exactamente lo mismo.
 */
export const getMyExhibitorTurns = (
  exhibitors: ExhibitorWeekType[],
  settings: ExhibitorSettingsType | null,
  uid: string,
  fromDate: Date,
  fromDateStr: string,
  toDateStr: string
): MyExhibitorTurn[] => {
  const results: MyExhibitorTurn[] = [];
  if (!settings || !uid) return results;

  const weekdaysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  let weekMonday = getWeekDate(new Date(fromDate));

  while (formatDate(weekMonday, 'yyyy/MM/dd') <= toDateStr) {
    const weekOf = formatDate(weekMonday, 'yyyy/MM/dd');

    {
      const weekRecord = exhibitors.find((w) => w?.weekOf === weekOf);

      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(weekMonday, i);
        const dateStr = formatDate(currentDate, 'yyyy/MM/dd');

        // El mes es el de CADA DÍA, no el del lunes. Una semana puede empezar
        // en un mes y acabar en otro (31 de agosto a 6 de septiembre), y
        // decidir por el lunes se lleva por delante los tres estados que
        // dependen del mes: si está suspendido, qué turnos rigen y si está
        // publicado. Con el lunes mandando, los turnos del 1 y 2 de agosto
        // salían aunque agosto esté suspendido, y los del 1 al 6 de
        // septiembre se colarían aunque septiembre siga en borrador.
        // `ExhibitorsMeeting` ya lo hacía así; esto se había quedado atrás.
        const monthStr = dateStr.substring(0, 7);

        if (isMonthCancelled(settings, monthStr)) continue;
        if (!isExhibitorMonthPublished(settings, monthStr)) continue;

        const effectiveTurns = getEffectiveTurnsForMonth(settings, monthStr);

        if (dateStr >= fromDateStr && dateStr <= toDateStr) {
          const dayLabel = weekdaysOrder[i];
          const dayTurns = effectiveTurns.filter((t) => t.days.includes(dayLabel));

          for (const turn of dayTurns) {
            const savedTurn = weekRecord?.turns?.find(
              (t) => t.turnId === turn.id && t.date === dateStr
            );

            if (savedTurn?.cancelled) continue;

            const finalAssignments =
              savedTurn?.assignments ||
              (settings.fixedAssignments || [])
                .filter((f) => f.turnId === turn.id && (!f.day || f.day === dayLabel))
                .map((f) => ({ person: f.personUid, isResponsible: f.isResponsible }));

            const myAss = finalAssignments.find((a) => a.person === uid);
            if (myAss) {
              const companions = finalAssignments
                .filter((a) => a.person && a.person !== uid)
                .map((a) => a.person);

              results.push({
                date: dateStr,
                weekOf,
                turnId: turn.id,
                startTime: turn.startTime,
                endTime: turn.endTime,
                location: savedTurn?.location || turn.defaultLocation || 'Exhibidor',
                isResponsible: myAss.isResponsible,
                companions,
              });
            }
          }
        }
      }
    }

    weekMonday = addWeeks(weekMonday, 1);
  }

  return results;
};
