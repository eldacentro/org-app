import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { sourcesState } from '@states/sources';
import {
  ScheduleListType,
  SchedulePublishProps,
  YearGroupType,
} from './index.types';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { SourceWeekType } from '@definition/sources';
import { schedulesState } from '@states/schedules';
import {
  OutgoingTalkExportScheduleType,
  SchedWeekType,
} from '@definition/schedules';
import { incomingSpeakersState } from '@states/visiting_speakers';
import { speakerGetDisplayName, updateObject } from '@utils/common';
import {
  congIDState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  JWLangState,
  settingsState,
  userDataViewState,
} from '@states/settings';
import {
  apiPublicScheduleGet,
  apiPublishSchedule,
} from '@services/api/schedule';
import { speakersCongregationsState } from '@states/speakers_congregations';
import { getUserDataView } from '@services/app';
import { personsByViewState } from '@states/persons';
import { congAccountConnectedState } from '@states/app';
import { personIsAwayOn } from '@services/app/persons';
import { personGetDisplayName } from '@utils/common';
import { dbSchedBulkUpdate } from '@services/dexie/schedules';
import {
  collectMeetingMonthAssignees,
  countMeetingMissingParts,
  isMeetingMonthPublished,
  meetingMonthNeedsPublishing,
  setMeetingMonthPublished,
} from '@services/app/meetings_publish';
import { meetingMonthResolver } from '@services/app/meeting_month';

