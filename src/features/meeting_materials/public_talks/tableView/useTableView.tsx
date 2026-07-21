import { useMemo } from 'react';
import { TalksTableViewType, TalkTableItemType } from './index.types';

const useTableView = ({ talks }: TalksTableViewType) => {
  const yearslist = useMemo(() => {
    // filter(Boolean) + ?? []: un historial con huecos o un registro sin
    // fecha (datos sincronizados de versiones antiguas) no debe tumbar la
    // página entera de discursos.
    const history = talks.flatMap((talk) => talk.history ?? []).filter(Boolean);

    const years = [
      ...new Set(
        history
          .filter((item) => typeof item.date === 'string' && item.date)
          .map((item) => item.date.split('/')[0])
      ),
    ];

    return years;
  }, [talks]);

  const talksList = useMemo(() => {
    const results: TalkTableItemType[] = [];

    for (const talk of talks) {
      const obj = {} as TalkTableItemType;
      obj.talk_number = talk.talk_number;
      obj.talk_title = talk.talk_title;
      obj.history = [];

      for (const year of yearslist) {
        const yearHistory = {
          year,
          records: talk.history.filter((record) => record.date.includes(year)),
        };

        obj.history.push(yearHistory);
      }

      results.push(obj);
    }

    return results;
  }, [talks, yearslist]);

  return { talksList, yearslist };
};

export default useTableView;
