import {
  ServiceOutingExtraSlotType,
  ServiceOutingSettingsType,
  ServiceOutingType,
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
  // "wednesday_morning" para un turno de los de siempre;
  // "wednesday_extra_<id>" para uno añadido solo esa semana. Sigue siendo
  // único dentro del día, que es lo que necesitan las listas para su `key`.
  slotType: string;
  person: string;
  location: string;
  cancelled: boolean;
  /** El id del turno añadido; ausente en los turnos de siempre. */
  extraId?: string;
};

export const OUTING_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_VALIDA = /^\d{4}\/\d{2}\/\d{2}$/;

/**
 * Los turnos añadidos de una semana, con la forma garantizada.
 *
 * `extraSlots` viaja cifrado: un registro que todavía no se haya descifrado lo
 * trae como una cadena, y de una importación vieja puede llegar cualquier cosa.
 * Quien pinta turnos no puede reventar por eso, así que todo el que los lea
 * pasa por aquí: lo que no sea una lista de `{id, date, time}` bien formados
 * se queda fuera.
 */
export const weekExtraSlots = (
  weekRecord: { extraSlots?: unknown } | undefined | null
): ServiceOutingExtraSlotType[] => {
  const lista = weekRecord?.extraSlots;

  if (!Array.isArray(lista)) return [];

  return lista.filter(
    (turno): turno is ServiceOutingExtraSlotType =>
      typeof turno === 'object' &&
      turno !== null &&
      typeof turno.id === 'string' &&
      turno.id.length > 0 &&
      typeof turno.date === 'string' &&
      FECHA_VALIDA.test(turno.date) &&
      typeof turno.time === 'string' &&
      HORA_VALIDA.test(turno.time)
  );
};

/**
 * «Mañana», «Tarde» o «Noche» de un turno.
 *
 * Los de siempre lo llevan en el nombre. Uno añadido no es ni de mañana ni de
 * tarde por definición —es de la hora que se le ponga—, así que se deduce de
 * ella: hasta las 14:00 mañana, hasta las 20:00 tarde, y después noche.
 */
export const outingSlotLabel = (slotType: string, time: string): string => {
  if (slotType.endsWith('_morning')) return 'Mañana';
  if (slotType.endsWith('_afternoon')) return 'Tarde';

  const hora = Number((time || '').split(':')[0]);

  if (!Number.isFinite(hora)) return '';
  if (hora < 14) return 'Mañana';
  if (hora < 20) return 'Tarde';

  return 'Noche';
};

/** ¿Es un turno añadido solo esa semana? */
export const isExtraOutingSlot = (slotType: string): boolean =>
  slotType.includes('_extra_');

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
        extraSlots?: unknown;
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

  const dayKeys = OUTING_DAY_KEYS;
  const slots: DerivedOutingSlot[] = [];
  const extras = weekExtraSlots(weekRecord);

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
      const assigned = outings.find(
        (o) => o.date === dbDateStr && o.time === time
      );

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

    // LOS TURNOS AÑADIDOS de ese día. Salen SIEMPRE: son una decisión expresa
    // para esa semana, así que ni un turno inhabilitado ni un mes suspendido
    // los esconden (añadir un turno a una semana de agosto es justo decir «esta
    // sí»). Lo que no pueden es duplicar una hora que ya existe ese día: las
    // asignaciones se emparejan por fecha y hora, y dos turnos a la misma hora
    // se repartirían la misma.
    const delDia = slots.filter((slot) => slot.date === dbDateStr);

    for (const extra of extras) {
      if (extra.date !== dbDateStr) continue;
      if (delDia.some((slot) => slot.time === extra.time)) continue;

      const assigned = outings.find(
        (o) => o.date === dbDateStr && o.time === extra.time
      );

      const coHere = isCoWeek && CO_DAYS.includes(dayLabel);

      const turno: DerivedOutingSlot = {
        date: dbDateStr,
        time: extra.time,
        slotType: `${dayLabel}_extra_${extra.id}`,
        person: assigned?.person || (coHere ? 'CIRCUIT_OVERSEER' : ''),
        location: assigned?.location || defaultLocation,
        cancelled: assigned?.cancelled || false,
        extraId: extra.id,
      };

      slots.push(turno);
      delDia.push(turno);
    }
  }

  // Por fecha y, dentro del día, por hora: un turno añadido a las 12:00 va
  // entre el de la mañana y el de la tarde, no al final.
  return slots.sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );
};

/**
 * Un turno de una semana tal como lo enseña «Ajustes de la semana»: con la hora
 * que tiene, la que tendría sin tocar nada, y la que tenía al abrir el diálogo.
 */
