import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { capitalizarPrimera } from '@utils/common';
import { monthNamesState } from '@states/app';
import { settingsState } from '@states/settings';
import { createArrayFromMonths, currentServiceYear } from '@utils/date';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { IconCheckCircle, IconError } from '@components/icons';

/**
 * Los meses en que el precursorado auxiliar puede hacerse con 15 horas.
 *
 * SE HA MUDADO (2026-09-19). Vivía en Ajustes de congregación → Ministerio,
 * dentro de una lista desplegable llamada «Meses especiales», y desde allí no
 * se entendía para qué era ni quién debía tocarla. Ahora vive en el engranaje
 * de Solicitudes de precursor auxiliar, que es donde se nota: solo en los meses
 * marcados aquí la solicitud deja elegir entre 15 y 30 horas.
 *
 * LO QUE NO SE HA MOVIDO ES EL DATO: se sigue guardando en
 * `cong_settings.special_months`, con la misma forma (un registro por año de
 * servicio). Cambiarlo de sitio habría dejado sin efecto la meta de horas que
 * ya calculan los informes de meses pasados, que lee de ahí.
 */
const useMonths15h = ({ open }: { open: boolean }) => {
  const settings = useAtomValue(settingsState);
  const monthNames = useAtomValue(monthNamesState);

  const currentYear = useMemo(() => currentServiceYear(), []);

  const guardados = settings.cong_settings.special_months;

  // Qué años se pueden ver: el actual, el siguiente —para dejarlo cuadrado
  // antes de que empiece— y el anterior solo si tiene algo, para consultarlo.
  const years = useMemo(() => {
    const previous = String(+currentYear - 1);

    const hasPrevious =
      (guardados ?? []).find(
        (record) => record.year === previous && !record._deleted
      )?.months?.length > 0;

    return [
      ...(hasPrevious ? [previous] : []),
      currentYear,
      String(+currentYear + 1),
    ];
  }, [guardados, currentYear]);

  const [yearIndex, setYearIndex] = useState(() =>
    Math.max(0, years.indexOf(currentYear))
  );

  // El borrador: año → meses marcados. Se guarda al pulsar Guardar, no a cada
  // toque — marcar cuatro meses no son cuatro subidas a toda la congregación.
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const inicial: Record<string, string[]> = {};

    for (const record of guardados ?? []) {
      if (record?._deleted) continue;

      inicial[record.year] = [...(record.months ?? [])].sort();
    }

    setDraft(inicial);
    setYearIndex(Math.max(0, years.indexOf(currentYear)));
    // Solo al abrir: mientras está abierto manda lo que se está tocando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = years[yearIndex] ?? currentYear;

  /** Un año que ya pasó se enseña, pero no se toca. */
  const readOnly = year < currentYear;

  const months = useMemo(() => {
    const desde = `${+year - 1}/09`;
    const hasta = `${year}/08`;

    return createArrayFromMonths(desde, hasta).map((value) => ({
      value,
      label: capitalizarPrimera(monthNames[+value.split('/')[1] - 1]),
      year: +value.split('/')[0],
    }));
  }, [year, monthNames]);

  const selected = draft[year] ?? [];

  const handleToggleMonth = (value: string) => {
    if (readOnly) return;

    setDraft((prev) => {
      const actuales = prev[year] ?? [];
      const nuevos = actuales.includes(value)
        ? actuales.filter((mes) => mes !== value)
        : [...actuales, value].sort();

      return { ...prev, [year]: nuevos };
    });
  };

  const handleClearYear = () => {
    if (readOnly) return;

    setDraft((prev) => ({ ...prev, [year]: [] }));
  };

  const dirty = useMemo(() => {
    const guardadosPorAño: Record<string, string> = {};

    for (const record of guardados ?? []) {
      if (record?._deleted) continue;

      guardadosPorAño[record.year] = [...(record.months ?? [])]
        .sort()
        .join(',');
    }

    return Object.entries(draft).some(
      ([key, value]) =>
        (guardadosPorAño[key] ?? '') !== [...value].sort().join(',')
    );
  }, [draft, guardados]);

  const handleSave = async () => {
    if (saving || !dirty) return;

    setSaving(true);

    try {
      const special = structuredClone(guardados ?? []);

      for (const [key, value] of Object.entries(draft)) {
        // Un año que ya pasó no se reescribe aunque esté en el borrador: se
        // enseña de solo lectura y su fecha tiene que quedarse como estaba.
        if (key < currentYear) continue;

        let registro = special.find((record) => record.year === key);

        if (!registro) {
          special.push({
            _deleted: false,
            months: [],
            updatedAt: '',
            year: key,
          });
          registro = special.find((record) => record.year === key);
        }

        const antes = [...(registro.months ?? [])].sort().join(',');

        if (antes === [...value].sort().join(',')) continue;

        registro.months = [...value].sort();
        registro._deleted = false;
        registro.updatedAt = new Date().toISOString();
      }

      await dbAppSettingsUpdate({
        'cong_settings.special_months': special,
      });

      displaySnackNotification({
        header: 'Hecho',
        message: 'Guardados los meses de 15 horas.',
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });

      return true;
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });

      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    years,
    yearIndex,
    setYearIndex,
    year,
    months,
    selected,
    readOnly,
    dirty,
    saving,
    handleToggleMonth,
    handleClearYear,
    handleSave,
  };
};

export default useMonths15h;
