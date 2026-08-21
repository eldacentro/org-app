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

  const status = view.status[partKey] as MeetingRunStatus | undefined;
  const note = view.notes?.[partKey];

  // La nota puede existir sin que el relojito tenga estado: terminada la
  // reunión el programa vuelve a verse como siempre, pero lo apuntado se queda.
  if (!status && !note) return null;

  return { status, shifted: view.shifted[partKey], note, drift: view.drift };
};
