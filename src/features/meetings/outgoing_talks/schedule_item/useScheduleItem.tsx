import { ScheduleItemType } from './index.types';
import { useScheduleItemData } from './useScheduleItemData';
import { useScheduleItemMutations } from './useScheduleItemMutations';
import { useScheduleItemUI } from './useScheduleItemUI';

const useScheduleItem = ({ schedule, week }: ScheduleItemType) => {
  const data = useScheduleItemData({ schedule, week });

  const mutations = useScheduleItemMutations({
    schedule,
    week,
    setCountry: data.setCountry,
    setCongName: data.setCongName,
    setCongAddress: data.setCongAddress,
    setMeetingDay: data.setMeetingDay,
    setMeetingTime: data.setMeetingTime,
    congName: data.congName,
    congAddress: data.congAddress,
  });

  const ui = useScheduleItemUI({
    schedule,
    week,
    speakersCongregations: data.speakersCongregations,
    congName: data.congName,
  });

  return {
    congName: data.congName,
    week,
    schedule,
    handleCountryChange: mutations.handleCountryChange,
    country: data.country,
    congConnected: data.congConnected,
    congregationFullname: ui.congregationFullname,
    handleCongNameChange: mutations.handleCongNameChange,
    handleCongNameSave: mutations.handleCongNameSave,
    use24hFormat: data.use24hFormat,
    congAddress: data.congAddress,
    handleCongAddressChange: mutations.handleCongAddressChange,
    handleCongAddressSave: mutations.handleCongAddressSave,
    meetingDay: data.meetingDay,
    handleMeetingDayChange: mutations.handleMeetingDayChange,
    handleMeetingTimeChange: mutations.handleMeetingTimeChange,
    meetingTime: data.meetingTime,
    handleOpenClearAll: ui.handleOpenClearAll,
    handleCloseClearAll: ui.handleCloseClearAll,
    clearAll: ui.clearAll,
    isDelete: ui.isDelete,
    handleOpenDelete: ui.handleOpenDelete,
    handleCloseDelete: ui.handleCloseDelete,
    handleSelectCongregation: mutations.handleSelectCongregation,
    handleCongSearchOverride: mutations.handleCongSearchOverride,
    songSelectorOpen: ui.songSelectorOpen,
    handleCloseSongSelector: ui.handleCloseSongSelector,
    catalogCongregations: ui.catalogCongregations,
    selectedCatalogCong: ui.selectedCatalogCong,
    isManualInput: data.isManualInput,
    setIsManualInput: data.setIsManualInput,
    handleSelectFromCatalog: mutations.handleSelectFromCatalog,
  };
};

export default useScheduleItem;

