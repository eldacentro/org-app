import appDb from '@db/appDb';
import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { saveAs } from 'file-saver';
import { displaySnackNotification } from '@services/states/app';
import { ExportType } from './index.types';
import { getMessageByCode } from '@services/i18n/translation';
import { personsState } from '@states/persons';
import { settingsState } from '@states/settings';
import { branchCongAnalysisState } from '@states/branch_cong_analysis';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { fieldWithLanguageGroupsState } from '@states/field_service_groups';
import { meetingAttendanceState } from '@states/meeting_attendance';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { assignmentState } from '@states/assignment';
import { weekTypeState } from '@states/weekType';
import { userFieldServiceReportsState } from '@states/user_field_service_reports';
import { userBibleStudiesState } from '@states/user_bible_studies';
import { upcomingEventsActiveState } from '@states/upcoming_events';
import { formatDate } from '@utils/date';

const useExport = ({ onClose }: ExportType) => {
  const persons = useAtomValue(personsState);
  const settings = useAtomValue(settingsState);
  const branchCongAnalysis = useAtomValue(branchCongAnalysisState);
  const branchFieldReports = useAtomValue(branchFieldReportsState);
  const congFieldReports = useAtomValue(congFieldServiceReportsState);
  const fieldServiceGroups = useAtomValue(fieldWithLanguageGroupsState);
  const meetingAttendance = useAtomValue(meetingAttendanceState);
  const schedules = useAtomValue(schedulesState);
  const sources = useAtomValue(sourcesState);
  const visitingSpeakers = useAtomValue(visitingSpeakersActiveState);
  const assignments = useAtomValue(assignmentState);
  const weekTypes = useAtomValue(weekTypeState);
  const speakersCongregations = useAtomValue(speakersCongregationsActiveState);
  const userFieldReports = useAtomValue(userFieldServiceReportsState);
  const userBibleStudies = useAtomValue(userBibleStudiesState);
  const upcomingEvents = useAtomValue(upcomingEventsActiveState);

  const [isProcessing, setIsProcessing] = useState(false);

  const filename = useMemo(() => {
    const now = formatDate(new Date(), 'yyyy-MM-dd_HH:mm:ss').replace('_', 'T');

    return `EldaCentro-backup-${now}.json`;
  }, []);

  const handleGetSettings = () => {
    const app_settings = structuredClone(settings);

    app_settings.cong_settings.cong_master_key = undefined;
    app_settings.cong_settings.cong_access_code = undefined;

    return app_settings;
  };

  const handleGetAssignments = () => {
    const assignmentsList = assignments.map((record) => {
      return {
        code: record.code,
        assignment_type_name: record.assignment_type_name.E,
      };
    });

    return assignmentsList;
  };

  const handleGetWeekTypes = () => {
    const weekTypesList = weekTypes.map((record) => {
      return {
        id: record.id,
        week_type_name: record.week_type_name.E,
      };
    });

    return weekTypesList;
  };

  const handleDownload = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // LAS TABLAS QUE FALTABAN, leídas directamente de la base local.
      //
      // Esta lista se escribió a mano y se quedó con los módulos de entonces:
      // faltaban DIEZ. Comprobado sobre una copia real del 2026-08-17 — traía 16
      // tablas y se dejaba fuera Exhibidores, Salidas de predicación,
      // Territorios (las ocho tablas), Departamentos, limpieza, evacuación,
      // responsabilidades, visitas del superintendente y los ajustes de
      // discursos y canciones.
      //
      // No es una incomodidad, es un agujero: quien restaure desde ese fichero
      // pierde esos módulos y no se entera. Y la vía de la copia se usa de
      // verdad — el 2026-08-15 se recuperó de una a una familia entera.
      //
      // Se leen de Dexie y no de los átomos a propósito: varios átomos filtran
      // o derivan (dejan fuera el registro `settings`, que es donde viven los
      // sellos de publicación de Exhibidores y Salidas). Para un archivo hay que
      // guardar la tabla tal cual está.
      //
      // `metadata` se deja FUERA a propósito: son las versiones de
      // sincronización de ESTE dispositivo, no datos de la congregación, y
      // restaurarlas en otro sitio enredaría su sincronización.
      const [
        exhibitors,
        serviceOutings,
        departmentsSchedule,
        limpiezaConfig,
        evacuacionConfig,
        responsabilidades,
        circuitOverseerVisits,
        publicTalksOverride,
        songsOverride,
        delegatedFieldServiceReports,
        territories,
        territoryZones,
        territoryTags,
        territoryAssignments,
        territoryCampaigns,
        territoryNotices,
        territoryRequests,
        territorySettings,
      ] = await Promise.all([
        appDb.exhibitors.toArray(),
        appDb.service_outings.toArray(),
        appDb.departments_schedule.toArray(),
        appDb.limpieza_config.toArray(),
        appDb.evacuacion_config.toArray(),
        appDb.responsabilidades.toArray(),
        appDb.circuit_overseer_visits.toArray(),
        appDb.public_talks_override.toArray(),
        appDb.songs_override.toArray(),
        appDb.delegated_field_service_reports.toArray(),
        appDb.territories.toArray(),
        appDb.territory_zones.toArray(),
        appDb.territory_tags.toArray(),
        appDb.territory_assignments.toArray(),
        appDb.territory_campaigns.toArray(),
        appDb.territory_notices.toArray(),
        appDb.territory_requests.toArray(),
        appDb.territory_settings.toArray(),
      ]);

      const backupData = {
        name: 'Organized',
        exported: new Date().toISOString(),
        version: import.meta.env.PACKAGE_VERSION,
        data: {
          exhibitors,
          service_outings: serviceOutings,
          departments_schedule: departmentsSchedule,
          limpieza_config: limpiezaConfig,
          evacuacion_config: evacuacionConfig,
          responsabilidades,
          circuit_overseer_visits: circuitOverseerVisits,
          public_talks_override: publicTalksOverride,
          songs_override: songsOverride,
          delegated_field_service_reports: delegatedFieldServiceReports,
          territories,
          territory_zones: territoryZones,
          territory_tags: territoryTags,
          territory_assignments: territoryAssignments,
          territory_campaigns: territoryCampaigns,
          territory_notices: territoryNotices,
          territory_requests: territoryRequests,
          territory_settings: territorySettings,
          assignments: handleGetAssignments(),
          app_settings: handleGetSettings(),
          branch_cong_analysis: branchCongAnalysis,
          branch_field_service_reports: branchFieldReports,
          cong_field_service_reports: congFieldReports,
          field_service_groups: fieldServiceGroups,
          meeting_attendance: meetingAttendance,
          persons: persons.filter((record) => !record._deleted.value),
          sched: schedules,
          sources,
          speakers_congregations: speakersCongregations,
          upcoming_events: upcomingEvents,
          user_field_service_reports: userFieldReports.filter(
            (record) => !record.report_data._deleted
          ),
          user_bible_studies: userBibleStudies.filter(
            (record) => !record.person_data._deleted
          ),
          visiting_speakers: visitingSpeakers,
          week_type: handleGetWeekTypes(),
        },
      };

      const prettyJsonData = JSON.stringify(backupData);

      const blob = new Blob([prettyJsonData], { type: 'application/json' });

      saveAs(blob, filename);

      onClose?.();

      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);

      console.error(error);

      displaySnackNotification({
        severity: 'error',
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
      });
    }
  };

  return { filename, isProcessing, handleDownload };
};

export default useExport;
