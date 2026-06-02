/*
This file will be the entry to get the live update from IndexedDb using dexie hooks
*/

import { PropsWithChildren, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { isDbReadyState } from '@states/app';
import useIndexedDb from './useIndexedDb';

const DatabaseWrapper = ({ children }: PropsWithChildren) => {
  const setIsDbReady = useSetAtom(isDbReadyState);

  const {
    isSettingsReady,
    loadSettings,
    loadAssignment,
    loadPersons,
    loadSchedules,
    loadSources,
    loadWeekType,
    loadVisitingSpeakers,
    loadSpeakersCongregations,
    loadMeetingAttendance,
    loadUserFieldServiceReports,
    loadUserBibleStudies,
    loadCongFieldServiceReports,
    loadBranchCongAnalysis,
    loadBranchFieldReports,
    loadFieldGroups,
    loadDbNotifications,
    loadDbDelegatedReports,
    loadUpcomingEvents,
    loadPublicTalks,
    loadSongs,
    loadDeptSchedules,
    loadServiceOutings,
    loadExhibitors,
    loadAssignmentsHistory,
  } = useIndexedDb();

  useEffect(() => {
    const refreshData = async () => {
      loadSongs();
      loadPublicTalks();
      loadSettings();
      loadAssignment();
      loadPersons();
      loadSchedules();
      loadWeekType();
      loadSources();
      loadSpeakersCongregations();
      loadVisitingSpeakers();
      loadMeetingAttendance();
      loadUserBibleStudies();
      loadUserFieldServiceReports();
      loadCongFieldServiceReports();
      loadBranchFieldReports();
      loadBranchCongAnalysis();
      loadFieldGroups();
      loadDbNotifications();
      loadDbDelegatedReports();
      loadUpcomingEvents();
      loadDeptSchedules();
      loadServiceOutings();
      loadExhibitors();
      loadAssignmentsHistory();
    };

    refreshData();
  }, [
    loadSettings,
    loadAssignment,
    loadPersons,
    loadSchedules,
    loadWeekType,
    loadSources,
    loadSpeakersCongregations,
    loadVisitingSpeakers,
    loadMeetingAttendance,
    loadUserFieldServiceReports,
    loadUserBibleStudies,
    loadCongFieldServiceReports,
    loadBranchFieldReports,
    loadBranchCongAnalysis,
    loadFieldGroups,
    loadDbNotifications,
    loadDbDelegatedReports,
    loadUpcomingEvents,
    loadPublicTalks,
    loadSongs,
    loadDeptSchedules,
    loadServiceOutings,
    loadExhibitors,
    loadAssignmentsHistory,
  ]);

  useEffect(() => {
    if (isSettingsReady) {
      setIsDbReady(true);
    }
  }, [isSettingsReady, setIsDbReady]);

  return children;
};

export default DatabaseWrapper;
