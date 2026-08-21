import { useContext } from 'react';
import { useAtomValue } from 'jotai';
import { meetingRunViewState } from '@states/meeting_run';
import { MeetingRunStatus } from '@services/app/meeting_run';
import { MeetingRunScopeContext } from './scope_context';

/**
 * Cómo va esta parte, si es que se está siguiendo la reunión.
 *
 * Devuelve `null` en todo lo demás: fuera de la reunión de entre semana, en una
 * semana que no es la que se está siguiendo, o en un componente que no dice de
 * qué parte es. Ese `null` es lo que hace que el programa se vea exactamente
 * como siempre cuando esto no está en marcha.
 */
export const useMeetingRunPart = (partKey?: string) => {
  const scope = useContext(MeetingRunScopeContext);
  const view = useAtomValue(meetingRunViewState);

  if (!partKey || !scope || !view) return null;

  if (view.weekOf !== scope.week || view.dataView !== scope.dataView) {
    return null;
  }

  // Se devuelve aunque no haya estado: terminada la reunión el programa vuelve
  // a verse como siempre —sin relojitos encendidos— pero lo apuntado se queda, y
  // sigue habiendo dónde apuntar.
  return {
    status: view.status[partKey] as MeetingRunStatus | undefined,
    shifted: view.shifted[partKey],
    note: view.notes?.[partKey],
    drift: view.drift,
    finished: view.finished,
  };
};
