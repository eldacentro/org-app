import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { dayNamesState, monthNamesState } from '@states/app';
import { sourcesState } from '@states/sources';
import { JWLangState } from '@states/settings';
import { schedulesGetMeetingDate } from '@services/app/schedules';

/**
 * El titular de la semana: la fecha REAL de esa reunión, con su día.
 *
 * Es lo que sustituye a la frase grande con el rango de la semana. Antes la
 * línea decía "JULIO 29 | JEREMÍAS 20, 21" — sin el día, que es justo lo que
 * la gente busca— y estaba debajo de otra que ya decía la semana entera.
 *
 * La fecha sale de schedulesGetMeetingDate, así que respeta el salto a martes
 * de la semana de la visita del superintendente y los tipos de semana
 * especiales, igual que el resto de la aplicación.
 */
const useMeetingHeadline = (
  week: string,
  meeting: 'midweek' | 'weekend',
  dataView: string
) => {
  const sources = useAtomValue(sourcesState);
  const dayNames = useAtomValue(dayNamesState);
  const monthNames = useAtomValue(monthNamesState);
  const lang = useAtomValue(JWLangState);

  return useMemo(() => {
    if (!week) return { title: '', subtitle: '' };

    const source = sources.find((record) => record.weekOf === week);

    const meetingDate = schedulesGetMeetingDate({
      week,
      meeting,
      dataView,
    });

    let title = '';

    if (meetingDate.date) {
      const d = new Date(meetingDate.date);

      if (!Number.isNaN(d.getTime())) {
        const dia = dayNames[d.getDay()] ?? '';
        title = `${dia} ${d.getDate()} de ${monthNames[d.getMonth()]}`.trim();
      }
    }

    // Solo entre semana tiene lectura de la Biblia; el fin de semana se queda
    // con la fecha a secas.
    const subtitle =
      meeting === 'midweek'
        ? (source?.midweek_meeting?.weekly_bible_reading?.[lang] ?? '')
        : '';

    return { title, subtitle };
  }, [week, meeting, dataView, sources, dayNames, monthNames, lang]);
};

export default useMeetingHeadline;
