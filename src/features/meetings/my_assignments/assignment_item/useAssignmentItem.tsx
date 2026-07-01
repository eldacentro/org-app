import { JSX, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import {
  fullnameOptionState,
  userDataViewState,
  userLocalUIDState,
  JWLangState,
} from '@states/settings';
import { sourcesState } from '@states/sources';
import { formatDate, getWeekDate } from '@utils/date';
import { AssignmentHistoryType } from '@definition/schedules';
import { AssignmentItemProps } from './index.types';
import Badge from '@components/badge';

const ADD_CALENDAR_SHOW = false;

const useAssignmentItem = ({ items }: AssignmentItemProps) => {
  const { t } = useAppTranslation();

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const dataView = useAtomValue(userDataViewState);
  const sources = useAtomValue(sourcesState);
  const jwLang = useAtomValue(JWLangState);

  // Todos los elementos de un mismo grupo comparten fecha y categoría, así
  // que la "cara" de la tarjeta (día, número, si es de departamento) se
  // calcula una sola vez con el primero.
  const first = items[0];

  // "Toda la semana"/"SEM." solo aplica a una entrada de departamento
  // heredada sin fecha real; con actualDate ya se muestra como el día
  // normal de la reunión (entre semana o fin de semana).
  const isDept = useMemo(() => {
    return (first.assignment.key?.startsWith('DEPT_') ?? false) && !first.actualDate;
  }, [first]);

  const assignmentDate = useMemo(() => {
    try {
      const dateToUse = first.actualDate || first.weekOf;
      return formatDate(new Date(dateToUse), 'd');
    } catch {
      return formatDate(new Date(), 'd');
    }
  }, [first]);

  const assignmentDayName = useMemo(() => {
    const DAY_ABBREV = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    try {
      const dateToUse = first.actualDate || first.weekOf;
      const parts = dateToUse.split('/');
      if (parts.length >= 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return DAY_ABBREV[d.getDay()];
      }
      return DAY_ABBREV[new Date(dateToUse).getDay()];
    } catch {
      return '';
    }
  }, [first]);

  const personGetName = (value: string) => {
    const person = persons.find((record) => record.person_uid === value);
    if (!person) return '';

    const name = buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );

    return name;
  };

  const getBadges = (history: AssignmentHistoryType) => {
    const result: JSX.Element[] = [];

    if (history.assignment.dataView !== dataView) {
      result.push(
        <Badge
          key="assignment-dataView"
          text={
            dataView === 'main'
              ? t('tr_languageGroupShort')
              : t('tr_hostCongregationShort')
          }
          color={dataView === 'main' ? 'red' : 'green'}
          size="medium"
          centerContent
        />
      );
    }

    return result;
  };

  const rows = useMemo(() => {
    return items.map((history) => ({
      history,
      badges: getBadges(history),
      isDept: (history.assignment.key?.startsWith('DEPT_') ?? false) && !history.actualDate,
    }));
  }, [items, dataView, t]);

  const jwLibraryUrl = useMemo(() => {
    const key = first.assignment.key ?? '';
    const isSpecial =
      key.startsWith('DEPT_') ||
      key.startsWith('OUTING_') ||
      key.startsWith('EXHIBITOR_') ||
      key.startsWith('LIMPIEZA_') ||
      key.startsWith('COVISIT_');
    if (isSpecial) return null;

    const code = first.assignment.code as number;
    const EXCLUDED = new Set([111, 118, 119, 120, 121, 122, 130, 131]);
    const isMidweek =
      (code >= 100 && code <= 117) || (code >= 123 && code <= 129);
    if (!isMidweek || EXCLUDED.has(code)) return null;

    const locale = jwLang || 'S';

    // El weekOf de una asignación es el día real de la reunión (p. ej. el
    // miércoles), pero las fuentes del .jwpub se guardan bajo el LUNES de la
    // semana. Normalizamos ambos al lunes para que coincidan; si no, la
    // búsqueda falla y, peor, el fallback toma el mes del miércoles (que en la
    // última semana del cuaderno cae en el mes siguiente → cuaderno erróneo).
    const toMonday = (week: string) =>
      formatDate(getWeekDate(new Date(week)), 'yyyy/MM/dd');
    const targetMonday = toMonday(first.weekOf);

    const source = sources.find((s) => toMonday(s.weekOf) === targetMonday);

    if (source?.mwb_week_docid) {
      return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=${locale}&prefer=lang&docid=${source.mwb_week_docid}`;
    }

    const [year, month] = targetMonday.split('/');
    // MWB is published bi-monthly: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec.
    // The issue code uses the first month of each pair (always odd).
    const monthNum = parseInt(month, 10);
    const issueMonth = String(monthNum % 2 === 0 ? monthNum - 1 : monthNum).padStart(2, '0');
    return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=${locale}&prefer=lang&pub=mwb&issue=${year}${issueMonth}`;
  }, [first, sources, jwLang]);

  return {
    assignmentDate,
    assignmentDayName,
    isDept,
    rows,
    personGetName,
    userUID,
    ADD_CALENDAR_SHOW,
    jwLibraryUrl,
  };
};

export default useAssignmentItem;
