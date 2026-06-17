import { useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { outgoingSongSelectorOpenState } from '@states/schedules';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { ScheduleItemType } from './index.types';

type UseScheduleItemUIProps = ScheduleItemType & {
  speakersCongregations: SpeakersCongregationsType[];
  congName: string;
};

export const useScheduleItemUI = ({ schedule, speakersCongregations, congName }: UseScheduleItemUIProps) => {
  const [songSelectorOpen, setSongSelectorOpen] = useAtom(
    outgoingSongSelectorOpenState
  );
  const [clearAll, setClearAll] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  const congregationFullname = `${schedule.congregation.name}${schedule.congregation.number.length > 0 ? ` (${schedule.congregation.number})` : ''}`;

  const handleCloseSongSelector = () => setSongSelectorOpen(false);
  const handleOpenClearAll = () => setClearAll(true);
  const handleCloseClearAll = () => setClearAll(false);
  const handleOpenDelete = () => setIsDelete(true);
  const handleCloseDelete = () => setIsDelete(false);

  // Catalog congregations sorted alphabetically
  const catalogCongregations = useMemo(() => {
    return [...speakersCongregations].sort((a, b) =>
      a.cong_data.cong_name.value.localeCompare(b.cong_data.cong_name.value)
    );
  }, [speakersCongregations]);

  // Pre-select from catalog if current congregation matches
  const selectedCatalogCong = useMemo(() => {
    if (!congName) return null;
    return (
      catalogCongregations.find(
        (c) => c.cong_data.cong_name.value === congName
      ) ?? null
    );
  }, [catalogCongregations, congName]);

  return {
    songSelectorOpen,
    handleCloseSongSelector,
    clearAll,
    handleOpenClearAll,
    handleCloseClearAll,
    isDelete,
    handleOpenDelete,
    handleCloseDelete,
    congregationFullname,
    catalogCongregations,
    selectedCatalogCong,
  };
};
