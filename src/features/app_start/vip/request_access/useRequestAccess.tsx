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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [firstname, setFirstname] = useState(firstnameInitial);
  const [lastname, setLastname] = useState(lastnameInitial);
  const [country, setCountry] = useState<CountryResponseType>({
    countryCode: 'ES',
    countryName: 'España',
    countryGuid: 'ES',
  });
  const [congregation, setCongregation] = useState<CongregationResponseType>({
    congName: 'Elda - Centro',
    congGuid: '',
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

    if (!country || !congregation) {
      displaySnackNotification({
        header: t('tr_errorTitle'),
        message: "Cargando datos de la congregación. Por favor, espera unos segundos e inténtalo de nuevo.",
        severity: 'warning',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setSubmitError(null);

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

      const errorMessage = getMessageByCode((error as Error).message) || (error as Error).message;
      setSubmitError(errorMessage);
      console.error(error);

      displaySnackNotification({
        header: t('error_app_generic-title'),
        message: errorMessage,
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
    requestSent,
    loadError,
    setLoadError,
    submitError,
    handleRequestAccess,
  };
};

export default useRequestAccess;
