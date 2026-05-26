import { store } from '@states/index';
import { serviceOutingsListState, serviceOutingsSettingsState } from '@states/service_outings';
import { personsState } from '@states/persons';
import { dbServiceOutingsSaveWeek } from '@services/dexie/service_outings';


const formatToDbDate = (date: Date): string => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

export const outingsStartAutofill = async (weekOf: string): Promise<number> => {
  const allSchedules = store.get(serviceOutingsListState);
  const settings = store.get(serviceOutingsSettingsState);
  const allPersons = store.get(personsState);

  if (!weekOf || !settings) return 0;

  // 1. Filtrar hermanos habilitados
  const eligibleBrothers = allPersons.filter(
    (p) => p.person_data.male && p.person_data.predicacion_salidas?.value === true
  );

  if (eligibleBrothers.length === 0) return 0;

  // 2. Generar días de la semana actual
  const parts = weekOf.split('/');
  const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  
  const weekDates: { dateStr: string; dayLabel: string; dayOffset: number }[] = [];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = formatToDbDate(dayDate);
    weekDates.push({ dateStr, dayLabel: dayKeys[i], dayOffset: i });
  }

  // 3. Obtener o inicializar copia local de weekRecord
  const localSchedules = structuredClone(allSchedules);
  let weekRecord = localSchedules.find((s) => s.weekOf === weekOf);
  if (!weekRecord) {
    weekRecord = {
      weekOf,
      outings: [],
    };
    localSchedules.push(weekRecord);
  }

  if (!weekRecord.outings) {
    weekRecord.outings = [];
  }

  // 4. Calcular semana anterior
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevWeekOf = formatToDbDate(prevMonday);
  const prevWeekRecord = localSchedules.find((s) => s.weekOf === prevWeekOf);

  // 5. Helper para ver última asignación general
  const getLastAssignmentDate = (personUid: string) => {
    // Ordenar semanas cronológicamente en orden inverso
    const pastWeeks = localSchedules
      .filter((w) => w.weekOf < weekOf)
      .sort((a, b) => b.weekOf.localeCompare(a.weekOf));

    for (const week of pastWeeks) {
      const isAssigned = week.outings?.some((o) => o.person === personUid);
      if (isAssigned) {
        return week.weekOf;
      }
    }
    return ''; // Nunca asignado
  };

  const disabledSlots = settings.disabledSlots || [];
  const defaultHours = settings.defaultHours || {};
  const overrideHours = weekRecord.weekOverrideHours || {};
  let count = 0;

  // 6. Recorrer cada slot del día (Mañana y Tarde)
  for (const { dateStr, dayLabel, dayOffset } of weekDates) {
    const turns = ['morning', 'afternoon'];
    for (const turn of turns) {
      const slotKey = `${dayLabel}_${turn}`;
      
      // A. Omitir si el slot está inhabilitado globalmente
      if (disabledSlots.includes(slotKey) || disabledSlots.includes(dayLabel)) continue;

      // Determinar hora del slot
      const time = overrideHours[slotKey] || defaultHours[slotKey] || (turn === 'morning' ? '10:00' : '17:00');

      // B. Omitir si ya tiene asignación o está suspendida
      const existing = weekRecord.outings.find((o) => o.date === dateStr && o.time === time);
      if (existing && (existing.person !== '' || existing.cancelled)) continue;

      // C. Omitir si es un slot compartido
      const isShared = settings.sharedSlots?.some((s) => s.slotKey === slotKey);
      if (isShared) continue;

      // D. Filtrar hermanos disponibles por preferencia
      let availableBrothers = eligibleBrothers.filter((bro) => {
        const availability = settings.availability?.[bro.person_uid] || [];
        return availability.includes(slotKey);
      });

      // Si nadie tiene configurado este slot como preferido, lo dejamos vacío
      if (availableBrothers.length === 0) continue;

      // E. Evitar repetir consecutivamente (semana anterior)
      // Buscar quién salió el mismo día y turno la semana anterior
      const prevDayDate = new Date(prevMonday);
      prevDayDate.setDate(prevMonday.getDate() + dayOffset);
      const prevDateStr = formatToDbDate(prevDayDate);
      
      const prevOverrideHours = prevWeekRecord?.weekOverrideHours || {};
      const prevTime = prevOverrideHours[slotKey] || defaultHours[slotKey] || (turn === 'morning' ? '10:00' : '17:00');
      
      const prevOuting = prevWeekRecord?.outings?.find(
        (o) => o.date === prevDateStr && o.time === prevTime
      );
      const lastWeekPersonUid = prevOuting?.person || '';

      if (lastWeekPersonUid) {
        // ¿Hay más de una persona que prefiere este slot?
        const totalWithPreference = availableBrothers.length;

        // Si hay otros con esta preferencia, evitamos que repita consecutivamente.
        if (totalWithPreference > 1) {
          const filtered = availableBrothers.filter((bro) => bro.person_uid !== lastWeekPersonUid);
          if (filtered.length > 0) {
            availableBrothers = filtered;
          }
        }
      }

      // F. Seleccionar al hermano con la asignación general más antigua
      if (availableBrothers.length > 0) {
        availableBrothers.sort((a, b) => {
          const dateA = getLastAssignmentDate(a.person_uid);
          const dateB = getLastAssignmentDate(b.person_uid);
          return dateA.localeCompare(dateB);
        });

        const selected = availableBrothers[0];

        // Quitar registro vacío previo para evitar duplicados en la misma hora
        weekRecord.outings = weekRecord.outings.filter(
          (o) => !(o.date === dateStr && o.time === time)
        );

        weekRecord.outings.push({
          id: existing?.id || crypto.randomUUID(),
          date: dateStr,
          time,
          person: selected.person_uid,
          location: existing?.location || settings.locations?.[0] || 'Salón del Reino',
          cancelled: false,
        });

        count++;
      }
    }
  }

  if (count > 0) {
    // 7. Guardar en IndexedDB y actualizar átomo de Jotai
    await dbServiceOutingsSaveWeek(weekRecord);
    store.set(serviceOutingsListState, localSchedules);
  }

  return count;
};
