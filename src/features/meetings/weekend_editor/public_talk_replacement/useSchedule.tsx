import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { schedulesState } from '@states/schedules';
import { userDataViewState } from '@states/settings';
import { dbSchedUpdate } from '@services/dexie/schedules';
import { PublicTalkReplacementCongregation } from '@definition/schedules';

type Valor = PublicTalkReplacementCongregation['value'];

/**
 * Lo que sustituye al discurso público esa semana, leído y guardado en el
 * PROGRAMA.
 *
 * En el programa y no en la visita del superintendente: la tabla de visitas solo
 * la suben ancianos y administradores, y quien programa los discursos del fin de
 * semana muchas veces no es anciano — se le habría quedado el cambio en el
 * teléfono sin llegar a nadie.
 */
const useReplacementSchedule = (week: string) => {
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);

  const schedule = useMemo(
    () => schedules.find((record) => record.weekOf === week),
    [schedules, week]
  );

  const value = useMemo(() => {
    return (
      schedule?.weekend_meeting?.public_talk_replacement?.find(
        (record) => record.type === dataView
      )?.value ?? null
    );
  }, [schedule, dataView]);

  const save = useCallback(
    async (nuevo: Valor) => {
      if (!schedule) return;

      const lista = structuredClone(
        schedule.weekend_meeting.public_talk_replacement ?? []
      );

      const actual = lista.find((record) => record.type === dataView);

      // `null` y no `undefined` al quitarlo: los campos `undefined` desaparecen
      // en el JSON.stringify del cifrado E2E, así que el borrado no viajaría a
      // los demás dispositivos y el vídeo reaparecería al sincronizar. Es el
      // mismo filo que ya mordió al quitar un discurso público.
      if (actual) {
        actual.value = nuevo ?? null;
        actual.updatedAt = new Date().toISOString();
      } else {
        lista.push({
          type: dataView,
          value: nuevo ?? null,
          updatedAt: new Date().toISOString(),
        });
      }

      await dbSchedUpdate(week, {
        'weekend_meeting.public_talk_replacement': lista,
      });
    },
    [schedule, dataView, week]
  );

  return { value, save };
};

export default useReplacementSchedule;
