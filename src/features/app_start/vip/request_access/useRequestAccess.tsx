import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { CongregationResponseType, CountryResponseType } from '@definition/api';
import { firstnameState, lastnameState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { apiUserJoinCongregation } from '@services/api/user';
import { userSignOut } from '@services/firebase/auth';

const useRequestAccess = () => {
  const { t } = useAppTranslation();

  const firstnameInitial = useAtomValue(firstnameState);
  const lastnameInitial = useAtomValue(lastnameState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        header: t('error_app_generic-title'),
        message: t('tr_fillRequiredField'),
        severity: 'error',
      });
      return;
    }

    if (!country || !congregation) {
      displaySnackNotification({
        header: t('error_app_generic-title'),
        message: t('tr_requestNotReadyYet'),
        severity: 'error',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setSubmitError(null);

      const result = await apiUserJoinCongregation({
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

  // "Actualizar": reintenta el login recargando. Si el admin ya concedió acceso
  // (o se auto-aprobó por email), el arranque recogerá la congregación y entrará.
  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await userSignOut();
    } catch (error) {
      console.error(error);
    } finally {
      window.location.reload();
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
    isRefreshing,
    requestSent,
    loadError,
    setLoadError,
    submitError,
    handleRequestAccess,
    handleRefresh,
    handleSignOut,
  };
};

export default useRequestAccess;
