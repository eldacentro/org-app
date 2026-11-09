import { useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import {
  branchSelectedReportState,
  branchSelectedYearState,
} from '@states/branch_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { branchCongAnalysisState } from '@states/branch_cong_analysis';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { BranchFieldServiceReportType } from '@definition/branch_field_service_reports';
import {
  SchemaBranchCongAnalysis,
  SchemaBranchFieldServiceReport,
} from '@services/dexie/schema';
import { dbBranchFieldReportSave } from '@services/dexie/branch_field_service_reports';
import { BranchCongAnalysisType } from '@definition/branch_cong_analysis';
import { dbBranchCongAnalysisSave } from '@services/dexie/branch_cong_analysis';
import usePersons from '@features/persons/hooks/usePersons';
import useYearlyAttendance from '@features/reports/meeting_attendance/hooks/useYearlyAttendance';
import useReportYearly from '@features/reports/hooks/useReportYearly';
import {
  lateReportsSentWith,
  normalizeLegacyLate,
  recordOnlyLate,
  s1Differs,
  unverifiedLateReports,
} from '@services/app/late_reports';
import {
  dbFieldServiceReportsGetActive,
  dbFieldServiceReportsSave,
} from '@services/dexie/cong_field_service_reports';
import { S1LateReport } from './index.types';
import useS1Live from '../useS1Live';

const useReportSection = () => {
  const { getPublishersActive, getPublishersInactiveYears } = usePersons();

  const { getPublishersReactivatedYears } = useReportYearly();

  const { month, congReports, persons, categoryOf, compute } = useS1Live();

  const report = useAtomValue(branchSelectedReportState);
  const year = useAtomValue(branchSelectedYearState);
  const fieldReports = useAtomValue(branchFieldReportsState);
  const congAnalysis = useAtomValue(branchCongAnalysisState);

  const { getMeetingAverage } = useYearlyAttendance(year);

  // Un toque en un botón de la lista mientras el anterior todavía se está
  // guardando regeneraría el S-1 con datos de antes del primero.
  const busyRef = useRef(false);

  const fieldReport = useMemo(() => {
    if (report !== 'S-1') return;

    return fieldReports.find((record) => record.report_date === month);
  }, [report, fieldReports, month]);

  const analysisReport = useMemo(() => {
    if (report !== 'S-10') return;

    return congAnalysis.find((record) => record.report_date === year);
  }, [report, congAnalysis, year]);

  const generated = useMemo(() => {
    if (report === 'S-1') {
      return fieldReport ? true : false;
    }

    if (report === 'S-10') {
      return analysisReport ? true : false;
    }

    return false;
  }, [report, fieldReport, analysisReport]);

  const submitted = useMemo(() => {
    if (report === 'S-1') {
      if (!fieldReport) return false;

      return fieldReport.report_data.submitted;
    }

    if (report === 'S-10') {
      if (!analysisReport) return false;

      return analysisReport.report_data.submitted;
    }

    return false;
  }, [report, fieldReport, analysisReport]);

  const live = compute();

  /**
   * El S-1 guardado ya no dice lo que dirían los datos de ahora: hay que
   * regenerarlo antes de enviarlo. Ver `s1Differs`.
   */
  const stale =
    report === 'S-1' &&
    generated &&
    !submitted &&
    s1Differs(fieldReport?.report_data, live.data);

  /**
   * Los atrasados que este S-1 suma, para enseñarlos con nombre y mes.
   *
   * Antes se sumaban sin decir nada, y el secretario solo veía que los números
   * no cuadraban con los de TsWin. Ahora salen en la pantalla del informe, y
   * cada uno se puede apartar como «solo para su tarjeta» si es de cuando la
   * persona estaba en otra congregación.
   *
   * Con el S-1 ya enviado son los que salieron con él (y ya no se tocan).
   */
  const lateReports: S1LateReport[] = (() => {
    if (report !== 'S-1' || !month) return [];

    if (!submitted) {
      return live.result.late.map((entry) => ({
        report: entry.report,
        person: entry.person,
        category: entry.category,
      }));
    }

    const result: S1LateReport[] = [];

    for (const record of lateReportsSentWith(month, congReports)) {
      const person = persons.find(
        (person) => person.person_uid === record.report_data.person_uid
      );

      if (!person) continue;

      const category = categoryOf(person, record.report_data.report_date);

      if (category === 'FMF' || category === 'FS') continue;

      result.push({
        report: record,
        person,
        category:
          category === 'AP' ? 'APs' : category === 'FR' ? 'FRs' : 'publishers',
      });
    }

    return result;
  })();

  /**
   * Atrasados de meses anteriores que todavía nadie ha verificado (los manda
   * el propio publicador desde su móvil). No se suman hasta verificarlos, y
   * antes no salían en ningún sitio con el mes ya enviado.
   */
  const unverifiedLate: S1LateReport[] = (() => {
    if (report !== 'S-1' || !month || submitted) return [];

    const result: S1LateReport[] = [];

    for (const record of unverifiedLateReports(month, congReports)) {
      const person = persons.find(
        (person) => person.person_uid === record.report_data.person_uid
      );

      if (!person) continue;

      const category = categoryOf(person, record.report_data.report_date);

      if (category === 'FMF' || category === 'FS') continue;

      result.push({
        report: record,
        person,
        category:
          category === 'AP' ? 'APs' : category === 'FR' ? 'FRs' : 'publishers',
      });
    }

    return result;
  })();

  const handleGenerateS1 = async (reports?: CongFieldServiceReportType[]) => {
    const { data } = compute(reports);

    let branchReport: BranchFieldServiceReportType;

    if (!fieldReport) {
      branchReport = structuredClone(SchemaBranchFieldServiceReport);
      branchReport.report_date = month;
    }

    if (fieldReport) {
      branchReport = structuredClone(fieldReport);
    }

    branchReport.report_data.publishers_active = data.publishers_active;
    branchReport.report_data.weekend_meeting_average =
      data.weekend_meeting_average;
    branchReport.report_data.publishers = data.publishers;
    branchReport.report_data.APs = data.APs;
    branchReport.report_data.FRs = data.FRs;
    branchReport.report_data.updatedAt = new Date().toISOString();

    await dbBranchFieldReportSave(branchReport);
  };

  /**
   * Cambia un atrasado desde la lista del S-1 y, si el S-1 ya está generado,
   * lo regenera en el acto con los informes recién leídos de la base —el estado
   * de la app todavía no se ha enterado del cambio en este instante—, para que
   * los números de la pantalla no se queden viejos.
   */
  const changeLate = async (
    target: CongFieldServiceReportType,
    change: (report: CongFieldServiceReportType) => void
  ) => {
    if (submitted || busyRef.current) return;

    busyRef.current = true;

    try {
      const updated = structuredClone(target);
      change(updated);
      updated.report_data.updatedAt = new Date().toISOString();

      // Ninguno de los dos cambios es meter el informe: quien lo metió sigue
      // siendo el autor.
      await dbFieldServiceReportsSave(updated, { keepAuthor: true });

      if (fieldReport) {
        await handleGenerateS1(await dbFieldServiceReportsGetActive());
      }
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    } finally {
      busyRef.current = false;
    }
  };

  /** Lo aparta: queda en su tarjeta, pero no se suma a ningún S-1. */
  const handleMarkRecordOnly = (target: CongFieldServiceReportType) =>
    changeLate(target, (report) => {
      report.report_data.late = recordOnlyLate(report.report_data.report_date);
    });

  /** Lo verifica: desde ese momento se suma a este S-1. */
  const handleVerifyLate = (target: CongFieldServiceReportType) =>
    changeLate(target, (report) => {
      report.report_data.status = 'confirmed';
      report.report_data.late = normalizeLegacyLate(report.report_data.late);
    });

  const handleGenerateS10 = async () => {
    // create analysis report
    let analysis: BranchCongAnalysisType;

    if (!analysisReport) {
      analysis = structuredClone(SchemaBranchCongAnalysis);
      analysis.report_date = year;
    }

    if (analysisReport) {
      analysis = structuredClone(analysisReport);
    }

    // meeting
    analysis.report_data.meeting_average.midweek = getMeetingAverage('midweek');
    analysis.report_data.meeting_average.weekend = getMeetingAverage('weekend');

    // field service
    const lastMonth = `${year}/08`;
    analysis.report_data.publishers.active =
      getPublishersActive(lastMonth).length;
    analysis.report_data.publishers.inactive =
      getPublishersInactiveYears(year).length;
    analysis.report_data.publishers.reactivated =
      getPublishersReactivatedYears(year).length;

    analysis.report_data.updatedAt = new Date().toISOString();

    await dbBranchCongAnalysisSave(analysis);
  };

  const handleGenerate = async () => {
    try {
      if (report === 'S-1') {
        await handleGenerateS1();
      }

      if (report === 'S-10') {
        await handleGenerateS10();
      }
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    generated,
    submitted,
    stale,
    handleGenerate,
    lateReports,
    unverifiedLate,
    handleMarkRecordOnly,
    handleVerifyLate,
  };
};

export default useReportSection;
