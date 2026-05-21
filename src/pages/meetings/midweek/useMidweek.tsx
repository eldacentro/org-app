import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesFormattedState } from '@states/sources';
import { congAccountConnectedState } from '@states/app';
import { schedulesState, selectedWeekState } from '@states/schedules';

const useMidweek = () => {
  const sources = useAtomValue(sourcesFormattedState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const selectedWeek = useAtomValue(selectedWeekState);
  const schedules = useAtomValue(schedulesState);

  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);

  const [openAutofill, setOpenAutofill] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openPublish, setOpenPublish] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);

  const handleOpenQuickSettings = () => setQuickSettingsOpen(true);

  const handleCloseQuickSettings = () => setQuickSettingsOpen(false);

  const hasWeeks = sources.length > 0;

  const handleOpenAutofill = () => setOpenAutofill(true);

  const handleCloseAutofill = () => setOpenAutofill(false);

  const handleOpenExport = () => setOpenExport(true);

  const handleCloseExport = () => setOpenExport(false);

  const handleOpenPublish = () => setOpenPublish(true);

  const handleClosePublish = () => setOpenPublish(false);

  return {
    hasWeeks,
    handleCloseAutofill,
    handleOpenAutofill,
    openAutofill,
    openExport,
    handleOpenExport,
    handleCloseExport,
    openPublish,
    handleOpenPublish,
    handleClosePublish,
    isConnected,
    quickSettingsOpen,
    handleOpenQuickSettings,
    handleCloseQuickSettings,
    updatedAt: currentSched?.updatedAt,
    lastModifiedBy: currentSched?.lastModifiedBy,
  };
};

export default useMidweek;
