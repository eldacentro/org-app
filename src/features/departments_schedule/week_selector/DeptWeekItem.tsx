import { useAtom } from 'jotai';
import { selectedDeptWeekState } from '@states/departments_schedule';
import Badge from '@components/badge';
import WeekRow from '@components/period_selector/WeekRow';
import { useAppTranslation } from '@hooks/index';

const DeptWeekItem = ({
  weekOf,
  label,
  noMeeting,
  onWeekSelect,
}: {
  weekOf: string;
  label: string;
  noMeeting?: boolean;
  onWeekSelect?: () => void;
}) => {
  const { t } = useAppTranslation();
  const [selectedWeek, setSelectedWeek] = useAtom(selectedDeptWeekState);
  const isSelected = selectedWeek === weekOf;

  // La fila compartida por los tres selectores de semana de la app. Antes cada
  // uno tenía la suya: su propio relleno, su propia forma de marcar la elegida
  // y su propio formato de fecha.
  return (
    <WeekRow
      label={label}
      selected={isSelected}
      onSelect={() => {
        setSelectedWeek(weekOf);
        onWeekSelect?.();
      }}
      trailing={
        noMeeting && (
          <Badge
            text={t('tr_noMeetingWeek')}
            color="grey"
            size="small"
            filled={false}
          />
        )
      }
    />
  );
};

export default DeptWeekItem;
