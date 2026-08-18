import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personsState } from '@states/persons';
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

  const handleOpen = () => {
    navigate(`/pioneer-applications/${application.request_id}`);
  };

  return { name, isFemale, submitted, handleOpen };
};

export default useApplication;
