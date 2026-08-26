import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation } from '@definition/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import {
  schedulesGetData,
  schedulesToggleAssignmentToReplace,
} from '@services/app/schedules';
import { schedulesState } from '@states/schedules';
import { userDataViewState } from '@states/settings';
import useCurrentUser from '@hooks/useCurrentUser';

/**
 * La marca de «hay que cambiar a quien tiene esta parte».
 *
 * SOLO EN LA REUNIÓN DE ENTRE SEMANA, que es donde se pidió y donde tiene
 * sentido: son treinta partes al mes repartidas con semanas de antelación, así
 * que hay tiempo de sobra para que a alguien le surja algo. El fin de semana son
 * cuatro nombres y se arreglan en el momento.
 *
 * Se decide por la RUTA de la asignación (`midweek_meeting.…`) y no por una
 * propiedad que pase el editor: los mismos selectores los usan las dos
 * pantallas, y una propiedad habría que acordarse de pasarla en cada sitio —que
 * es como se acaba con el botón puesto en unos campos sí y en otros no.
 *
 * Y solo la ve quien edita esa reunión: para el resto de la congregación no es
 * un dato útil, y sería un botón que no pueden pulsar.
 */
const useAssignmentToReplace = ({
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

  const schedule = useMemo(
    () => schedules.find((record) => record.weekOf === week),
    [schedules, week]
  );

  const esDeEntreSemana = useMemo(() => {
    if (!assignment) return false;

    return String(ASSIGNMENT_PATH[assignment] ?? '').startsWith(
      'midweek_meeting'
    );
  }, [assignment]);

  const assigned = useMemo(() => {
    if (!esDeEntreSemana || !schedule) return null;

    const data = schedulesGetData(schedule, ASSIGNMENT_PATH[assignment], view);

    return (data as AssignmentCongregation) ?? null;
  }, [esDeEntreSemana, schedule, assignment, view]);

  // Sin nadie asignado no hay a quién cambiar: eso es un hueco del programa, y
  // el hueco ya se ve solo.
  const visible = Boolean(isMidweekEditor && esDeEntreSemana && assigned?.value);

  const toReplace = Boolean(assigned?.toReplace);

  const toggle = async () => {
    if (!visible || saving) return;

    setSaving(true);

    try {
      await schedulesToggleAssignmentToReplace(
        schedule,
        assignment,
        !toReplace
      );
    } finally {
      setSaving(false);
    }
  };

  return { visible, toReplace, toggle, saving };
};

export default useAssignmentToReplace;
