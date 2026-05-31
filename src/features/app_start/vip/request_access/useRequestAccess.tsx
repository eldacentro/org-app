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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [firstname, setFirstname] = useState(firstnameInitial);
  const [lastname, setLastname] = useState(lastnameInitial);
  const [country, setCountry] = useState<CountryResponseType>(null);
  const [congregation, setCongregation] = useState<CongregationResponseType>(null);

  useEffect(() => {
    let active = true;

    const autoSelectCongregation = async () => {
      try {
        setLoadError(null);

        // 1. Fetch countries from the API
        const { data: countriesData, status: countriesStatus } = await apiFetchCountries();
        if (!active) return;
        if (countriesStatus !== 200 || !Array.isArray(countriesData)) {
          setLoadError(t('error_app_generic-title'));
          return;
        }

        // Find Spain (ESP / ES / Spain / España)
        const spain = countriesData.find(
          (c) =>
            c.countryCode.toUpperCase() === 'ESP' ||
            c.countryCode.toUpperCase() === 'ES' ||
            c.countryName.toLowerCase() === 'españa' ||
            c.countryName.toLowerCase() === 'spain'
        );
        if (!spain) {
          setLoadError("No se pudo encontrar España en la lista de países.");
          return;
        }

        setCountry(spain);

        // 2. Fetch congregations for Spain matching "Elda"
        const { data: congsData, status: congsStatus } = await apiFetchCongregations(
          spain.countryGuid,
          'Elda'
        );
        if (!active) return;
        if (congsStatus !== 200 || !Array.isArray(congsData)) {
          setLoadError("No se pudo cargar la lista de congregaciones.");
          return;
        }

        // Find the correct congregation matching "Elda Centro" or "Elda - Centro"
        const eldaCong = congsData.find(
          (c) => c.congName.toLowerCase().includes('elda')
        );
        if (!eldaCong) {
          setLoadError("No se pudo encontrar la congregación Elda - Centro.");
          return;
        }

        setCongregation(eldaCong);
      } catch (err) {
        console.error('Failed to auto-select congregation:', err);
        setLoadError((err as Error).message || "Error al conectar con el servidor.");
      }
    };

    autoSelectCongregation();

    return () => {
      active = false;
    };
  }, [t]);

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
    submitError,
    handleRequestAccess,
  };
};

export default useRequestAccess;
