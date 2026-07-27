import { PersonType, StatusHistoryType } from '@definition/person';
import { formatDate, dateFirstDayMonth } from '@utils/date';

/**
 * Periodos de publicador (y de estudiante): abrirlos y cerrarlos.
 *
 * Los historiales se tocan desde ocho sitios distintos —la casilla de la
 * ficha, el alta, el historial detallado, la fecha de primer informe, la
 * pantalla de informes...— y cada uno se buscaba la vida. De ahí salieron dos
 * defectos que dejaron historiales sucios en la congregación:
 *
 * - Al buscar "el periodo abierto" con `end_date === null` a secas se cogía
 *   también uno BORRADO, así que se cerraba el equivocado y el de verdad
 *   seguía abierto.
 * - Al reabrir se ponía siempre el día 1 del mes en curso. Si el periodo
 *   anterior se había cerrado el día 11 y se reabría el 16, el nuevo empezaba
 *   el día 1: dos periodos solapados sobre las mismas fechas. Le pasó a cinco
 *   personas, y a Antonio Bernabéu tres veces.
 *
 * Por eso todo pasa ahora por estas dos funciones, y ninguna hace un `push`
 * a pelo.
 */

/** Los dos historiales de publicador, para recorrerlos sin repetirse. */
export const ESTADOS_PUBLICADOR = [
  'publisher_baptized',
  'publisher_unbaptized',
] as const;

