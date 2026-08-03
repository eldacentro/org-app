import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { sourcesState } from '@states/sources';
import {
  ScheduleListType,
  SchedulePublishProps,
  ScheduleWeekType,
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
  buildMeetingWeekMissingParts,
  isMeetingWeekUntouched,
  collectMeetingWeeksAssignees,
  isMeetingWeekPublished,
  meetingMonthNeedsPublishing,
  setMeetingWeeksPublished,
} from '@services/app/meetings_publish';
import { meetingMonthResolver } from '@services/app/meeting_month';
import { schedulesGetMeetingDate } from '@services/app/schedules';

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

  /**
   * El árbol año → mes → SEMANAS.
   *
   * El mes deja de ser la unidad de la decisión y pasa a ser lo que siempre
   * debió ser: cómo se agrupan las semanas en la pantalla. La marca de
   * «publicado» ya vivía dentro de cada semana, así que esto no añade una capa,
   * quita una — y de paso desaparece la pregunta de a qué mes pertenece una
   * semana a caballo entre dos.
   */
  const baseList = useMemo(() => {
    return sourcesList.reduce((acc: YearGroupType[], week) => {
      const [year, month] = monthOf(week).split('/');

      let yearGroup = acc.find((y) => y.year === year);

      if (!yearGroup) {
        yearGroup = { year, months: [] };
        acc.push(yearGroup);
      }

      let monthGroup = yearGroup.months.find(
        (m) => m.month === `${year}/${month}`
      );

      if (!monthGroup) {
        monthGroup = { month: `${year}/${month}`, weeks: [] };
        yearGroup.months.push(monthGroup);
      }

      monthGroup.weeks.push(week);

      return acc;
    }, []);
  }, [sourcesList, monthOf]);

  /** Todas las semanas del árbol, para resolver una casilla de año o de mes. */
  const weeksOfValue = (value: string) => {
    const all = baseList.flatMap((year) =>
      year.months.flatMap((month) => month.weeks)
    );

    // Un año ('2026'), un mes ('2026/09') o una semana ('2026/09/07'): en los
    // tres casos vale el mismo prefijo, porque el árbol se agrupa por el mes de
    // la REUNIÓN y no siempre coincide con el del lunes.
    // El histórico se queda fuera de todo: ya está a la vista y no hay nada que
    // decidir. Sin esto, marcar un mes metería semanas que `setMeetingWeeks-
    // Published` va a ignorar, y el botón diría «Retirar» sin poder retirar.
    const publicables = (weeks: string[]) =>
      weeks.filter((week) => meetingMonthNeedsPublishing(week, type));

    if (value.split('/').length === 3) {
      return publicables(all.filter((w) => w === value));
    }

    return publicables(
      baseList
        .filter(
          (year) => value === year.year || value.startsWith(`${year.year}/`)
        )
        .flatMap((year) =>
          year.months
            .filter((month) => value === year.year || month.month === value)
            .flatMap((month) => month.weeks)
        )
    );
  };

  /**
   * "Publicado" quiere decir que la congregación lo ve.
   *
   * Sale de la marca de la propia SEMANA, que es la que decide si al hermano le
   * aparece su parte en "Mis asignaciones" y en el programa semanal. Un mes solo
   * cuenta como publicado cuando lo están todas las suyas: a medias sigue
   * ofreciendo publicar, para que se pueda terminar.
   */
  const schedulesList = useMemo(() => {
    const result: ScheduleListType[] = baseList.map((record) => ({
      year: record.year,
      months: record.months.map(({ month, weeks }) => {
        const weekRows: ScheduleWeekType[] = weeks.map((weekOf) => {
          const schedule = schedules.find((item) => item.weekOf === weekOf);

          return {
            weekOf,
            label:
              schedulesGetMeetingDate({
                week: weekOf,
                meeting: type,
                short: true,
              }).locale || weekOf,
            checked: checkedItems.includes(weekOf),
            published: isMeetingWeekPublished(schedule, type, dataView),
            isHistoric: !meetingMonthNeedsPublishing(weekOf, type),
            missing: buildMeetingWeekMissingParts(schedule, type, dataView),
            missingAll: isMeetingWeekUntouched(schedule, type, dataView),
          };
        });

        // El histórico no cuenta para el estado de la casilla del mes: si
        // contara, un mes con una semana del histórico no podría salir marcado
        // del todo por mucho que se marcaran las demás.
        const decidibles = weekRows.filter((week) => !week.isHistoric);
        const marcadas = decidibles.filter((week) => week.checked).length;

        return {
          month,
          checked: decidibles.length > 0 && marcadas === decidibles.length,
          indeterminate: marcadas > 0 && marcadas < decidibles.length,
          published:
            weekRows.length > 0 && weekRows.every((week) => week.published),
          isHistoric: weekRows.every((week) => week.isHistoric),
          weeks: weekRows,
        };
      }),
    }));

    return result;
  }, [baseList, checkedItems, schedules, type, dataView]);

  /** Las semanas marcadas que de verdad hay que publicar (el histórico ya lo está). */
  const checkedWeeks = useMemo(
    () =>
      checkedItems
        .filter((weekOf) => meetingMonthNeedsPublishing(weekOf, type))
        .toSorted(),
    [checkedItems, type]
  );

  /** ¿Está ya publicado TODO lo marcado? Entonces lo que toca es retirar. */
  const allCheckedPublished = useMemo(() => {
    if (checkedWeeks.length === 0) return false;

    return checkedWeeks.every((weekOf) =>
      isMeetingWeekPublished(
        schedules.find((item) => item.weekOf === weekOf),
        type,
        dataView
      )
    );
  }, [checkedWeeks, schedules, type, dataView]);

  /**
   * Semana a semana: si está entera o qué le falta.
   *
   * Antes esto era un número —«faltan 3 partes principales»— y con un número no
   * se puede hacer nada: no dice ni en qué semana ni cuál. Aquí va lo que el
   * responsable se pregunta antes de darle al botón.
   */
  const weeksInfo = useMemo(() => {
    const filas = schedulesList
      .flatMap((year) => year.months)
      .flatMap((month) => month.weeks)
      .filter((week) => week.checked);

    return filas.toSorted((a, b) => a.weekOf.localeCompare(b.weekOf));
  }, [schedulesList]);

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

    for (const assignee of collectMeetingWeeksAssignees(
      schedules,
      checkedWeeks,
      type,
      dataView
    )) {
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

    return found;
  }, [
    checkedWeeks,
    schedules,
    type,
    dataView,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  /**
   * Marcar o desmarcar un año, un mes o una semana.
   *
   * Lo que se guarda son SIEMPRE semanas: las casillas de año y de mes son un
   * atajo para marcar las suyas, y su estado (marcada, a medias) se deduce de
   * ellas. Antes se guardaban meses y el estado del año se adivinaba con
   * `includes` sobre la cadena, que funcionaba de milagro.
   */
  const handleCheckedChange = (checked: boolean, value: string) => {
    if (isProcessing) return;

    const weeks = weeksOfValue(value);

    setCheckedItems((prev) => {
      if (!checked) return prev.filter((week) => !weeks.includes(week));

      return [...new Set([...prev, ...weeks])];
    });
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
    weeks: string[]
  ): T[] => {
    // Por semanas y no por meses: ahora se publica lo que se ha marcado, que
    // puede ser medio mes. Subir el mes entero enseñaría en la web pública
    // semanas que aquí siguen en borrador.
    const wanted = new Set(weeks);

    const result: T[] = data.filter((record) => wanted.has(record.weekOf));

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
  const applyLocalPublish = async (weeks: string[], published: boolean) => {
    const toSave = setMeetingWeeksPublished(
      schedules,
      weeks,
      type,
      published,
      dataView
    );

    if (toSave.length > 0) {
      await dbSchedBulkUpdate(toSave);
    }

    return toSave.length;
  };

  const handleRetireSchedule = async () => {
    if (checkedWeeks.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);

      await applyLocalPublish(checkedWeeks, false);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message:
          checkedWeeks.length === 1
            ? 'Semana retirada: vuelve a ser un borrador.'
            : `${checkedWeeks.length} semanas retiradas: vuelven a ser un borrador.`,
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

      const weeks = checkedWeeks;

      await applyLocalPublish(weeks, true);

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

      const sourcesLocalPublish = handleGetMaterials(sources, weeks);
      const schedulesLocalPublish = handleGetMaterials(schedules, weeks);

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
    checkedWeeks,
    allCheckedPublished,
    weeksInfo,
    awayAssignees,
  };
};

export default useSchedulePublish;
