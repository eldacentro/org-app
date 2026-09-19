import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { applicationsState, personsState } from '@states/persons';
import { monthNamesState } from '@states/app';
import {
  horasDeLaSolicitud,
  mesesDeLaSolicitud,
  solicitudesRepetidas,
} from '@services/app/ap_applications';
import { buildPersonFullname } from '@utils/common';
import { fullnameOptionState, shortDateFormatState } from '@states/settings';
import { ApplicationProps } from './index.types';
import { formatDate } from '@utils/date';

const useApplication = ({ application }: ApplicationProps) => {
  const navigate = useNavigate();

  const { t } = useAppTranslation();

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const shortDateFormat = useAtomValue(shortDateFormatState);
  const monthNames = useAtomValue(monthNamesState);
  const applications = useAtomValue(applicationsState);

  const person = useMemo(() => {
    return persons.find(
      (record) => record.person_uid === application.person_uid
    );
  }, [persons, application.person_uid]);

  const name = useMemo(() => {
    // Una solicitud cuyo solicitante ya no está en la lista tiene que seguir
    // viéndose y poder abrirse — sin nombre no habría manera de distinguirla
    // ni de retirarla.
    if (!person) return 'Publicador desconocido';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [person, fullnameOption]);

  const isFemale = useMemo(() => {
    if (!person) return false;

    return person.person_data.female.value;
  }, [person]);

  const submitted = useMemo(() => {
    const date = formatDate(new Date(application.submitted), shortDateFormat);

    return t('tr_submittedOnDate', { date });
  }, [application.submitted, t, shortDateFormat]);

  // «Octubre y noviembre · 30 h». Los meses y las horas van en la MISMA
  // etiqueta porque son la misma decisión, y porque cuatro distintivos en una
  // tarjeta ya no se leen de un vistazo, que es para lo que está la lista.
  const months = useMemo(() => {
    const texto = mesesDeLaSolicitud(application, monthNames);
    const horas = `${horasDeLaSolicitud(application)} h`;

    if (texto.length === 0) return horas;

    return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} · ${horas}`;
  }, [application, monthNames]);

  // Se mira contra TODAS las solicitudes, no solo las de esta pestaña: repetir
  // una que ya está aprobada es igual de repetida.
  const repeated = useMemo(
    () => solicitudesRepetidas(applications).has(application.request_id),
    [applications, application.request_id]
  );

  const handleOpen = () => {
    navigate(`/pioneer-applications/${application.request_id}`);
  };

  return { name, isFemale, submitted, months, repeated, handleOpen };
};

export default useApplication;
