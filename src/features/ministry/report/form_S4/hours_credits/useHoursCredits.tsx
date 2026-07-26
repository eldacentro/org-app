import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppTranslation } from '@hooks/index';
import { FormS4Props } from '../index.types';
import { UserFieldServiceMonthlyReportType } from '@definition/user_field_service_reports';
import {
  congFieldServiceReportSchema,
  delegatedFieldServiceReportSchema,
  userFieldServiceMonthlyReportSchema,
} from '@services/dexie/schema';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { dbUserFieldServiceReportsSave } from '@services/dexie/user_field_service_reports';
import { dbDelegatedFieldServiceReportsSave } from '@services/dexie/delegated_field_service_reports';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { dbFieldServiceReportsSave } from '@services/dexie/cong_field_service_reports';
import { DelegatedFieldServiceReportType } from '@definition/delegated_field_service_reports';
import useMinistryMonthlyRecord from '@features/ministry/hooks/useMinistryMonthlyRecord';
import {
  CreditEntry,
  CreditEntryType,
  creditEntryAdd,
  creditEntryRemove,
} from '@services/app/credit_entries';

const useHoursCredits = ({ month, person_uid, publisher }: FormS4Props) => {
  const { t } = useAppTranslation();

  const fieldRef = useRef<Element>(null);

  const {
    read_only,
    hours_credits,
    isSelf,
    userReport,
    delegatedReport,
    congReport,
    status,
  } = useMinistryMonthlyRecord({
    month,
    person_uid,
    publisher,
  });

  const locked = useMemo(() => {
    if (read_only) return true;

    if (status === 'submitted') return true;

    return false;
  }, [read_only, status]);

  const [hours, setHours] = useState(hours_credits);

  const hoursValidator = async (value: string) => {
    if (!publisher) return true;

    if (!userReport) return true;

    let daily: string;

    if (typeof userReport.report_data.hours.credit === 'number') {
      daily = `${userReport.report_data.hours.credit}:00`;
    }

    daily = userReport.report_data.hours.credit.daily;

    const [hoursDaily, minutesDaily] = daily.split(':').map(Number);
    const [hoursValue, minutesValue] = value.split(':').map(Number);

    const totalDaily = hoursDaily * 60 + (minutesDaily || 0);
    const totalValue = hoursValue * 60 + minutesValue;

    if (totalValue < totalDaily) {
      displaySnackNotification({
        header: t('tr_hoursDecreaseError'),
        message: t('tr_hoursDecreaseErrorDesc'),
        severity: 'error',
      });

      return false;
    }

    return true;
  };

  /**
   * @param nextEntries si se pasa, sustituye el desglose (se usa al quitar una
   * entrada, para que total y desglose no se queden desacompasados).
   */
  const handleHoursChange = async (value: string, nextEntries?: CreditEntry[]) => {
    setHours(value);

    try {
      if (publisher) {
        if (isSelf) {
          let report: UserFieldServiceMonthlyReportType;

          if (!userReport) {
            report = structuredClone(userFieldServiceMonthlyReportSchema);
            report.report_date = month;
          }

          if (userReport) {
            report = structuredClone(userReport);
          }

          if (
            report.report_data.hours.credit['value'] &&
            typeof report.report_data.hours.credit['value'] === 'number'
          ) {
            report.report_data.hours.credit = {
              daily: `${report.report_data.hours.credit['value']}:00`,
              monthly: '',
            };
          }

          const daily = report.report_data.hours.credit.daily;

          const [hoursDaily, minutesDaily] = daily.split(':').map(Number);
          const [hoursValue, minutesValue] = value.split(':').map(Number);

          const totalDaily = hoursDaily * 60 + (minutesDaily || 0);
          const totalValue = hoursValue * 60 + minutesValue;

          const finalValue = totalValue - totalDaily;

          const remains = finalValue % 60;
          const hours = (finalValue - remains) / 60;

          report.report_data.hours.credit.monthly = `${hours}:${String(remains).padStart(2, '0')}`;

          if (nextEntries) report.report_data.hours.credit.entries = nextEntries;

          if (value !== '0:00') {
            report.report_data.shared_ministry = true;
          }

          report.report_data.updatedAt = new Date().toISOString();

          await dbUserFieldServiceReportsSave(report);
        }

        if (!isSelf) {
          let report: DelegatedFieldServiceReportType;

          if (!delegatedReport) {
            report = structuredClone(delegatedFieldServiceReportSchema);
            report.report_id = crypto.randomUUID();
            report.report_data.report_date = month;
            report.report_data.person_uid = person_uid;
          }

          if (delegatedReport) {
            report = structuredClone(delegatedReport);
          }

          if (value !== '0:00') {
            report.report_data.shared_ministry = true;
          }

          report.report_data.hours.credit.monthly = value;

          if (nextEntries) report.report_data.hours.credit.entries = nextEntries;
          report.report_data.updatedAt = new Date().toISOString();

          await dbDelegatedFieldServiceReportsSave(report);
        }
      }

      if (!publisher) {
        let report: CongFieldServiceReportType;

        if (!congReport) {
          report = structuredClone(congFieldServiceReportSchema);
          report.report_id = crypto.randomUUID();
          report.report_data.report_date = month;
          report.report_data.person_uid = person_uid;
        }

        if (congReport) {
          report = structuredClone(congReport);
        }

        report.report_data.shared_ministry = true;
        report.report_data.hours.credit.approved = +value.split(':').at(0);

        if (nextEntries) report.report_data.hours.credit.entries = nextEntries;
        report.report_data.updatedAt = new Date().toISOString();

        await dbFieldServiceReportsSave(report);
      }
    } catch (error) {
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleSelectPreset = async (
    value: number,
    name: string,
    type: CreditEntryType
  ) => {
    try {
      if (publisher) {
        if (isSelf) {
          let report: UserFieldServiceMonthlyReportType;

          if (!userReport) {
            report = structuredClone(userFieldServiceMonthlyReportSchema);
            report.report_date = month;
          }

          if (userReport) {
            report = structuredClone(userReport);
          }

          if (
            report.report_data.hours.credit['value'] &&
            typeof report.report_data.hours.credit['value'] === 'number'
          ) {
            report.report_data.hours.credit = {
              daily: `${report.report_data.hours.credit['value']}:00`,
              monthly: '',
            };
          }

          const monthly = report.report_data.hours.credit.monthly || '';

          const [hoursMonthly, minutesMonthly] = monthly.split(':').map(Number);

          const finalValue =
            hoursMonthly * 60 + (minutesMonthly || 0) + value * 60;

          const remains = finalValue % 60;
          const hours = (finalValue - remains) / 60;

          report.report_data.hours.credit.monthly = `${hours}:${String(remains).padStart(2, '0')}`;

          // El motivo se guarda como entrada del crédito, no pegado al final
          // del comentario: así el secretario puede verlo desglosado y el
          // comentario vuelve a ser lo que es, un sitio para explicarse.
          report.report_data.hours.credit.entries = creditEntryAdd(
            report.report_data.hours.credit.entries,
            { type, hours: value, label: name }
          );
          report.report_data.shared_ministry = true;
          report.report_data.updatedAt = new Date().toISOString();

          await dbUserFieldServiceReportsSave(report);
        }

        if (!isSelf) {
          let report: DelegatedFieldServiceReportType;

          if (!delegatedReport) {
            report = structuredClone(delegatedFieldServiceReportSchema);
            report.report_id = crypto.randomUUID();
            report.report_data.report_date = month;
            report.report_data.person_uid = person_uid;
          }

          if (delegatedReport) {
            report = structuredClone(delegatedReport);
          }

          const monthly = report.report_data.hours.credit.monthly || '';

          const hoursMonthly = +monthly.split(':').at(0);

          const finalValue = hoursMonthly + value;

          report.report_data.hours.credit.monthly = `${finalValue}:00`;

          // El motivo se guarda como entrada del crédito, no pegado al final
          // del comentario: así el secretario puede verlo desglosado y el
          // comentario vuelve a ser lo que es, un sitio para explicarse.
          report.report_data.hours.credit.entries = creditEntryAdd(
            report.report_data.hours.credit.entries,
            { type, hours: value, label: name }
          );
          report.report_data.shared_ministry = true;
          report.report_data.updatedAt = new Date().toISOString();

          await dbDelegatedFieldServiceReportsSave(report);
        }

        displaySnackNotification({
          header: t('tr_ministry'),
          message: t('tr_hoursCreditPresetAddedInfo'),
          severity: 'success',
        });
      }

      if (!publisher) {
        let report: CongFieldServiceReportType;

        if (!congReport) {
          report = structuredClone(congFieldServiceReportSchema);
          report.report_id = crypto.randomUUID();
          report.report_data.report_date = month;
          report.report_data.person_uid = person_uid;
        }

        if (congReport) {
          report = structuredClone(congReport);
        }

        report.report_data.hours.credit.approved += value;

        // Igual que arriba: el motivo va como entrada del crédito.
        report.report_data.hours.credit.entries = creditEntryAdd(
          report.report_data.hours.credit.entries,
          { type, hours: value, label: name }
        );
        report.report_data.shared_ministry = true;
        report.report_data.updatedAt = new Date().toISOString();

        await dbFieldServiceReportsSave(report);
      }
    } catch (error) {
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    setHours(hours_credits);
  }, [hours_credits]);

  // Desglose actual del crédito. Se lee del informe que mande según el caso:
  // el propio, el delegado o el de la congregación.
  const entries = useMemo(() => {
    if (publisher) {
      if (isSelf) return userReport?.report_data.hours.credit?.entries ?? [];

      return delegatedReport?.report_data.hours.credit?.entries ?? [];
    }

    return congReport?.report_data.hours.credit?.entries ?? [];
  }, [publisher, isSelf, userReport, delegatedReport, congReport]);

  /**
   * Quitar una entrada resta también sus horas del total: la lista es la forma
   * de construir ese total, así que dejarlos desacompasados sería mentir.
   */
  const handleRemoveEntry = async (id: string) => {
    const entry = entries.find((record) => record.id === id);

    if (!entry) return;

    const current = +(hours.split(':').at(0) || 0);
    const next = Math.max(0, current - entry.hours);

    await handleHoursChange(`${next}:00`, creditEntryRemove(entries, id));
  };

  return {
    locked,
    hours,
    handleHoursChange,
    hoursValidator,
    fieldRef,
    handleSelectPreset,
    handleRemoveEntry,
    entries,
    isSelf,
  };
};

export default useHoursCredits;