const useSchedulePublish = ({ type, onClose }: SchedulePublishProps) => {
  const { t } = useAppTranslation();

  const { isPublicTalkCoordinator } = useCurrentUser();

  // Solo hace falta `refetch`: la lista de meses ya publicados sale ahora de la
  // marca de cada semana, no de lo que haya en la web pública.
  const { refetch } = useQuery({
    queryKey: ['public_schedules'],
    queryFn: apiPublicScheduleGet,
    refetchOnMount: 'always',
  });

  const sources = useAtomValue(sourcesState);
  const schedules = useAtomValue(schedulesState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const dataView = useAtomValue(userDataViewState);
  const congregations = useAtomValue(speakersCongregationsState);
  const settings = useAtomValue(settingsState);
  const congID = useAtomValue(congIDState);
  const lang = useAtomValue(JWLangState);

  const persons = useAtomValue(personsByViewState);
  const isConnected = useAtomValue(congAccountConnectedState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  /**
   * A qué mes pertenece cada semana, con la MISMA regla que el selector de
   * semanas del editor. No siempre es el mes de su lunes: la reunión del 1 de
   * octubre es de la semana del 28 de septiembre, y el responsable la ve bajo
   * octubre. Si publicar fuera por el lunes, «Publicar octubre» dejaría esa
   * semana en borrador y nadie vería la primera reunión del mes.
   */
  const monthOf = meetingMonthResolver(type);

  const sourcesList = useMemo(() => {
    const weekDate = getWeekDate();
    const pastDate = addMonths(weekDate, -3);

    let base = sources.filter(
      (record) =>
        isMondayDate(record.weekOf) && new Date(record.weekOf) >= pastDate
    );

    if (type === 'midweek') {
      base = base.filter(
        (record) =>
          record.midweek_meeting.weekly_bible_reading[lang]?.length > 0
      );
    }

    return base.map((record) => record.weekOf);
  }, [sources, type, lang]);

  const baseList = useMemo(() => {
    const groupedData = sourcesList.reduce((acc: YearGroupType[], week) => {
      const [year, month] = monthOf(week).split('/');
      let yearGroup = acc.find((y) => y.year === year);

      if (!yearGroup) {
        yearGroup = { year: year, months: [] };
        acc.push(yearGroup);
      }

      let monthGroup = yearGroup.months.find((m) => m === `${year}/${month}`);

      if (!monthGroup) {
        monthGroup = `${year}/${month}`;
        yearGroup.months.push(monthGroup);
      }

      return acc;
    }, []);

    return groupedData;
  }, [sourcesList]);

  /**
   * "Publicado" quiere decir que la congregación lo ve.
   *
   * Antes esta marca salía de lo que hubiera en el servidor público, que es
   * otra cosa (la página web para quien no tiene cuenta) y que además no
   * distingue un mes entero de un mes a medias. Ahora sale de la marca de la
   * propia semana, que es la que decide si al hermano le aparece su parte en
   * "Mis asignaciones" y en el programa semanal.
   */
  const schedulesList = useMemo(() => {
    const result: ScheduleListType[] = baseList.map((record) => {
      return {
        year: record.year,
        months: record.months.map((month) => {
          return {
            month,
            checked: checkedItems.includes(month),
            published: isMeetingMonthPublished(
              schedules,
              month,
              type,
              dataView,
              monthOf
            ),
            isHistoric: !meetingMonthNeedsPublishing(month, type),
          };
        }),
      };
    });

    return result;
  }, [baseList, checkedItems, schedules, type, dataView]);

  /** Los meses marcados que de verdad hay que publicar (el histórico ya lo está). */
  const checkedMonths = useMemo(
    () =>
      checkedItems
        .filter((item) => item.includes('/'))
        .filter((month) => meetingMonthNeedsPublishing(month, type))
        .toSorted(),
    [checkedItems, type]
  );

  /** ¿Está ya publicado TODO lo marcado? Entonces lo que toca es retirar. */
  const allCheckedPublished = useMemo(() => {
    if (checkedMonths.length === 0) return false;

    return checkedMonths.every((month) =>
      isMeetingMonthPublished(schedules, month, type, dataView, monthOf)
    );
  }, [checkedMonths, schedules, type, dataView]);

  /** Partes principales sin nadie en lo marcado. No impide publicar; se dice. */
  const missingParts = useMemo(
    () =>
      checkedMonths.reduce(
        (total, month) =>
          total +
          countMeetingMissingParts(schedules, month, type, dataView, monthOf),
        0
      ),
    [checkedMonths, schedules, type, dataView, monthOf]
  );

  /**
   * Quién está asignado en lo marcado teniendo una ausencia apuntada esos días.
   *
   * La aplicación ya lo avisa al elegir a la persona, y avisar otra vez aquí es
   * a propósito: aquel aviso pasa cuando se está trabajando y se escapa; este
   * sale justo antes de que lo vea la congregación entera.
   *
   * Se pregunta por el LUNES de la semana, que es como lo pregunta el
   * autocompletado: una ausencia de un solo día que caiga justo el día de la
   * reunión y no el lunes se escapa, pero lo normal es que cubra varios días.
   */
  const awayAssignees = useMemo(() => {
    const found: string[] = [];

    for (const month of checkedMonths) {
      const assignees = collectMeetingMonthAssignees(
        schedules,
        month,
        type,
        dataView,
        monthOf
      );

      for (const assignee of assignees) {
        const person = persons.find(
          (record) => record.person_uid === assignee.uid
        );

        if (!person) continue;

        if (!personIsAwayOn(person, assignee.weekOf.replace(/\//g, '-'))) {
          continue;
        }

        const name =
          personGetDisplayName(person, displayNameEnabled, fullnameOption) ||
          assignee.name;

        if (name && !found.includes(name)) found.push(name);
      }
    }

    return found;
  }, [
    checkedMonths,
    schedules,
    type,
    dataView,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  const handleCheckedChange = (checked: boolean, value: string) => {
    if (isProcessing) return;

    if (checked) {
      setCheckedItems((prev) => {
        const items = structuredClone(prev);

        if (!value.includes('/')) {
          const data = items.filter((record) => !record.includes(value));

          const months = baseList.find(
            (record) => record.year === value
          ).months;

          data.push(...months);

          return data;
        }

        items.push(value);

        return items;
      });
    }

    if (!checked) {
      setCheckedItems((prev) => {
        const items = structuredClone(prev);

        const data = items.filter((record) => !record.includes(value));
        return data;
      });
    }
  };

  const filterArraysByDataView = <T extends object>(
    obj: T,
    parentKey?: string
  ): T => {
    if (Array.isArray(obj)) {
      // Skip filtering if the parent key is "outgoing_talks"
      if (parentKey === 'outgoing_talks') {
        return obj;
      }

      return obj
        .filter((item) => typeof item === 'object' && item !== null)
        .filter((item) => !('type' in item) || item.type === dataView)
        .map((item) => filterArraysByDataView(item)) as T;
    } else if (typeof obj === 'object' && obj !== null) {
      const result = {} as T;

      for (const key in obj) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result[key] = filterArraysByDataView(obj[key] as any, key);
      }

      return result;
    }

    return obj;
  };

  const handleGetMaterials = <T extends SchedWeekType | SourceWeekType>(
    data: T[],
    months: string[]
  ): T[] => {
    const result: T[] = [];

    for (const month of months) {
      const monthSources = data.filter((record) =>
        record.weekOf.includes(month)
      );

      result.push(...monthSources);
    }

    const sectionToDelete =
      type === 'midweek' ? 'weekend_meeting' : 'midweek_meeting';

    const finalData = result.map((record) => {
      const item = filterArraysByDataView(record);
      delete item[sectionToDelete];

      return item;
    });

    return finalData;
  };

  const handleUpdateSchedules = (schedules: SchedWeekType[]) => {
    if (type === 'midweek') return schedules;

    const newSchedules = structuredClone(schedules);

    return newSchedules.map((schedule) => {
      if (!schedule.weekend_meeting) return schedule;

      for (const speakerSchedule of schedule.weekend_meeting.speaker.part_1) {
        const talkType = schedule.weekend_meeting.public_talk_type.find(
          (record) => record.type
        )?.value;

        if (speakerSchedule.value.length > 0) {
          if (talkType === 'visitingSpeaker') {
            const speaker = incomingSpeakers.find(
              (record) => record.person_uid === speakerSchedule.value
            );
            speakerSchedule.name = !speaker
              ? ''
              : speakerGetDisplayName(
                  speaker,
                  displayNameEnabled,
                  fullnameOption
                );
          }
        }
      }

      return schedule;
    });
  };

  const handleUpdateMaterialsFromRemote = <T extends { weekOf: string }>(
    local: T[],
    remote: T[]
  ) => {
    const now = getWeekDate();
    const lastDate = formatDate(addMonths(now, -3), 'yyyy/MM/dd');

    const filteredData = remote.filter((record) => record.weekOf >= lastDate);

    for (const item of local) {
      const remoteItem = filteredData.find(
        (record) => record.weekOf === item.weekOf
      );

      if (!remoteItem) {
        filteredData.push(item);
      }

      if (remoteItem) {
        if (
          remoteItem['midweek_meeting']?.['aux_fsg'] &&
          typeof remoteItem['midweek_meeting']['aux_fsg'] === 'string'
        ) {
          delete remoteItem['midweek_meeting']['aux_fsg'];
        }

        updateObject(remoteItem, item);
      }
    }

    return filteredData;
  };

  const handleGetIncomingTalks = (schedules: SchedWeekType[]) => {
    const talks: OutgoingTalkExportScheduleType[] = [];

    const outgoingTalks = schedules.filter((record) => {
      if (!record.weekend_meeting) return false;

      return (
        record.weekend_meeting.public_talk_type.find(
          (item) => item.type === dataView
        )?.value === 'visitingSpeaker'
      );
    });

    for (const schedule of outgoingTalks) {
      const assigned = schedule.weekend_meeting?.speaker.part_1.find(
        (record) => record.type === dataView
      );

      const speaker = incomingSpeakers.find(
        (record) => record.person_uid === assigned?.value
      );

      const congregation = congregations.find(
        (record) => record.id === speaker?.speaker_data.cong_id
      );

      if (congregation?.cong_data.cong_id.length > 0) {
        const source = sources.find(
          (record) => record.weekOf === schedule.weekOf
        );

        const obj = {} as OutgoingTalkExportScheduleType;

        obj.weekOf = schedule.weekOf;
        obj.sender = congID;
        obj.recipient = congregation.cong_data.cong_id;
        obj._deleted = false;
        obj.id = assigned.value;
        obj.opening_song = getUserDataView(
          source.weekend_meeting.song_first,
          dataView
        ).value;
        obj.public_talk = getUserDataView(
          source.weekend_meeting.public_talk,
          dataView
        ).value as number;
        obj.synced = true;
        obj.value = assigned.value;
        obj.updatedAt = assigned.updatedAt;
        obj.congregation = {
          address: settings.cong_settings.cong_location.address,
          country: settings.cong_settings.country_code,
          name: settings.cong_settings.cong_name,
          number: settings.cong_settings.cong_number.value,
          weekday: getUserDataView(
            settings.cong_settings.weekend_meeting,
            dataView
          ).weekday.value,
          time: getUserDataView(
            settings.cong_settings.weekend_meeting,
            dataView
          ).time.value,
        };

        talks.push(obj);
      }
    }

    return talks;
  };

  const handleFilterOutgoingTalks = (schedules: SchedWeekType[]) => {
    const weekend = settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    );

    const publish = weekend.outgoing_talks_schedule_public.value;

    const result = schedules.map((schedule) => {
      if (!publish) delete schedule.weekend_meeting.outgoing_talks;

      return schedule;
    });

    return result;
  };

  /**
   * Marca (o retira) los meses en la propia aplicación.
   *
   * Esto es lo que decide si la congregación ve el mes. Va antes que la subida
   * a la web pública y no depende de ella a propósito: si la red falla, lo peor
   * que puede pasar es que la web pública se quede atrás, no que un mes ya
   * decidido siga escondido para todo el mundo.
   *
   * Solo se guardan las semanas que CAMBIAN: guardar un registro idéntico
   * despierta la sincronización de toda la congregación para nada.
   */
  const applyLocalPublish = async (months: string[], published: boolean) => {
    const toSave: SchedWeekType[] = [];

    for (const month of months) {
      if (!meetingMonthNeedsPublishing(month, type)) continue;

      toSave.push(
        ...setMeetingMonthPublished(
          schedules,
          month,
          type,
          published,
          dataView,
          undefined,
          monthOf
        )
      );
    }

    if (toSave.length > 0) {
      await dbSchedBulkUpdate(toSave);
    }

    return toSave.length;
  };

  const handleRetireSchedule = async () => {
    if (checkedMonths.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);

      await applyLocalPublish(checkedMonths, false);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message:
          checkedMonths.length === 1
            ? 'Mes retirado: vuelve a ser un borrador.'
            : 'Meses retirados: vuelven a ser un borrador.',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);

      setIsProcessing(false);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handlePublishSchedule = async () => {
    if (checkedItems.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);

      const months = checkedItems.toSorted();

      await applyLocalPublish(months, true);

      // Sin cuenta conectada no hay web pública a la que subir nada, pero el
      // mes ya está publicado donde importa: dentro de la aplicación.
      if (!isConnected) {
        setIsProcessing(false);
        onClose?.();

        displaySnackNotification({
          header: t('tr_successfullyPublished'),
          message: t('tr_successfullyPublishedDesc'),
          severity: 'success',
        });

        return;
      }

      const sourcesLocalPublish = handleGetMaterials(sources, months);
      const schedulesLocalPublish = handleGetMaterials(schedules, months);

      const { data } = await refetch();

      if (Array.isArray(data?.schedules) && Array.isArray(data?.sources)) {
        const sourcesRemote = data.sources;
        const schedulesRemote = data.schedules;

        const sourcesPublish = handleUpdateMaterialsFromRemote(
          sourcesLocalPublish,
          sourcesRemote
        );

        const schedulesBasePublish = handleUpdateMaterialsFromRemote(
          schedulesLocalPublish,
          schedulesRemote
        );

        const schedulesPrePublish = handleUpdateSchedules(schedulesBasePublish);
        let schedulesPublish = schedulesPrePublish;

        let talksPublish: OutgoingTalkExportScheduleType[] = undefined;

        if (isPublicTalkCoordinator && type === 'weekend') {
          schedulesPublish = handleFilterOutgoingTalks(schedulesPrePublish);
          talksPublish = handleGetIncomingTalks(schedulesPublish);
        }

        const { status, message } = await apiPublishSchedule(
          sourcesPublish,
          schedulesPublish,
          talksPublish
        );

        if (status !== 200) {
          throw new Error(message);
        }

        displaySnackNotification({
          header: t('tr_successfullyPublished'),
          message: t('tr_successfullyPublishedDesc'),
          severity: 'success',
        });

        setIsProcessing(false);
        onClose?.();
      }
    } catch (error) {
      console.error(error);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    schedulesList,
    handleCheckedChange,
    handlePublishSchedule,
    handleRetireSchedule,
    isProcessing,
    checkedMonths,
    allCheckedPublished,
    missingParts,
    awayAssignees,
  };
};

export default useSchedulePublish;
