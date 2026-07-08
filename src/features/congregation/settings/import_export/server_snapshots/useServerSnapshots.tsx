import { useEffect, useMemo, useState } from 'react';
import { useAppTranslation } from '@hooks/index';
import {
  apiCongregationSnapshotsGet,
  apiCongregationSnapshotRestore,
  apiCongregationScheduleLockSet,
  apiCongregationScheduleForceResync,
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
  const [isLocking, setIsLocking] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [scheduleLocked, setScheduleLocked] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, string[]>>({});
  const [schedulesPreview, setSchedulesPreview] = useState<
    { date: string; weeks: number; julyAugust: number }[]
  >([]);

  const [selectedTable, setSelectedTable] = useState('schedules');
  const [selectedDate, setSelectedDate] = useState('');

  const loadSnapshots = async () => {
    setIsLoading(true);

    try {
      const { status, data } = await apiCongregationSnapshotsGet();

      if (status === 200 && data?.snapshots) {
        setSnapshots(data.snapshots);
        setSchedulesPreview(data.schedulesPreview ?? []);
        setScheduleLocked(Boolean(data.scheduleLock?.locked));
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

  const handleToggleLock = async () => {
    if (isLocking) return;

    const next = !scheduleLocked;
    setIsLocking(true);

    try {
      const { status } = await apiCongregationScheduleLockSet(next);

      if (status === 200) {
        setScheduleLocked(next);
        displaySnackNotification({
          header: next ? t('tr_scheduleLockOn') : t('tr_scheduleLockOff'),
          message: next
            ? t('tr_scheduleLockOnDesc')
            : t('tr_scheduleLockOffDesc'),
          icon: <IconCheckCircle color="var(--card)" />,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: t('tr_scheduleLockError'),
          message: t('tr_snapshotsLoadErrorDesc'),
          icon: <IconInfo color="var(--card)" />,
          severity: 'error',
        });
      }
    } catch {
      displaySnackNotification({
        header: t('tr_scheduleLockError'),
        message: t('tr_snapshotsLoadErrorDesc'),
        icon: <IconInfo color="var(--card)" />,
        severity: 'error',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleForceResync = async () => {
    if (isForcing) return;

    setIsForcing(true);

    try {
      const { status } = await apiCongregationScheduleForceResync();

      if (status === 200) {
        displaySnackNotification({
          header: t('tr_forceResyncDone'),
          message: t('tr_forceResyncDoneDesc'),
          icon: <IconCheckCircle color="var(--card)" />,
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: t('tr_forceResyncError'),
          message: t('tr_snapshotsLoadErrorDesc'),
          icon: <IconInfo color="var(--card)" />,
          severity: 'error',
        });
      }
    } catch {
      displaySnackNotification({
        header: t('tr_forceResyncError'),
        message: t('tr_snapshotsLoadErrorDesc'),
        icon: <IconInfo color="var(--card)" />,
        severity: 'error',
      });
    } finally {
      setIsForcing(false);
    }
  };

  // Info estructural del snapshot de programas de una fecha (para mostrar
  // cuántas semanas tiene y si julio/agosto están, y así elegir uno bueno).
  const previewForDate = (date: string) =>
    schedulesPreview.find((p) => p.date === date);

  return {
    isLoading,
    isRestoring,
    isLocking,
    isForcing,
    scheduleLocked,
    handleToggleLock,
    handleForceResync,
    tableOptions,
    availableDates,
    selectedTable,
    setSelectedTable,
    selectedDate,
    setSelectedDate,
    previewForDate,
    handleRestore,
    loadSnapshots,
  };
};

export default useServerSnapshots;
