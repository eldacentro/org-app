/*
This file will be the entry to get the live update from IndexedDb using dexie hooks
*/

import { PropsWithChildren, useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import { isDbReadyState } from '@states/app';
import useIndexedDb from './useIndexedDb';
import DbRecoveryScreen from '@features/app_start/shared/db_recovery';

// On a healthy device the local DB opens in milliseconds and doesn't touch the
// network, so if it still isn't ready after this long the open has genuinely
// hung (a broken/locked IndexedDB) rather than just being slow — safe to offer
// recovery without false positives from slow connections.
const DB_READY_WATCHDOG_MS = 15000;

const DatabaseWrapper = ({ children }: PropsWithChildren) => {
  const setIsDbReady = useSetAtom(isDbReadyState);
  const [showRecovery, setShowRecovery] = useState(false);

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
    loadResponsabilidades,
    loadCircuitVisits,
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
      loadResponsabilidades();
      loadCircuitVisits();
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
    loadResponsabilidades,
    loadCircuitVisits,
    loadAssignmentsHistory,
  ]);

  useEffect(() => {
    if (isSettingsReady) {
      setIsDbReady(true);
    }
  }, [isSettingsReady, setIsDbReady]);

  // Watchdog: if the DB never becomes ready, the app would otherwise sit on
  // the loading logo forever (useLiveQuery silently never resolves on a failed
  // open). Surface a one-tap repair screen instead — see DbRecoveryScreen.
  useEffect(() => {
    if (isSettingsReady) {
      setShowRecovery(false);
      return;
    }

    const timer = setTimeout(() => setShowRecovery(true), DB_READY_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [isSettingsReady]);

  return (
    <>
      {children}
      {showRecovery && <DbRecoveryScreen />}
    </>
  );
};

export default DatabaseWrapper;
