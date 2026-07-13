import { SchedWeekType } from '@definition/schedules';
import { SourceWeekType } from '@definition/sources';
import { scheduleSchema } from '@services/dexie/schema';
import { updatedAtOverride } from '@utils/common';
import appDb from '@db/appDb';

const useMeetingImport = () => {
  const getSources = (sources: SourceWeekType[]) => {
    return sources.map((record) => {
      const data = updatedAtOverride(record);
      return data;
    });
  };

  const getSchedules = async (
    schedules: SchedWeekType[],
    midweek: boolean,
    weekend: boolean
  ) => {
    // La mitad NO seleccionada se CONSERVA de la copia local existente — no se
    // reemplaza por la plantilla vacía. Antes, importar solo "fin de semana"
    // machacaba TODAS las asignaciones de entre semana con la plantilla vacía
    // re-sellada fresca, que además ganaba todos los merges y se propagaba a
    // toda la congregación (incidente real 2026-07-13: se "perdieron" las 211
    // asignaciones de entre semana de todas las semanas). Solo si la semana no
    // existe localmente se usa la plantilla, clonada para no compartir la
    // misma referencia entre todas las semanas.
    const localSchedules = await appDb.sched.toArray();
    const localByWeek = new Map(localSchedules.map((w) => [w.weekOf, w]));

    return schedules.map((record) => {
      const localWeek = localByWeek.get(record.weekOf);

      const midweekData = midweek
        ? record.midweek_meeting
        : (localWeek?.midweek_meeting ??
          structuredClone(scheduleSchema.midweek_meeting));

      const weekendData = weekend
        ? record.weekend_meeting
        : (localWeek?.weekend_meeting ??
          structuredClone(scheduleSchema.weekend_meeting));

      record.midweek_meeting = midweekData;
      record.weekend_meeting = weekendData;

      updatedAtOverride(record);

      return record;
    });
  };

  return { getSources, getSchedules };
};

export default useMeetingImport;
