import { useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { personCurrentDetailsState } from '@states/persons';
import { setPersonCurrentDetails } from '@services/states/persons';
import { formatDate } from '@utils/date';
import { personsFilterActiveTimeAway } from '@services/app/persons';

const useTimeAway = () => {
  const { id } = useParams();
  const isAddPerson = id === undefined;

  const person = useAtomValue(personCurrentDetailsState);

  const activeTimeAway = personsFilterActiveTimeAway(
    person.person_data.timeAway
  );

  const handleAddTimeAway = async () => {
    const newPerson = structuredClone(person);

    const today = formatDate(new Date(), 'yyyy/MM/dd');

    newPerson.person_data.timeAway.push({
      id: crypto.randomUUID(),
      _deleted: false,
      updatedAt: new Date().toISOString(),
      start_date: today,
      // Nace como "un solo día", NO sin fecha de vuelta. Naciendo abierta,
      // quien solo quería apuntar un día se dejaba la ausencia abierta para
      // siempre sin enterarse, y esa persona salía como ausente en todos los
      // programas futuros. Para dejarla indefinida ahora hay que elegirlo.
      end_date: today,
      comments: '',
    });

    setPersonCurrentDetails(newPerson);
  };

  const handleDeleteTimeAway = async (id: string) => {
    const newPerson = structuredClone(person);

    if (!isAddPerson) {
      const current = newPerson.person_data.timeAway.find(
        (history) => history.id === id
      );

      current._deleted = true;
      current.updatedAt = new Date().toISOString();
    }

    if (isAddPerson) {
      newPerson.person_data.timeAway = newPerson.person_data.timeAway.filter(
        (record) => record.id !== id
      );
    }

    setPersonCurrentDetails(newPerson);
  };

  /**
   * Las DOS fechas se guardan de una vez, nunca uno detrás de otro.
   *
   * Cada manejador clona `person` tal y como estaba en el render, así que dos
   * llamadas seguidas en el mismo evento parten las dos del mismo punto: la
   * segunda pisa a la primera y el primer cambio se pierde. Cambiar la fecha
   * de salida de una ausencia de un día llegaba a guardar la vuelta nueva con
   * la salida vieja — un periodo invertido que `personIsAway` no encuentra
   * nunca, así que esa persona dejaba de salir como ausente sin avisar.
   */
  const handleDatesChange = async (
    id: string,
    start: Date,
    end: Date | null
  ) => {
    if (!start || Number.isNaN(start.getTime())) return;

    const newPerson = structuredClone(person);

    const current = newPerson.person_data.timeAway.find(
      (history) => history.id === id
    );

    if (!current) return;

    current.start_date = formatDate(start, 'yyyy/MM/dd');
    current.end_date = end === null ? null : formatDate(end, 'yyyy/MM/dd');
    current.updatedAt = new Date().toISOString();

    setPersonCurrentDetails(newPerson);
  };

  const handleCommentsChange = async (id: string, value: string) => {
    const newPerson = structuredClone(person);

    const current = newPerson.person_data.timeAway.find(
      (history) => history.id === id
    );

    current.comments = value;
    current.updatedAt = new Date().toISOString();

    setPersonCurrentDetails(newPerson);
  };

  return {
    handleAddTimeAway,
    activeTimeAway,
    handleDeleteTimeAway,
    handleDatesChange,
    handleCommentsChange,
  };
};

export default useTimeAway;