export type WeekShiftDraft = {
  /** `slotType` para uno de siempre; el id para uno añadido. */
  key: string;
  kind: 'habitual' | 'extra';
  date: string;
  dayKey: (typeof OUTING_DAY_KEYS)[number];
  time: string;
  /** La hora con la que se abrió: con ella se encuentran sus asignaciones. */
  originalTime: string;
  /** Solo los de siempre: la hora de la congregación para ese mes. */
  habitualTime?: string;
};

/** Los turnos de una semana, listos para editarse. */
export const weekShiftDrafts = (
  settings: ServiceOutingSettingsType | null,
  weekRecord: Parameters<typeof deriveWeekOutingSlots>[1],
  weekOf: string
): WeekShiftDraft[] => {
  // Las horas «de siempre» son las que saldrían sin ninguna hora a medida.
  const habituales = new Map(
    deriveWeekOutingSlots(
      settings,
      { ...(weekRecord ?? {}), weekOverrideHours: {}, extraSlots: [] },
      weekOf
    ).map((slot) => [slot.slotType, slot.time])
  );

  return deriveWeekOutingSlots(settings, weekRecord, weekOf).map((slot) => {
    const dayKey = slot.slotType.split('_')[0] as WeekShiftDraft['dayKey'];

    if (slot.extraId) {
      return {
        key: slot.extraId,
        kind: 'extra',
        date: slot.date,
        dayKey,
        time: slot.time,
        originalTime: slot.time,
      };
    }

    return {
      key: slot.slotType,
      kind: 'habitual',
      date: slot.date,
      dayKey,
      time: slot.time,
      originalTime: slot.time,
      habitualTime: habituales.get(slot.slotType) ?? slot.time,
    };
  });
};

/** Dos turnos del mismo día a la misma hora: no se puede guardar así. */
export const weekShiftCollisions = (drafts: WeekShiftDraft[]): string[] => {
  const vistos = new Map<string, string>();
  const repetidos = new Set<string>();

  for (const draft of drafts) {
    const clave = `${draft.date}_${draft.time}`;
    const previo = vistos.get(clave);

    if (previo) {
      repetidos.add(previo);
      repetidos.add(draft.key);
    } else {
      vistos.set(clave, draft.key);
    }
  }

  return [...repetidos];
};

export type WeekShiftChanges = {
  record: ServiceOutingWeekType;
  /** Turnos que cambian de hora: lo que cuelgue de ellos hay que moverlo. */
  moved: { date: string; from: string; to: string }[];
  /** Turnos añadidos que se quitan. */
  removed: { date: string; time: string }[];
};

/**
 * Aplica «Ajustes de la semana» al registro y devuelve el registro nuevo.
 *
 * Lo que hace, y que antes no hacía nadie:
 *
 *  - LAS ASIGNACIONES SIGUEN A SU TURNO. Una asignación se empareja por fecha y
 *    hora. Si el sábado pasa de las 9:45 a las 9:30 y la asignación se queda en
 *    las 9:45, el turno aparece vacío en el programa y —lo grave— el hermano la
 *    sigue viendo en Mis asignaciones a una hora que ya no existe. Aquí cada
 *    asignación se mueve con su turno. Se calcula sobre una foto de cómo estaba,
 *    no una detrás de otra, para que dos turnos que intercambian sus horas no
 *    se pisen.
 *  - QUITAR UN TURNO AÑADIDO quita su asignación. Si no, quedaría colgando
 *    igual que arriba.
 *  - Solo se guardan las horas que de verdad difieren de las de la
 *    congregación. Antes se copiaban las catorce, y la semana dejaba de seguir
 *    a los horarios del mes aunque solo se hubiera tocado una.
 *
 * Nada de `undefined`: lo que se vacía se quita con `delete`, y el registro
 * viaja entero con una sola fecha, así que lo quitado llega quitado.
 */
