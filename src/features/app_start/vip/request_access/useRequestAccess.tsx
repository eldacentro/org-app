import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { CongregationResponseType, CountryResponseType } from '@definition/api';
import { firstnameState, lastnameState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { apiUserJoinCongregation } from '@services/api/user';
import { apiFetchCountries, apiFetchCongregations } from '@services/api/congregation';

const useRequestAccess = () => {
  const { t } = useAppTranslation();

  const firstnameInitial = useAtomValue(firstnameState);
  const lastnameInitial = useAtomValue(lastnameState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [firstname, setFirstname] = useState(firstnameInitial);
  const [lastname, setLastname] = useState(lastnameInitial);
  const [country, setCountry] = useState<CountryResponseType>(null);
  const [congregation, setCongregation] = useState<CongregationResponseType>(null);

  useEffect(() => {
    let active = true;

    const autoSelectCongregation = async () => {
      try {
        // 1. Fetch countries from the API
        const { data: countriesData, status: countriesStatus } = await apiFetchCountries();
        if (!active) return;
        if (countriesStatus !== 200 || !Array.isArray(countriesData)) return;

        // Find Spain (ES)
        const spain = countriesData.find(
          (c) => c.countryCode === 'ES' || c.countryName.toLowerCase() === 'españa'
        );
        if (!spain) return;

        setCountry(spain);

        // 2. Fetch congregations for Spain matching "Elda"
        const { data: congsData, status: congsStatus } = await apiFetchCongregations(
          spain.countryGuid,
          'Elda'
        );
        if (!active) return;
        if (congsStatus !== 200 || !Array.isArray(congsData)) return;

        // Find the correct congregation matching "Elda Centro" or "Elda - Centro"
        const eldaCong = congsData.find(
          (c) => c.congName.toLowerCase().includes('elda')
        );
        if (!eldaCong) return;

        setCongregation(eldaCong);
      } catch (err) {
        console.error('Failed to auto-select congregation:', err);
      }
    };

    autoSelectCongregation();

    return () => {
      active = false;
    };
  }, []);

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
