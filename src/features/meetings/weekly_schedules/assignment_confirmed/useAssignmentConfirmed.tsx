import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation } from '@definition/schedules';
import { ASSIGNMENT_PATH, S89_ASSIGNMENTS } from '@constants/index';
import {
  schedulesGetData,
  schedulesToggleAssignmentConfirmed,
} from '@services/app/schedules';
import { schedulesState } from '@states/schedules';
import { userDataViewState } from '@states/settings';
import useCurrentUser from '@hooks/useCurrentUser';

/**
 * La marca de "hojita entregada y aceptada" de UNA asignación.
 *
 * Solo aplica a las asignaciones que llevan hoja S-89 (`S89_ASSIGNMENTS`), y
 * solo la puede pulsar quien edita la reunión de entre semana, que es quien
 * las reparte. Para el resto de la congregación no se dibuja nada: no es un
 * dato que les sirva y sería una casilla que no pueden tocar.
 */
const useAssignmentConfirmed = ({
  week,
  assignment,
  dataView,
}: {
  week: string;
  assignment?: AssignmentFieldType;
  dataView?: string;
}) => {
  const schedules = useAtomValue(schedulesState);
  const currentDataView = useAtomValue(userDataViewState);
  const { isMidweekEditor } = useCurrentUser();

  const [saving, setSaving] = useState(false);

  const view = dataView ?? currentDataView;

  const llevaHojita = useMemo(() => {
    if (!assignment) return false;

    return (S89_ASSIGNMENTS as readonly string[]).includes(assignment);
  }, [assignment]);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  const assigned = useMemo(() => {
    if (!llevaHojita || !schedule) return null;

    const data = schedulesGetData(schedule, ASSIGNMENT_PATH[assignment], view);

    return (data as AssignmentCongregation) ?? null;
  }, [llevaHojita, schedule, assignment, view]);

  // Sin nadie asignado no hay hojita que entregar, así que tampoco casilla.
  const visible = Boolean(isMidweekEditor && llevaHojita && assigned?.value);

  const confirmed = Boolean(assigned?.confirmed);

  const toggle = async () => {
    if (!visible || saving) return;

    setSaving(true);

    try {
      await schedulesToggleAssignmentConfirmed(
        schedule,
        assignment,
        !confirmed
      );
    } finally {
      setSaving(false);
    }
  };

  return { visible, confirmed, toggle, saving };
};

export default useAssignmentConfirmed;
