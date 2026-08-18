import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useParams } from 'react-router';
import { applicationsState, personsState } from '@states/persons';
import { applicationsSeenState } from '@states/notification';
import { markApplicationSeen } from '@services/app/applications_seen';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';

const useApplicationDetails = () => {
  const { id } = useParams();

  const applications = useAtomValue(applicationsState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const setSeen = useSetAtom(applicationsSeenState);

  const application = useMemo(() => {
    return applications.find((record) => record.request_id === id);
  }, [id, applications]);

  // Abrirla es lo que la retira de Notificaciones — aunque siga pendiente de
  // aprobar. Se marca aquí y no en el botón del aviso para que valga por
  // cualquier camino: desde la campana, desde la lista de la página o
  // entrando directamente por la dirección.
  useEffect(() => {
    if (!application) return;

    setSeen(markApplicationSeen(application.request_id));
  }, [application, setSeen]);

  const name = useMemo(() => {
    if (!application) return '';

    const person = persons.find(
      (record) => record.person_uid === application.person_uid
    );

    if (!person) return 'Publicador desconocido';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [application, persons, fullnameOption]);

  // notFound se expone para que el componente renderice el <Navigate>
  return { name, notFound: !application };
};

export default useApplicationDetails;
