import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { CircuitOverseerVisitType } from '@definition/settings';
import { settingsState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { formatDate, getWeekDate } from '@utils/date';
import { schedulesState } from '@states/schedules';
import { Week } from '@definition/week_type';
import { dbSchedUpdate } from '@services/dexie/schedules';
import {
  dbCircuitVisitDelete,
  dbCircuitVisitGetAll,
  dbCircuitVisitMoveWeek,
  dbCircuitVisitSave,
} from '@services/dexie/circuit_visit';
import { buildVisitForWeek } from '@services/app/circuit_visit';

// Entidad completa (tabla circuit_overseer_visits, la que alimenta la página
// "Visita del superintendente" y Próximos eventos) activa para una semana.
const findActiveEntityVisit = async (weekOf: string) => {
  if (!weekOf) return undefined;
  const all = await dbCircuitVisitGetAll();
  return all.find((v) => !v._deleted && v.weekOf === weekOf);
};

const useWeekItem = (visit: CircuitOverseerVisitType) => {
  const settings = useAtomValue(settingsState);
  const schedules = useAtomValue(schedulesState);

  const handleUpdateWeekType = async (weekOf: string, type: Week) => {
    if (!weekOf) return;

    const schedule = schedules.find((record) => record.weekOf === weekOf);

    if (schedule) {
      const midweeks = structuredClone(schedule.midweek_meeting.week_type);

      for (const midweek of midweeks) {
        midweek.value = type;
        midweek.updatedAt = new Date().toISOString();
      }

      const weekends = structuredClone(schedule.weekend_meeting.week_type);

      for (const weekend of weekends) {
        weekend.value = type;
        weekend.updatedAt = new Date().toISOString();
      }

      await dbSchedUpdate(weekOf, {
        'midweek_meeting.week_type': midweeks,
        'weekend_meeting.week_type': weekends,
      });
    }
  };

  const hasAnotherVisitWithWeek = (
    list: CircuitOverseerVisitType[],
    weekOf: string,
    currentId: string
  ) => {
    if (!weekOf) return false;
    return list.some(
      (record) =>
        record.id !== currentId && record._deleted === false && record.weekOf === weekOf
    );
  };

  // DEBOUNCE del guardado (bug real, 2026-07-20): MUI emite onChange en CADA
  // pulsación al teclear la fecha, y al editar una fecha ya completa cada
  // estado intermedio es una fecha VÁLIDA distinta (09/18 → 09/01 → 09/15...).
  // Confirmar cada pulsación movía la visita varias veces seguidas en
  // paralelo (lecturas obsoletas del atom → entradas duplicadas, entidades y
  // eventos basura). Solo se persiste el valor con el que el usuario se queda.
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  const commitDateChange = async (value: Date | null) => {
    const nextDate =
      value === null ? '' : formatDate(getWeekDate(value), 'yyyy/MM/dd');

    const coVisits = structuredClone(
      settings.cong_settings.circuit_overseer.visits
    );

    let current = coVisits.find((record) => record.id === visit.id);

    if (!current) {
      coVisits.push({
        _deleted: visit._deleted,
        id: visit.id,
        updatedAt: visit.updatedAt,
        weekOf: visit.weekOf,
      });

      current = coVisits.find((record) => record.id === visit.id);
    }

    const previousWeek = current?.weekOf ?? '';

    current.weekOf = nextDate;
    current.updatedAt = new Date().toISOString();

    if (previousWeek && previousWeek !== nextDate) {
      const stillHasPreviousWeek = hasAnotherVisitWithWeek(
        coVisits,
        previousWeek,
        visit.id
      );

      if (!stillHasPreviousWeek) {
        await handleUpdateWeekType(previousWeek, Week.NORMAL);
      }
    }

    if (nextDate.length > 0) {
      await handleUpdateWeekType(nextDate, Week.CO_VISIT);
    }

    await dbAppSettingsUpdate({
      'cong_settings.circuit_overseer.visits': coVisits,
    });

    // Espejo hacia la entidad completa (página "Visita del superintendente"
    // + Próximos eventos), DESPUÉS de guardar la lista de Ajustes para que
    // el espejo inverso del servicio (upsert/tombstone de entradas ligeras)
    // vea el estado ya persistido y no duplique nada.
    if (value !== null && nextDate.length > 0) {
      const previousEntity = await findActiveEntityVisit(previousWeek);
      const nextEntity = await findActiveEntityVisit(nextDate);

      if (previousEntity && previousWeek !== nextDate) {
        if (nextEntity) {
          // La semana destino ya tiene su propia entidad — mover la vieja
          // crearía un duplicado (dos visitas la misma semana): se borra.
          await dbCircuitVisitDelete(previousEntity.id);
        } else {
          await dbCircuitVisitMoveWeek(previousEntity.id, value);
        }
      } else if (!previousEntity && !nextEntity) {
        await dbCircuitVisitSave(buildVisitForWeek(value));
      }
    }

    if (nextDate.length === 0 && previousWeek) {
      const previousEntity = await findActiveEntityVisit(previousWeek);
      if (previousEntity) {
        await dbCircuitVisitDelete(previousEntity.id);
      }
    }

    return nextDate;
  };

  const handleDateChange = async (value: Date | null) => {
    const optimistic =
      value === null ? '' : formatDate(getWeekDate(value), 'yyyy/MM/dd');

    if (commitTimer.current) clearTimeout(commitTimer.current);

    // Año parcial (2 → 0002 → 0020...) = tecleo a medias: ni se agenda el
    // guardado; la siguiente pulsación traerá un estado más completo.
    const isPartial =
      value !== null && (isNaN(value.getTime()) || value.getFullYear() < 2000);

    if (!isPartial) {
      commitTimer.current = setTimeout(() => {
        commitDateChange(value).catch((error) => console.error(error));
      }, 800);
    }

    // La UI (WeekItem) ya pintó este valor de forma optimista; devolverlo
    // igual evita un onWeekChange correctivo que resetee el campo a mitad
    // de tecleo.
    return optimistic;
  };

  const handleDeleteVisit = async () => {
    // Cancela cualquier guardado pendiente del campo de fecha: si no, el
    // commit diferido podría re-crear lo que estamos borrando.
    if (commitTimer.current) clearTimeout(commitTimer.current);

    const coVisits = structuredClone(
      settings.cong_settings.circuit_overseer.visits
    );

    const current = coVisits.find((record) => record.id === visit.id);

    if (current) {
      const currentWeek = current.weekOf;

      if (currentWeek) {
        const stillHasWeek = hasAnotherVisitWithWeek(
          coVisits,
          currentWeek,
          visit.id
        );

        if (!stillHasWeek) {
          await handleUpdateWeekType(currentWeek, Week.NORMAL);
        }
      }

      current._deleted = true;
      current.updatedAt = new Date().toISOString();
    }

    await dbAppSettingsUpdate({
      'cong_settings.circuit_overseer.visits': coVisits,
    });

    // Espejo: si esa semana tenía su entidad completa, se borra también
    // (tombstone + des-proyección de Próximos eventos, semana y salidas).
    const entity = await findActiveEntityVisit(current?.weekOf ?? '');
    if (entity) {
      await dbCircuitVisitDelete(entity.id);
    }
  };

  return { handleDateChange, handleDeleteVisit };
};

export default useWeekItem;
