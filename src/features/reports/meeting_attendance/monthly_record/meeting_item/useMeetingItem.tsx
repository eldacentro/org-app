import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import { createNumbersArray } from '@utils/common';
import { languageGroupEnabledState } from '@states/settings';
import { languageGroupsState } from '@states/field_service_groups';
import { attendanceWeeksForMonth } from '../../hooks/attendanceWeeks';
import { LanguageGroup, MeetingItemProps } from './index.types';

const useMeetingItem = ({ month, type }: MeetingItemProps) => {
  const { isGroup } = useCurrentUser();

  const languageGroups = useAtomValue(languageGroupsState);
  const languageGroupEnabled = useAtomValue(languageGroupEnabledState);

  const weeksCount = useMemo(() => {
    // Mes NATURAL: una columna por cada reunión de este tipo cuya FECHA cae
    // dentro del mes (criterio de la sucursal para el S-88, igual que TsWin y
    // que el histórico migrado) — no por cada semana cuyo lunes cae en el mes.
    const weeks = attendanceWeeksForMonth(month, type);

    return createNumbersArray(weeks.length);
  }, [month, type]);

  const groups = useMemo(() => {
    const result: LanguageGroup[] = [];

    if (languageGroupEnabled && !isGroup) {
      for (const group of languageGroups) {
        if (
          (type === 'midweek' && group.group_data.midweek_meeting) ||
          (type === 'weekend' && group.group_data.weekend_meeting)
        ) {
          // cada grupo puede reunirse otro día, así que su nº de reuniones en
          // el mes natural puede diferir del de la congregación (4 vs 5)
          const weeks = attendanceWeeksForMonth(month, type, group.group_id);

          result.push({
            id: group.group_id,
            name: group.group_data.name,
            weeksCount: createNumbersArray(weeks.length),
          });
        }
      }
    }

    return result;
  }, [isGroup, languageGroups, month, type, languageGroupEnabled]);

  return { weeksCount, groups };
};

export default useMeetingItem;
