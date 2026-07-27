import { useMemo } from 'react';
import { dbPersonsSave } from '@services/dexie/persons';
import { personsFilterActiveTimeAway } from '@services/app/persons';
import { formatDate } from '@utils/date';
import useCurrentUser from '@hooks/useCurrentUser';

const useUserTimeAway = () => {
  const { person } = useCurrentUser();

  const allRecords = useMemo(() => {
    return personsFilterActiveTimeAway(person.person_data.timeAway);
  }, [person]);

  const handleAdd = async () => {
    const newPerson = structuredClone(person);

    const today = formatDate(new Date(), 'yyyy/MM/dd');

    newPerson.person_data.timeAway.push({
      id: crypto.randomUUID(),
      _deleted: false,
      updatedAt: new Date().toISOString(),
      start_date: today,
      // Nace como "un solo día", NO sin fecha de vuelta: quien solo quería
      // apuntar un día se dejaba la ausencia abierta para siempre sin
      // enterarse. Para dejarla indefinida hay que elegirlo a propósito.
      end_date: today,
      comments: '',
    });

    await dbPersonsSave(newPerson);
  };

  /**
   * Las DOS fechas de una vez. Aquí importa el doble que en la ficha: cada
   * manejador guardaba en Dexie por su cuenta, así que dos llamadas seguidas
   * en el mismo evento eran dos escrituras que partían del mismo punto — la
   * segunda pisaba a la primera y lo guardado (un periodo invertido) se
   * sincronizaba a toda la congregación.
   */
  const handleDatesChange = async (
    id: string,
    start: Date,
    end: Date | null
  ) => {
    if (!start || Number.isNaN(start.getTime())) return;

    const newPerson = structuredClone(person);

    const item = newPerson.person_data.timeAway.find(
      (record) => record.id === id
    );

    if (!item) return;

    item.updatedAt = new Date().toISOString();
    item.start_date = formatDate(start, 'yyyy/MM/dd');
    item.end_date = end === null ? null : formatDate(end, 'yyyy/MM/dd');

    await dbPersonsSave(newPerson);
  };

  const handleCommentsChange = async (id: string, value: string) => {
    const newPerson = structuredClone(person);

    const item = newPerson.person_data.timeAway.find(
      (record) => record.id === id
    );
    item.updatedAt = new Date().toISOString();
    item.comments = value;

    await dbPersonsSave(newPerson);
  };

  const handleDelete = async (id: string) => {
    const newPerson = structuredClone(person);

    const item = newPerson.person_data.timeAway.find(
      (record) => record.id === id
    );

    item.updatedAt = new Date().toISOString();
    item._deleted = true;

    await dbPersonsSave(newPerson);
  };

  return {
    allRecords,
    handleAdd,
    handleDatesChange,
    handleCommentsChange,
    handleDelete,
  };
};

export default useUserTimeAway;
