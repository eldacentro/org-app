import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { currentAPFormState } from '@states/ministry';
import { personsActiveState } from '@states/persons';
import {
  fullnameOptionState,
  userLocalUIDState,
  userMembersDelegateState,
} from '@states/settings';
import { useCurrentUser } from '@hooks/index';
import { buildPersonFullname } from '@utils/common';
import { formatDate } from '@utils/date';
import { personWasPublisherBy } from '@services/app/publisher_status';

/**
 * De quién es la solicitud.
 *
 * El caso: un padre que la manda por su hija. Cambiar el nombre del formulario
 * no servía —la solicitud se registraba igualmente a nombre de quien la
 * enviaba—, y dejar que cualquiera mande la de cualquiera tampoco vale.
 *
 * La lista sale de las PERSONAS DELEGADAS, que es un permiso que la app ya
 * tiene: un administrador las asigna en Cuentas de usuario, y es el mismo que
 * permite entregar su informe de predicación y ver sus asignaciones. Quien
 * puede informar por alguien puede pedir su precursorado auxiliar; quien no,
 * no le sale ni la opción. Y el servidor lo comprueba: no se puede mandar la
 * solicitud de alguien que no esté en esa lista.
 */
const useApplicant = () => {
  const { person } = useCurrentUser();

  const persons = useAtomValue(personsActiveState);
  const delegates = useAtomValue(userMembersDelegateState);
  const userUID = useAtomValue(userLocalUIDState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [form, setForm] = useAtom(currentAPFormState);

  const nombreDe = useMemo(() => {
    return (record: (typeof persons)[number]) =>
      buildPersonFullname(
        record.person_data.person_lastname?.value ?? '',
        record.person_data.person_firstname?.value ?? '',
        fullnameOption
      );
  }, [fullnameOption]);

  const options = useMemo(() => {
    const month = formatDate(new Date(), 'yyyy/MM');

    const result = [
      {
        person_uid: userUID,
        name: person ? nombreDe(person) : '',
        self: true,
      },
    ];

    for (const uid of delegates) {
      if (uid === userUID) continue;

      const record = persons.find((item) => item.person_uid === uid);

      if (!record) continue;

      // Publicador: a quien no lo es no se le puede pedir el precursorado. Es
      // la misma comprobación que usan los informes delegados.
      if (!personWasPublisherBy(record, month)) continue;

      result.push({ person_uid: uid, name: nombreDe(record), self: false });
    }

    return result;
  }, [delegates, persons, userUID, person, nombreDe]);

  const value = useMemo(() => {
    const elegido = form.person_uid || userUID;

    return options.some((item) => item.person_uid === elegido)
      ? elegido
      : userUID;
  }, [form.person_uid, userUID, options]);

  const isSelf = value === userUID;

  const handleChange = (person_uid: string) => {
    const elegido = options.find((item) => item.person_uid === person_uid);

    if (!elegido) return;

    setForm((prev) => ({
      ...prev,
      person_uid,
      // El nombre del formulario es la firma, y la firma es de quien pide el
      // precursorado, no de quien rellena. Se puede corregir a mano después.
      name: elegido.name,
    }));
  };

  // Sin nadie delegado no hay nada que elegir, y el desplegable sobra.
  const visible = options.length > 1;

  return { options, value, isSelf, visible, handleChange };
};

export default useApplicant;
