import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation } from '@definition/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import {
  schedulesGetData,
  schedulesToggleAssignmentConfirmed,
} from '@services/app/schedules';
import { schedulesS89AssignmentCarriesSlip } from '@services/app/pending_s89';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import { JWLangState, userDataViewState } from '@states/settings';
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
  const sources = useAtomValue(sourcesState);
  const lang = useAtomValue(JWLangState);
  const currentDataView = useAtomValue(userDataViewState);
  const { isMidweekEditor } = useCurrentUser();

  const [saving, setSaving] = useState(false);

  const view = dataView ?? currentDataView;

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  // La MISMA pregunta que se hacen el contador de pendientes y la impresión,
  // y ahora con la misma respuesta: antes aquí se miraba `S89_ASSIGNMENTS` a
  // pelo, sin el tipo de parte. Tres sitios preguntando lo mismo por su
  // cuenta es exactamente cómo se llega a que el contador diga que falta una
  // hojita que no existe.
  const llevaHojita = useMemo(() => {
    if (!assignment) return false;

    const source = sources.find((record) => record.weekOf === week);

    return schedulesS89AssignmentCarriesSlip(assignment, source, lang);
  }, [assignment, sources, week, lang]);

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
