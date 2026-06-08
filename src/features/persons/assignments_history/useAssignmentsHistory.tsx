import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { assignmentsHistoryState, schedulesState } from '@states/schedules';
import { schedulesBuildHistoryList } from '@services/app/schedules';
import { setAssignmentsHistory } from '@services/states/schedules';

const useAssignmentsHistory = () => {
  const { id } = useParams();

  const history = useAtomValue(assignmentsHistoryState);
  // Suscribirse a schedulesState para reconstruir el historial cuando cambien los datos
  const schedules = useAtomValue(schedulesState);

  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fresh = schedulesBuildHistoryList();
    setAssignmentsHistory(fresh);
  }, [schedules]);

  const assignmentsHistory = history.filter(
    (record) => record.assignment.person === id
  );

  const handleToggleExpand = () => setExpanded((prev) => !prev);

  return { expanded, handleToggleExpand, assignmentsHistory };
};

export default useAssignmentsHistory;
