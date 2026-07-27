// ** FOR SETTING STATE OUTSIDE REACT COMPONENTS OR TO AVOID USE OF USECALLBACK ** //

import { store } from '@states/index';
import {
  S140DataState,
  S140DownloadOpenState,
  assignmentsHistoryState,
  currentScheduleState,
  dlgAssDeleteOpenState,
  dlgAutoFillOpenState,
  isAutoFillSchedState,
  isDeleteSchedState,
  isPublishOpenState,
  s89DataState,
} from '@states/schedules';
import {
  AssignmentHistoryType,
  MidweekMeetingDataType,
  S89DataType,
} from '@definition/schedules';
import { isSameRecord } from '@services/worker/merge';

export const setPublishPocket = (value: boolean) => {
  store.set(isPublishOpenState, value);
};

export const setDlgAssDeleteOpen = (value: boolean) => {
  store.set(dlgAssDeleteOpenState, value);
};

export const setIsDeleteSched = (value: boolean) => {
  store.set(isDeleteSchedState, value);
};

export const setDlgAutofillOpen = (value: boolean) => {
  store.set(dlgAutoFillOpenState, value);
};

export const setIsAutofillSched = (value: boolean) => {
  store.set(isAutoFillSchedState, value);
};

export const setCurrentSchedule = (value: string) => {
  store.set(currentScheduleState, value);
};

export const setS89Data = (value: S89DataType[]) => {
  store.set(s89DataState, value);
};

export const setS140Data = (value: MidweekMeetingDataType[]) => {
  store.set(S140DataState, value);
};

export const setIsS140Download = (value: boolean) => {
  store.set(S140DownloadOpenState, value);
};

export const setAssignmentsHistory = (value: AssignmentHistoryType[]) => {
  // El historial se recalcula ENTERO al terminar cada sincronización (y cada
  // vez que cambian los programas), y casi siempre sale idéntico. Entregar un
  // array nuevo con el mismo contenido cambia la referencia y redibuja a quien
  // lo lee sin que haya nada nuevo que enseñar — la misma regla que en la base
  // de datos: no se escribe lo que no ha cambiado. Ver isSameRecord.
  if (isSameRecord(store.get(assignmentsHistoryState), value)) return;

  store.set(assignmentsHistoryState, value);
};
