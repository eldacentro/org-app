import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { isOnlineState } from '@states/app';
import {
  CongregationResponseType,
  CountryResponseType,
  IncomingCongregationResponseType,
} from '@definition/api';
import { removeSecondsFromTime } from '@utils/date';
import { isTest } from '@constants/index';
import { congNameState } from '@states/settings';
import { weekdayFromApi } from '@services/app/meeting_month';
import { apiJwCongregationNumberGet } from '@services/api/app';

const useOffline = (
  onCongregationChange: (value: IncomingCongregationResponseType) => void
) => {
  const isOnline = useAtomValue(isOnlineState);
  const congName = useAtomValue(congNameState);

  const [congNameTmp, setCongNameTmp] = useState('');
  const [congNumberTmp, setCongNumberTmp] = useState('');
  const [congCircuitTmp, setCongCircuitTmp] = useState('');
  const [country, setCountry] = useState<CountryResponseType>(null);
  const [overrideOnline, setOverrideOnline] = useState(false);

  const showOnlineInput = !isTest && isOnline && !overrideOnline;

  const handleSelectCongregation = (value: CongregationResponseType) => {
    if (value === null) {
      onCongregationChange(null);
      return;
    }

    const obj: IncomingCongregationResponseType = {
      cong_circuit: value.circuit,
      cong_location: { address: value.address, ...value.location },
      cong_name: value.congName,
      cong_id: '',
      cong_number: '',
      country_code: country?.countryCode,
      midweek_meeting: {
        weekday: { value: weekdayFromApi(value.midweekMeetingTime?.weekday) },
        time: { value: removeSecondsFromTime(value.midweekMeetingTime.time) },
      },
      weekend_meeting: {
        weekday: { value: weekdayFromApi(value.weekendMeetingTime?.weekday) },
        time: { value: removeSecondsFromTime(value.weekendMeetingTime.time) },
      },
    };

    onCongregationChange(obj);

    // Y a por el número, que el buscador no lo trae y jw.org sí. Se pide con el
    // identificador que ya viene en el resultado —es el mismo que usa jw.org—,
    // así que no hay que emparejar nombres parecidos.
    //
    // Va aparte y no se espera: la congregación ya está elegida y se puede
    // seguir rellenando el resto mientras tanto. Si jw.org no contesta, se
    // queda sin número y se escribe a mano, que es lo de siempre; por eso el
    // fallo se traga en silencio en vez de interrumpir con un aviso.
    if (value.congGuid) {
      apiJwCongregationNumberGet(value.congGuid)
        .then((numero) => {
          if (!numero) return;

          onCongregationChange({ ...obj, cong_number: numero });
        })
        .catch(() => undefined);
    }
  };

  const handleCongNameChange = (value: string) => setCongNameTmp(value);

  const handleCongNumberChange = (value: string) => setCongNumberTmp(value);

  const handleCongCircuitChange = (value: string) => setCongCircuitTmp(value);

  const handleCountryChange = (value: CountryResponseType) => setCountry(value);

  const handleCongSearchOverride = (value: string) => {
    setCongNameTmp(value);
    setOverrideOnline(true);
  };

  useEffect(() => {
    if (!showOnlineInput) {
      if (
        congNameTmp.length > 0 &&
        congNumberTmp.length > 0 &&
        congCircuitTmp.length > 0
      ) {
        const dataCong: IncomingCongregationResponseType = {
          cong_name: congNameTmp,
          cong_id: '',
          country_code: '',
          // El número que se acaba de escribir. Antes se pedía aquí, se exigía
          // para poder continuar... y se tiraba: el objeto no lo llevaba. Por
          // eso las congregaciones añadidas a mano salían sin número.
          cong_number: congNumberTmp,
          cong_circuit: congCircuitTmp,
          cong_location: { address: '', lat: 0, lng: 0 },
          midweek_meeting: { weekday: { value: 2 }, time: { value: '18:00' } },
          weekend_meeting: { weekday: { value: 6 }, time: { value: '9:00' } },
        };

        onCongregationChange(dataCong);
      } else {
        onCongregationChange(null);
      }
    }
  }, [
    congNameTmp,
    congNumberTmp,
    congCircuitTmp,
    onCongregationChange,
    showOnlineInput,
  ]);

  return {
    country,
    handleSelectCongregation,
    handleCongNameChange,
    handleCongNumberChange,
    handleCongCircuitChange,
    congNameTmp,
    congNumberTmp,
    congCircuitTmp,
    handleCountryChange,
    handleCongSearchOverride,
    showOnlineInput,
    congName,
  };
};

export default useOffline;