export const applyWeekShiftDrafts = ({
  weekRecord,
  weekOf,
  isCircuitOverseerWeek,
  drafts,
}: {
  weekRecord: ServiceOutingWeekType | undefined;
  weekOf: string;
  isCircuitOverseerWeek: boolean;
  drafts: WeekShiftDraft[];
}): WeekShiftChanges => {
  const record: ServiceOutingWeekType = weekRecord
    ? structuredClone(weekRecord)
    : { weekOf, outings: [] };

  const previos = weekExtraSlots(weekRecord);
  const outings: ServiceOutingType[] = (record.outings ?? []).filter(Boolean);

  record.isCircuitOverseerWeek = isCircuitOverseerWeek;

  // 1. Las horas a medida: solo las que difieren.
  const horas: Record<string, string> = {};

  for (const draft of drafts) {
    if (draft.kind !== 'habitual') continue;
    if (draft.time !== (draft.habitualTime ?? draft.time)) {
      horas[draft.key] = draft.time;
    }
  }

  if (Object.keys(horas).length > 0) record.weekOverrideHours = horas;
  else delete record.weekOverrideHours;

  // 2. Los turnos añadidos.
  const extras = drafts
    .filter((draft) => draft.kind === 'extra')
    .map((draft) => ({ id: draft.key, date: draft.date, time: draft.time }));

  // Una cadena aquí son turnos añadidos que ESTE dispositivo aún no ha sabido
  // descifrar (los bajó con una versión anterior). Si no se añade ninguno, se
  // dejan como están: borrarlos sería quitarle a todo el mundo unos turnos que
  // aquí ni siquiera se han llegado a ver.
  const sinDescifrar =
    typeof weekRecord?.extraSlots === 'string' && extras.length === 0;

  if (extras.length > 0) record.extraSlots = extras;
  else if (!sinDescifrar) delete record.extraSlots;

  // 3. Las asignaciones, sobre una foto de cómo estaban.
  const destino = new Map<string, string>();

  for (const draft of drafts) {
    if (draft.time !== draft.originalTime) {
      destino.set(`${draft.date}_${draft.originalTime}`, draft.time);
    }
  }

  const removed = previos
    .filter((previo) => !extras.some((extra) => extra.id === previo.id))
    .map((previo) => ({ date: previo.date, time: previo.time }));

  const quitadas = new Set(removed.map((r) => `${r.date}_${r.time}`));

  record.outings = outings
    .filter((outing) => !quitadas.has(`${outing.date}_${outing.time}`))
    .map((outing) => {
      const nueva = destino.get(`${outing.date}_${outing.time}`);

      return nueva ? { ...outing, time: nueva } : outing;
    });

  const moved = [...destino.entries()].map(([clave, to]) => {
    const corte = clave.indexOf('_');

    return { date: clave.slice(0, corte), from: clave.slice(corte + 1), to };
  });

  return { record, moved, removed };
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
 * `sharedSlots`, que viajan en claro y están a la espera de empezar a cifrarse
 * (PENDIENTES_DE_CIFRAR, en el mapa de cifrado). Hoy no llegan nunca con una
 * forma rara — se ha comprobado sobre los datos reales—, así que esto es una
 * red, no un apaño. La red hace falta porque el día que se active la fase 2 una
 * cadena sin descifrar sería catastrófica: `sharedSlots.map(...)` sobre un
 * texto rompe la página entera, y `disabledSlots` no rompe pero contesta que sí
 * a cualquier trozo de texto que case por casualidad, colando turnos
 * inhabilitados que nadie inhabilitó.
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
 * `weekOverrideHours` también están pendientes de cifrarse, y aquí el booleano
 * tiene un filo propio: la cadena cifrada es un valor VERDADERO, así que un registro
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

  // Los turnos añadidos NO se tocan aquí aunque lleguen con mala forma: quien
  // los lee pasa por `weekExtraSlots`, que ya descarta lo que no sea una lista
  // bien formada. Borrarlos del registro sería peor que ignorarlos — una cadena
  // aún sin descifrar son turnos de verdad que otro dispositivo sí sabe leer.

  return week;
};

/**
 * Los acompañantes del superintendente de circuito siguen a su turno.
 *
 * En la visita, quién sale con él en cada salida se guarda con la clave
 * `fecha_hora` del turno. Si en «Ajustes de la semana» el sábado pasa de las
 * 9:45 a las 9:30, esa clave deja de existir: los acompañantes desaparecen de
 * la página de la visita y —lo peor— siguen viendo en Mis asignaciones una
 * salida a una hora que ya no hay. Esto devuelve la lista con las claves
 * movidas, y sin los de un turno añadido que se ha quitado.
 *
 * Devuelve la MISMA lista si no hay nada que tocar, para que quien llama pueda
 * saber con un `===` que no hace falta guardar la visita.
 */
export const rekeyOutingCompanions = <T extends { outingKey: string }>(
  companions: T[],
  { moved, removed }: Pick<WeekShiftChanges, 'moved' | 'removed'>
): T[] => {
  if (!Array.isArray(companions) || companions.length === 0) return companions;

  // Sobre una foto, igual que las asignaciones: dos turnos que intercambian sus
  // horas no pueden pisarse.
  const destino = new Map(
    moved.map((m) => [`${m.date}_${m.from}`, `${m.date}_${m.to}`])
  );
  const quitadas = new Set(removed.map((r) => `${r.date}_${r.time}`));

  let tocado = false;

  const resultado = companions
    .filter((companion) => {
      if (!quitadas.has(companion.outingKey)) return true;

      tocado = true;
      return false;
    })
    .map((companion) => {
      const nueva = destino.get(companion.outingKey);

      if (!nueva) return companion;

      tocado = true;
      return { ...companion, outingKey: nueva };
    });

  return tocado ? resultado : companions;
};
