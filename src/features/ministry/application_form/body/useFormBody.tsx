import { useMemo } from 'react';
import { capitalizarPrimera } from '@utils/common';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { monthNamesState } from '@states/app';
import {
  fullnameOptionState,
  JWLangState,
  settingsState,
} from '@states/settings';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import {
  addMonths,
  createArrayFromMonths,
  currentMonthServiceYear,
  formatDate,
} from '@utils/date';
import { AP_HORAS, APHours } from '@definition/ministry';
import {
  horasDeLaSolicitud,
  mesesDe15Horas,
  puedeElegir15Horas,
} from '@services/app/ap_applications';
import { ApplicationFormProps } from '../index.types';

const useFormBody = ({
  application,
  onChange,
  onHoursChange,
}: ApplicationFormProps) => {
  const { t } = useAppTranslation();

  const location = useLocation();

  const { isPublisher, isServiceCommittee } = useCurrentUser();

  const lang = useAtomValue(JWLangState);
  const settings = useAtomValue(settingsState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const months = useAtomValue(monthNamesState);

  const isPublisherAP = useMemo(() => {
    return location.pathname === '/auxiliary-pioneer-application';
  }, [location]);

  const form_readOnly = useMemo(() => {
    return (
      (isPublisherAP && !isPublisher) || (!isPublisherAP && !isServiceCommittee)
    );
  }, [isPublisherAP, isPublisher, isServiceCommittee]);

  const moral_text = useMemo(() => {
    let text = t('tr_pioneerApplicationMoral');

    text = text.replace(
      "href=''",
      `href="https://www.jw.org/finder?wtlocale=${lang}&docid=202013206"`
    );

    return text;
  }, [t, lang]);

  const coordinator = useMemo(() => {
    const id = settings.cong_settings.responsabilities.coordinator;
    const person = persons.find((record) => record.person_uid === id);

    if (!person) return '';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [settings, persons, fullnameOption]);

  const secretary = useMemo(() => {
    const id = settings.cong_settings.responsabilities.secretary;
    const person = persons.find((record) => record.person_uid === id);

    if (!person) return '';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [settings, persons, fullnameOption]);

  const service_overseer = useMemo(() => {
    const id = settings.cong_settings.responsabilities.service;
    const person = persons.find((record) => record.person_uid === id);

    if (!person) return '';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [settings, persons, fullnameOption]);

  const monthOptions = useMemo(() => {
    const thisMonth = currentMonthServiceYear();
    const lastMonth = formatDate(addMonths(`${thisMonth}/01`, 6), 'yyyy/MM');

    const options = createArrayFromMonths(thisMonth, lastMonth);

    const data = options.map((record) => {
      const month = +record.split('/')[1] - 1;

      return { label: capitalizarPrimera(months[month]), value: record };
    });

    return data;
  }, [months]);

  const handleSetDate = (value: Date) => {
    const form = structuredClone(application);
    form.date = value;

    onChange(form);
  };

  const handleSetName = (value: string) => {
    const form = structuredClone(application);
    form.name = value;

    onChange(form);
  };

  const handleSetMonths = (value: string[]) => {
    const form = structuredClone(application);

    if (form.continuous && value.length >= 1) {
      form.months = [value.at(-1)];
    }

    if (!form.continuous) {
      form.months = value.toSorted();
    }

    onChange(ajustarHoras(form));
  };

  const handleFormatMonths = (values: string[]) => {
    const months = values
      .toSorted()
      .map((value) => {
        const month = monthOptions.find((record) => record.value === value);
        return month.label;
      })
      .join(', ');

    return months;
  };

  // Las horas del mes: 30, o 15 en los meses en que la sucursal lo permite.
  // Una solicitud de antes de que existiera el campo son 30 (ver
  // `horasDeLaSolicitud`), así que el desplegable nunca sale en blanco.
  const hours = useMemo(() => horasDeLaSolicitud(application), [application]);

  // Los meses en que se puede con 15 horas los cuadra el comité de servicio en
  // el engranaje de Solicitudes de precursor auxiliar.
  const mesesDe15 = useMemo(
    () => mesesDe15Horas(settings.cong_settings.special_months),
    [settings]
  );

  /**
   * ¿Se enseña el desplegable de horas?
   *
   * Solo si los meses pedidos son de 15 horas — si no, no hay nada que elegir y
   * preguntarlo sería ofrecer algo que no se puede. La excepción es una
   * solicitud que YA pide 15: se enseña igual, porque si después se quita ese
   * mes de la lista, esconder lo que el hermano pidió sería peor que decirlo.
   */
  const showHours = useMemo(
    () => puedeElegir15Horas(application, mesesDe15) || hours === 15,
    [application, mesesDe15, hours]
  );

  /** Las 15 horas dejan de valer al cambiar los meses: se vuelve a 30. */
  const ajustarHoras = (form: typeof application) => {
    if (form.hours === 15 && !puedeElegir15Horas(form, mesesDe15)) {
      form.hours = 30;
    }

    return form;
  };

  const hourOptions = useMemo(
    () => AP_HORAS.map((value) => ({ value, label: `${value} horas` })),
    []
  );

  const handleSetHours = (value: APHours) => {
    const form = structuredClone(application);
    form.hours = value;

    onChange(form);

    // En la solicitud ya enviada no hay botón de guardar: se guarda al elegir.
    onHoursChange?.(value);
  };

  const handleToggleContinuous = (value: boolean) => {
    const form = structuredClone(application);
    form.continuous = value;

    if (value && form.months.length > 1) {
      form.months = [form.months.at(0)];
    }

    onChange(ajustarHoras(form));
  };

  return {
    moral_text,
    coordinator,
    secretary,
    service_overseer,
    handleSetDate,
    application,
    handleSetName,
    monthOptions,
    handleSetMonths,
    handleFormatMonths,
    handleToggleContinuous,
    hours,
    hourOptions,
    handleSetHours,
    showHours,
    form_readOnly,
  };
};

export default useFormBody;
