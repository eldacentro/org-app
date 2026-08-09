import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { personsState, personsTrashState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { purgePersonsForever } from '@services/app/persons_trash';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { IconCheckCircle, IconError } from '@components/icons';
import { buildPersonFullname } from '@utils/common';
import { MESES_ES } from '@utils/nombres_fecha';

/**
 * «1 de agosto de 2026, 20:41».
 *
 * Con los meses de la casa y no con `toLocaleDateString`, que se va al idioma
 * del NAVEGADOR: en un Chrome en inglés saldría «August 1» dentro de una frase
 * en español. La hora entra porque en una papelera la pregunta suele ser «¿esto
 * fue antes o después de lo otro?», y dos borrados del mismo día sin hora no se
 * pueden ordenar a ojo.
 */
export const formatDeletedAt = (value: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const hora = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;

  return `${date.getDate()} de ${
    MESES_ES[date.getMonth()]
  } de ${date.getFullYear()}, ${hora}`;
};

const useTrash = () => {
  const { t } = useAppTranslation();

  // Borrar para siempre es de administrador, aunque la papelera la vea
  // cualquier editor de personas. Devolver a alguien se puede deshacer
  // volviéndolo a borrar; esto no se puede deshacer de ninguna manera.
  const { isAdmin } = useCurrentUser();

  const entries = useAtomValue(personsTrashState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [isEmptying, setIsEmptying] = useState(false);

  /**
   * El nombre de quien borró, resuelto desde su `person_uid`.
   *
   * Se mira sobre `personsState` en crudo —con los borrados dentro— porque
   * quien borró a alguien puede estar él mismo en la papelera, y ahí la
   * respuesta sigue siendo útil.
   */
  const resolveName = useMemo(() => {
    const byUid = new Map(persons.map((person) => [person.person_uid, person]));

    return (uid: string) => {
      if (!uid) return '';

      const person = byUid.get(uid);

      if (!person) return '';

      return buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      );
    };
  }, [persons, fullnameOption]);

  const totalReports = useMemo(
    () =>
      entries.reduce(
        (total, entry) => total + entry.reportsAlive + entry.reportsDeleted,
        0
      ),
    [entries]
  );

  const handleEmptyOpen = () => setIsEmptying(true);

  const handleEmptyClose = () => setIsEmptying(false);

  const handleEmptyConfirm = async () => {
    try {
      // Por IDENTIFICADOR, y solo los que la pantalla está enseñando: dentro
      // de un grupo de idioma la papelera está acotada a ese grupo, y vaciar
      // «lo que se ve» no puede llevarse por delante lo que no se ve.
      const result = await purgePersonsForever(
        entries.map((entry) => entry.person.person_uid)
      );

      setIsEmptying(false);

      displaySnackNotification({
        header: t('tr_trashEmptied'),
        message:
          result.persons === 1
            ? t('tr_trashEmptiedDescOne')
            : t('tr_trashEmptiedDesc', { count: result.persons }),
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      setIsEmptying(false);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  return {
    entries,
    resolveName,
    fullnameOption,
    canPurge: isAdmin,
    totalReports,
    isEmptying,
    handleEmptyOpen,
    handleEmptyClose,
    handleEmptyConfirm,
  };
};

export default useTrash;