/** Milisegundos de una fecha guardada, en cualquiera de los formatos del repo. */
const timeOf = (value: string | null | undefined) => {
  if (!value) return null;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

/** El periodo abierto DE VERDAD: sin marca de borrado y sin fecha de fin. */
export const findOpenPeriod = (history: StatusHistoryType[] = []) =>
  history.find((record) => !record._deleted && record.end_date === null);

/**
 * Abre un periodo. No hace nada si ya hay uno abierto, y nunca lo empieza
 * antes de que termine el anterior.
 *
 * @param startDate cuándo empieza; por defecto, el día 1 del mes en curso.
 */
export const openPeriod = (
  history: StatusHistoryType[],
  startDate?: string
) => {
  if (findOpenPeriod(history)) return;

  let start = startDate ?? dateFirstDayMonth().toISOString();

  const latestEnd = history
    .filter((record) => !record._deleted && record.end_date)
    .reduce<string | null>((latest, record) => {
      const time = timeOf(record.end_date);
      if (time === null) return latest;

      return latest === null || time > timeOf(latest) ? record.end_date : latest;
    }, null);

  const startTime = timeOf(start);
  const latestEndTime = timeOf(latestEnd);

  if (latestEndTime !== null && startTime !== null && latestEndTime > startTime) {
    start = latestEnd;
  }

  history.push({
    id: crypto.randomUUID(),
    _deleted: false,
    updatedAt: new Date().toISOString(),
    start_date: start,
    end_date: null,
  });
};

export const closeOpenHistory = (
  history: StatusHistoryType[],
  isAddPerson: boolean
) => {
  const current = findOpenPeriod(history);

  if (current && isAddPerson) {
    const index = history.indexOf(current);
    if (index !== -1) {
      history.splice(index, 1);
    }
  }

  if (current && !isAddPerson) {
    current.end_date = new Date().toISOString();
    current.updatedAt = new Date().toISOString();
  }
};

export const toggleMidweekMeetingStudent = (
  newPerson: PersonType,
  checked: boolean,
  isAddPerson: boolean
) => {
  if (
    checked &&
    (newPerson.person_data.publisher_baptized.active.value ||
      newPerson.person_data.publisher_unbaptized.active.value)
  ) {
    return;
  }

  newPerson.person_data.midweek_meeting_student.active.value = checked;
  newPerson.person_data.midweek_meeting_student.active.updatedAt =
    new Date().toISOString();

  if (checked) {
    openPeriod(newPerson.person_data.midweek_meeting_student.history);
  }

  if (!checked) {
    closeOpenHistory(
      newPerson.person_data.midweek_meeting_student.history,
      isAddPerson
    );
  }
};

export const midweekMeetingStudentStartDateChange = (
  newPerson: PersonType,
  id: string,
  value: Date
) => {
  if (id === '') {
    return;
  }
  const current = newPerson.person_data.midweek_meeting_student.history.find(
    (history) => history.id === id
  );

  if (!current) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Midweek meeting student history with id ${id} not found`);
    }
    return;
  }

  current.start_date = value.toISOString();
  current.updatedAt = new Date().toISOString();
};

export const updateFirstReport = (newPerson: PersonType) => {
  const baptizedHistory =
    newPerson.person_data.publisher_baptized.history.filter(
      (record) => !record._deleted && record.start_date !== null
    );

  const unbaptizedHistory =
    newPerson.person_data.publisher_unbaptized.history.filter(
      (record) => !record._deleted && record.start_date !== null
    );

  const history = baptizedHistory.concat(unbaptizedHistory);

  if (history.length === 0) {
    newPerson.person_data.first_report = {
      value: null,
      updatedAt: new Date().toISOString(),
    };
    return;
  }

  const minDateMs = Math.min(
    ...history.map((r) => new Date(r.start_date).getTime())
  );
  const minDate = formatDate(new Date(minDateMs), 'yyyy/MM/dd');

  const currentFirstReport = newPerson.person_data.first_report?.value ?? null;

  if (minDate !== currentFirstReport) {
    newPerson.person_data.first_report = {
      value: minDate,
      updatedAt: new Date().toISOString(),
    };
  }
};

export const toggleUnbaptizedPublisher = (
  newPerson: PersonType,
  checked: boolean,
  isAddPerson: boolean
) => {
  if (checked && newPerson.person_data.publisher_baptized.active.value) {
    return;
  }
  newPerson.person_data.publisher_unbaptized.active.value = checked;
  newPerson.person_data.publisher_unbaptized.active.updatedAt =
    new Date().toISOString();

  if (checked) {
    toggleMidweekMeetingStudent(newPerson, false, isAddPerson);
    addHistory(newPerson);
  }

  if (!checked) {
    closeOpenHistory(
      newPerson.person_data.publisher_unbaptized.history,
      isAddPerson
    );
    updateFirstReport(newPerson);
  }
};
export const toggleBaptizedPublisher = (
  newPerson: PersonType,
  checked: boolean,
  isAddPerson: boolean
) => {
  if (checked) {
    toggleMidweekMeetingStudent(newPerson, false, isAddPerson);
    toggleUnbaptizedPublisher(newPerson, false, isAddPerson);
  }
  newPerson.person_data.publisher_baptized.active.value = checked;
  newPerson.person_data.publisher_baptized.active.updatedAt =
    new Date().toISOString();

  if (checked) {
    addHistory(newPerson);
  }

  if (!checked) {
    closeOpenHistory(
      newPerson.person_data.publisher_baptized.history,
      isAddPerson
    );
    updateFirstReport(newPerson);
  }
};

export const changeBaptismDate = (
  newPerson: PersonType,
  value: Date | null
) => {
  newPerson.person_data.publisher_baptized.baptism_date.value =
    value === null ? null : new Date(value).toISOString();

  newPerson.person_data.publisher_baptized.baptism_date.updatedAt =
    new Date().toISOString();

  const histories = newPerson.person_data.publisher_baptized.history.filter(
    (record) => !record._deleted && record.start_date !== null
  );

  const firstReport = newPerson.person_data.first_report?.value || '';

  if (histories.length === 0 && value && firstReport.length === 0) {
    openPeriod(
      newPerson.person_data.publisher_baptized.history,
      dateFirstDayMonth(value).toISOString()
    );

    updateFirstReport(newPerson);
  }
};
/**
 * Toggles the active status for a publisher.
 * If both baptized and unbaptized statuses are inactive, this function
 * defaults to activating the 'unbaptized' status.
 * @param {PersonType} newPerson - The person object to modify.
 * @param {boolean} isActive - The desired active state (true for active, false for inactive).
 * @param {boolean} isAddPerson - Flag indicating if this is part of an add person flow.
 */
export const toggleActive = (
  newPerson: PersonType,
  isActive: boolean,
  isAddPerson: boolean
) => {
  const relevantStatus = newPerson.person_data.publisher_baptized.active.value
    ? newPerson.person_data.publisher_baptized
    : newPerson.person_data.publisher_unbaptized;
  const activeHistoryExists = Boolean(findOpenPeriod(relevantStatus.history));

  if (
    isActive === relevantStatus.active.value &&
    activeHistoryExists === isActive
  ) {
    return;
  }

  if (!isActive) {
    const activeRecord = findOpenPeriod(relevantStatus.history);

    if (!activeRecord) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('No active record found to deactivate');
      }
      return;
    }
    const start_date = formatDate(
      new Date(activeRecord.start_date),
      'yyyy/MM/dd'
    );

    const nowDate = formatDate(new Date(), 'yyyy/MM/dd');

    if (start_date === nowDate) {
      if (isAddPerson) {
        relevantStatus.history = relevantStatus.history.filter(
          (record) => record.id !== activeRecord.id
        );
      }

      if (!isAddPerson) {
        activeRecord._deleted = true;
        activeRecord.updatedAt = new Date().toISOString();
      }
    }

    if (start_date !== nowDate) {
      activeRecord.end_date = new Date().toISOString();
      activeRecord.updatedAt = new Date().toISOString();
    }

    relevantStatus.active.value = false;
    relevantStatus.active.updatedAt = new Date().toISOString();

    updateFirstReport(newPerson);
  }

  if (isActive) {
    relevantStatus.active.value = isActive;
    relevantStatus.active.updatedAt = new Date().toISOString();
    addHistory(newPerson);
  }
};

const addHistory = (newPerson: PersonType) => {
  const relevantStatus = newPerson.person_data.publisher_baptized.active.value
    ? newPerson.person_data.publisher_baptized
    : newPerson.person_data.publisher_unbaptized;
  openPeriod(relevantStatus.history);

  updateFirstReport(newPerson);
};
