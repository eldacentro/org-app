import { useAppTranslation } from '@hooks/index';
import CollapsibleSelector from '@components/collapsible_selector';
import ScrollableTabs from '@components/scrollable_tabs';
import useDeptWeekPickerPanel from './useDeptWeekPickerPanel';
import DeptMonthsContainer from './DeptMonthsContainer';

const DeptWeekPickerPanel = () => {
  const { t } = useAppTranslation();
  const {
    yearsList,
    activeTab,
    expanded,
    handleToggleExpand,
    selectedWeekLabel,
  } = useDeptWeekPickerPanel();

  const tabs = yearsList.map((year) => ({
    label: year.label,
    Component: <DeptMonthsContainer months={year.months} />,
  }));

  return (
    <CollapsibleSelector
      title={t('tr_weeks', 'Semanas')}
      valuePrefix={t('tr_week', 'Semana')}
      valueLabel={selectedWeekLabel}
      expanded={expanded}
      onToggle={handleToggleExpand}
    >
      {tabs.length > 0 && <ScrollableTabs tabs={tabs} value={activeTab} />}
    </CollapsibleSelector>
  );
};

export default DeptWeekPickerPanel;
