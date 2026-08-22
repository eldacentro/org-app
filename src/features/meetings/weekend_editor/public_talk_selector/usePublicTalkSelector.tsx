import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { publicTalksLocaleState } from '@states/public_talks';
import { sourcesState } from '@states/sources';
import {
  userDataViewState,
  weekendMeetingPublicTalkRepeatMonthsState,
} from '@states/settings';
import { dbSourcesUpdate } from '@services/dexie/sources';
import {
  incomingSpeakersState,
  myCongSpeakersState,
} from '@states/visiting_speakers';
import { PublicTalkOptionType } from './index.types';
import {
  outgoingSongSelectorOpenState,
  schedulesState,
  weekendSongSelectorOpenState,
} from '@states/schedules';
import { dbSchedUpdate } from '@services/dexie/schedules';
import { publicTalkRepeatNotice } from '@services/app/public_talk_history';
import { schedulesGetMeetingDate } from '@services/app/schedules';

const usePublicTalkSelector = (week: string, schedule_id?: string) => {
  const setLocalSongSelectorOpen = useSetAtom(weekendSongSelectorOpenState);

  const setOutgoingSongSelectorOpen = useSetAtom(outgoingSongSelectorOpenState);

  const talksData = useAtomValue(publicTalksLocaleState);
  const sources = useAtomValue(sourcesState);
  const dataView = useAtomValue(userDataViewState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const localSpeakers = useAtomValue(myCongSpeakersState);
  const schedules = useAtomValue(schedulesState);
  const mesesAviso = useAtomValue(weekendMeetingPublicTalkRepeatMonthsState);

  const [selectedTalk, setSelectedTalk] = useState<PublicTalkOptionType>(null);
  const [openCatalog, setOpenCatalog] = useState(false);

  const source = sources.find((record) => record.weekOf === week);
  const schedule = schedules.find((record) => record.weekOf === week);

  const talks = useMemo(() => {
    const data: PublicTalkOptionType[] = [];

    if (!schedule) return data;

    if (!schedule_id) {
      // get assigned speaker
      const talkType =
        schedule.weekend_meeting.public_talk_type.find(
          (record) => record.type === dataView
        )?.value || 'localSpeaker';

      const speaker =
        schedule.weekend_meeting.speaker.part_1.find(
          (record) => record.type === dataView
        )?.value || '';

      const speakers =
        talkType === 'localSpeaker' ? localSpeakers : incomingSpeakers;

      for (const talk of talksData) {
        const cnSpeakers = speakers.filter((record) =>
          record.speaker_data.talks.find(
            (item) => item.talk_number === talk.talk_number
          )
        );

        if (talkType === 'localSpeaker' || talkType === 'visitingSpeaker') {
          const currentSpeaker = speakers.find(
            (item) =>
              item._deleted.value === false && item.person_uid === speaker
          );
          const talkFound = currentSpeaker?.speaker_data.talks.find(
            (item) => item.talk_number === talk.talk_number
          );

          if (speaker.length === 0 || !currentSpeaker || talkFound) {
            data.push({ ...talk, speakers: cnSpeakers.length });
          }
        } else {
          data.push({ ...talk, speakers: cnSpeakers.length });
        }
      }
    }

    if (schedule_id) {
      const outgoingSchedule = schedule.weekend_meeting.outgoing_talks.find(
        (record) => record.id === schedule_id
      );

      const speaker = outgoingSchedule.value;

      for (const talk of talksData) {
        const cnSpeakers = localSpeakers.filter((record) =>
          record.speaker_data.talks.find(
            (item) => item.talk_number === talk.talk_number
          )
        );

        const visitingSpeaker = localSpeakers.find(
          (item) => item._deleted.value === false && item.person_uid === speaker
        );
        const talkFound = visitingSpeaker?.speaker_data.talks.find(
          (item) => item.talk_number === talk.talk_number
        );

        if (speaker.length === 0 || talkFound) {
          data.push({ ...talk, speakers: cnSpeakers.length });
        }
      }
    }

    return data;
  }, [
    talksData,
    localSpeakers,
    schedule,
    dataView,
    incomingSpeakers,
    schedule_id,
  ]);

  /**
   * «Ya se dio el 14 de abril de 2026 (hace 4 meses)».
   *
   * Solo para el discurso que se da AQUÍ. Los salientes los dan hermanos
   * nuestros en otras congregaciones, y que uno se repita allí no dice nada
   * sobre lo que ha oído esta.
   */
  const repeatNotice = useMemo(() => {
    if (schedule_id || !selectedTalk?.talk_number) return '';

    const aviso = publicTalkRepeatNotice({
      sources,
      talkNumber: selectedTalk.talk_number,
      dataView,
      week,
      mesesAviso,
    });

    if (!aviso) return '';

    const fecha =
      schedulesGetMeetingDate({
        week: aviso.weekOf,
        meeting: 'weekend',
        key: 'tr_longDateWithYearLocale',
        dataView,
      }).locale || aviso.weekOf;

    const cuando =
      aviso.meses === 0
        ? 'hace menos de un mes'
        : aviso.meses === 1
          ? 'hace 1 mes'
          : `hace ${aviso.meses} meses`;

    return `Ya se dio el ${fecha} (${cuando})`;
  }, [schedule_id, selectedTalk, sources, dataView, week, mesesAviso]);

  const handleOpenCatalog = () => setOpenCatalog(true);

  const handleCloseCatalog = () => setOpenCatalog(false);

  const handleTalkChange = async (talk: PublicTalkOptionType) => {
    // Al quitar el discurso se guarda '' (el mismo vacío que usa el schema),
    // NUNCA undefined: los campos undefined desaparecen en el JSON.stringify
    // del cifrado E2E, así que el "borrado" no viajaba a los demás
    // dispositivos y el discurso viejo reaparecía al sincronizar.
    const value = talk?.talk_number ?? '';

    if (!schedule_id) {
      // Sin material todavía no hay fila de `sources` para esta semana, y no
      // pasa nada: se parte de vacío y `dbSourcesUpdate` la crea al guardar.
      // Antes esto reventaba aquí mismo —`source` era `undefined`—, y como el
      // error se quedaba dentro del manejador del desplegable, en la pantalla
      // solo se veía que elegir un discurso no hacía absolutamente nada.
      const talkData = structuredClone(
        source?.weekend_meeting.public_talk ?? []
      );

      let data = talkData.find((record) => record.type === dataView);

      if (!data) {
        talkData.push({ type: dataView, updatedAt: '', value: '' });

        data = talkData.find((record) => record.type === dataView);
      }

      data.updatedAt = new Date().toISOString();
      data.value = value;

      await dbSourcesUpdate(week, {
        'weekend_meeting.public_talk': talkData,
      });

      setLocalSongSelectorOpen(true);
    }

    if (schedule_id) {
      const outgoingTalks = structuredClone(
        schedule.weekend_meeting.outgoing_talks
      );

      const outgoingSchedule = outgoingTalks.find(
        (record) => record.id === schedule_id
      );

      outgoingSchedule.updatedAt = new Date().toISOString();
      outgoingSchedule.public_talk = value === '' ? null : value;

      await dbSchedUpdate(week, {
        'weekend_meeting.outgoing_talks': outgoingTalks,
      });

      setOutgoingSongSelectorOpen(true);
    }
  };

  useEffect(() => {
    setSelectedTalk(null);

    if (source && !schedule_id) {
      const talk = source.weekend_meeting.public_talk.find(
        (record) => record.type === dataView
      )?.value as number;

      if (talk) {
        const selectedTalk = talks.find(
          (record) => record.talk_number === talk
        );
        setSelectedTalk(selectedTalk);
      }
    }

    if (schedule_id) {
      const outgoingSchedule = schedule.weekend_meeting.outgoing_talks.find(
        (record) => record.id === schedule_id
      );

      if (outgoingSchedule?.public_talk) {
        const selectedTalk = talks.find(
          (record) => record.talk_number === outgoingSchedule.public_talk
        );
        setSelectedTalk(selectedTalk);
      }
    }
  }, [source, dataView, talks, schedule, schedule_id]);

  return {
    repeatNotice,
    talks,
    selectedTalk,
    handleTalkChange,
    openCatalog,
    handleOpenCatalog,
    handleCloseCatalog,
  };
};

export default usePublicTalkSelector;
