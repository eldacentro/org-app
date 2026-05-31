import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { CongregationResponseType, CountryResponseType } from '@definition/api';
import { firstnameState, lastnameState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { apiUserJoinCongregation } from '@services/api/user';

const useRequestAccess = () => {
  const { t } = useAppTranslation();

  const firstnameInitial = useAtomValue(firstnameState);
  const lastnameInitial = useAtomValue(lastnameState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [firstname, setFirstname] = useState(firstnameInitial);
  const [lastname, setLastname] = useState(lastnameInitial);
  const [country, setCountry] = useState<CountryResponseType>({
    countryCode: 'ES',
    countryName: 'España',
    countryGuid: '',
  });
  const [congregation, setCongregation] = useState<CongregationResponseType>({
    congGuid: '',
    congName: 'Elda - Centro',
    language: '',
    address: '',
    circuit: '',
    location: { lat: 0, lng: 0 },
    midweekMeetingTime: { weekday: 0, time: '' },
    weekendMeetingTime: { weekday: 0, time: '' },
  });

  const handleRequestAccess = async () => {
    if (requestSent || isProcessing) return;

    if (firstname.trim() === '' || lastname.trim() === '') {
      displaySnackNotification({
        header: t('tr_errorTitle'),
        message: t('tr_fillRequiredField'),
        severity: 'error',
      });
      return;
    }

    try {
      setIsProcessing(true);

      await apiUserJoinCongregation({
        cong_name: congregation.congName,
        country_code: country.countryCode,
        firstname,
        lastname,
      });

      setIsProcessing(false);
      setRequestSent(true);

      displaySnackNotification({
        header: t('tr_requestAccessSent'),
        message: t('tr_requestAccessSentDesc'),
        severity: 'success',
      });
    } catch (error) {
      setIsProcessing(false);

      console.error(error);

      displaySnackNotification({
        header: t('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    firstname,
    setFirstname,
    lastname,
    setLastname,
    setCountry,
    country,
    congregation,
    setCongregation,
    isProcessing,
    handleRequestAccess,
  };
};

export default useRequestAccess;
