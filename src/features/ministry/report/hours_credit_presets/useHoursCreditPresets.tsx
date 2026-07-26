import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  IconDuties,
  IconLanguageCourse,
  IconSchool,
  IconSchoolForEvangelizers,
} from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { CreditEntryType } from '@services/app/credit_entries';

const useHoursCreditPresets = (
  onSelect: (value: number, name: string, type: CreditEntryType) => void
) => {
  const location = useLocation();

  const { t } = useAppTranslation();

  const [presetsOpen, setPresetsOpen] = useState(false);

  const presets = useMemo(() => {
    const list: {
      icon: React.ReactElement;
      name: string;
      value: number;
      type: CreditEntryType;
    }[] = [
      {
        icon: <IconSchool color="var(--black)" />,
        name: t('tr_pioneerSchool'),
        value: 30,
        type: 'pioneer_school' as const,
      },
      {
        icon: <IconSchoolForEvangelizers color="var(--black)" />,
        name: t('tr_SKE'),
        value: 160,
        type: 'ske' as const,
      },
      {
        icon: <IconLanguageCourse color="var(--black)" />,
        name: t('tr_languageCourse'),
        value: 25,
        type: 'language_course' as const,
      },
    ];

    if (location.pathname === '/ministry-report') {
      list.push({
        icon: <IconDuties color="var(--black)" />,
        name: t('tr_theocraticAssignments'),
        value: 8,
        type: 'theocratic_assignments' as const,
      });
    }

    // "Otro" no lleva horas fijas: se piden al elegirlo. Es la vía para lo que
    // no está en la lista (Asamblea regional, contabilidad de un evento…), sin
    // tener que ampliar el menú cada vez que aparece un caso nuevo.
    list.push({
      icon: <IconDuties color="var(--black)" />,
      name: t('tr_eldaCreditOther'),
      value: 0,
      type: 'other' as const,
    });

    return list;
  }, [t, location.pathname]);

  const handleTogglePresets = () => setPresetsOpen((prev) => !prev);

  const handleClosePreset = () => setPresetsOpen(false);

  // "Otro" no se guarda directamente: primero hay que preguntar qué era y
  // cuántas horas fueron.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherLabel, setOtherLabel] = useState('');
  const [otherHours, setOtherHours] = useState('');

  const handlePresetSelected = (
    value: number,
    name: string,
    type: CreditEntryType
  ) => {
    if (type === 'other') {
      setOtherLabel('');
      setOtherHours('');
      setOtherOpen(true);
      return;
    }

    onSelect(value, name, type);
  };

  const handleCancelOther = () => setOtherOpen(false);

  const handleConfirmOther = () => {
    const hours = Number(otherHours);

    if (!otherLabel.trim() || !Number.isFinite(hours) || hours <= 0) return;

    onSelect(hours, otherLabel.trim(), 'other');
    setOtherOpen(false);
  };

  return {
    presetsOpen,
    handleTogglePresets,
    presets,
    handleClosePreset,
    otherOpen,
    otherLabel,
    setOtherLabel,
    otherHours,
    setOtherHours,
    handlePresetSelected,
    handleConfirmOther,
    handleCancelOther,
  };
};

export default useHoursCreditPresets;
