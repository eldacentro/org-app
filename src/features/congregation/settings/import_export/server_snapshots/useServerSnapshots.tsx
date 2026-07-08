import { useEffect, useMemo, useState } from 'react';
import { useAppTranslation } from '@hooks/index';
import {
  apiCongregationSnapshotsGet,
  apiCongregationSnapshotRestore,
} from '@services/api/congregation';
import { displaySnackNotification } from '@services/states/app';
import { IconCheckCircle, IconInfo } from '@components/icons';

// Mismas tablas que respalda el backend (ver createDailySnapshot). El label
// es lo que ve el usuario; la clave es la que espera el endpoint.
export const SNAPSHOT_TABLE_LABELS: Record<string, string> = {
  schedules: 'Programas de reuniones',
  departments_schedule: 'Programas de departamentos',
  sources: 'Fuentes de reunión',
  visiting_speakers: 'Oradores visitantes',
  speakers_congregations: 'Congregaciones de oradores',
};

const useServerSnapshots = () => {
  const { t } = useAppTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, string[]>>({});

  const [selectedTable, setSelectedTable] = useState('schedules');
  const [selectedDate, setSelectedDate] = useState('');

  const loadSnapshots = async () => {
    setIsLoading(true);

    try {
      const { status, data } = await apiCongregationSnapshotsGet();

      if (status === 200 && data?.snapshots) {
        setSnapshots(data.snapshots);
      } else {
        displaySnackNotification({
          header: t('tr_snapshotsLoadError'),
          message: t('tr_snapshotsLoadErrorDesc'),
          icon: <IconInfo color="var(--card)" />,
          severity: 'error',
        });
      }
    } catch {
      displaySnackNotification({
        header: t('tr_snapshotsLoadError'),
        message: t('tr_snapshotsLoadErrorDesc'),
        icon: <IconInfo color="var(--card)" />,
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableDates = useMemo(() => {
    return snapshots[selectedTable] ?? [];
  }, [snapshots, selectedTable]);

  // Al cambiar de tabla, se preselecciona la fecha más reciente disponible.
  useEffect(() => {
    setSelectedDate(availableDates[0] ?? '');
  }, [availableDates]);

  const tableOptions = useMemo(() => {
    return Object.keys(SNAPSHOT_TABLE_LABELS).map((key) => ({
      value: key,
      label: SNAPSHOT_TABLE_LABELS[key],
      count: snapshots[key]?.length ?? 0,
    }));
  }, [snapshots]);

  const handleRestore = async () => {
    if (!selectedDate || isRestoring) return;

    setIsRestoring(true);

    try {
      const { status } = await apiCongregationSnapshotRestore(
        selectedTable,
        selectedDate
      );

      if (status === 200) {
        displaySnackNotification({
          header: t('tr_snapshotRestored'),
          message: t('tr_snapshotRestoredDesc'),
          icon: <IconCheckCircle color="var(--card)" />,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: t('tr_snapshotRestoreError'),
          message: t('tr_snapshotRestoreErrorDesc'),
          icon: <IconInfo color="var(--card)" />,
          severity: 'error',
        });
      }
    } catch {
      displaySnackNotification({
        header: t('tr_snapshotRestoreError'),
        message: t('tr_snapshotRestoreErrorDesc'),
        icon: <IconInfo color="var(--card)" />,
        severity: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    isLoading,
    isRestoring,
    tableOptions,
    availableDates,
    selectedTable,
    setSelectedTable,
    selectedDate,
    setSelectedDate,
    handleRestore,
    loadSnapshots,
  };
};

export default useServerSnapshots;
