import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { publicTalksLocaleState } from '@states/public_talks';
import { dbVisitingSpeakersUpdate } from '@services/dexie/visiting_speakers';
import { speakersCongregationsState } from '@states/speakers_congregations';
import { SongType } from '@definition/songs';
import { PublicTalkLocaleType } from '@definition/public_talks';

const useTalksSongs = (speaker: VisitingSpeakerType) => {
  const publicTalks = useAtomValue(publicTalksLocaleState);
  const congregations = useAtomValue(speakersCongregationsState);

  const [isEdit, setIsEdit] = useState(false);

  const congregation = congregations.find(
    (record) => record.id === speaker.speaker_data.cong_id
  );

  const talks = speaker.speaker_data.talks
    .filter((record) => record._deleted === false)
    .map((record) => {
      const talk = publicTalks.find(
        (item) => item.talk_number === record.talk_number
      );

      const songs = structuredClone(record.talk_songs).sort((a, b) =>
        a < b ? -1 : 1
      );

      return { talk, songs };
    })
    // Un talk_number que ya no existe en el bosquejo local (p. ej.
    // importado del Sheet del circuito con un número descontinuado o de
    // otro idioma) no debe reventar la lista — se omite en vez de colar un
    // `talk: undefined`.
    .filter(
      (record): record is { talk: PublicTalkLocaleType; songs: number[] } =>
        record.talk !== undefined
    );

  const handleToggleEdit = () => setIsEdit((prev) => !prev);

  const handleSongsTalkUpdate = async (
    talk_number: number,
    songs: SongType[]
  ) => {
    const talks = structuredClone(speaker.speaker_data.talks);
    const findTalk = talks.find((record) => record.talk_number === talk_number);
    findTalk.talk_songs = songs.map((record) => record.song_number);
    findTalk.updatedAt = new Date().toISOString();

    await dbVisitingSpeakersUpdate(
      { 'speaker_data.talks': talks },
      speaker.person_uid
    );
  };

  const handleSongsTalkDelete = async (talk_number: number, song: number) => {
    const talks = structuredClone(speaker.speaker_data.talks);
    const findTalk = talks.find((record) => record.talk_number === talk_number);
    findTalk.talk_songs = findTalk.talk_songs.filter(
      (record) => record !== song
    );
    findTalk.updatedAt = new Date().toISOString();

    await dbVisitingSpeakersUpdate(
      { 'speaker_data.talks': talks },
      speaker.person_uid
    );
  };

  return {
    talks,
    handleSongsTalkUpdate,
    handleSongsTalkDelete,
    handleToggleEdit,
    isEdit,
    // «Sus discursos los manda su fuente, aquí no se tocan» — salvo que a este
    // orador lo hayamos añadido nosotros a mano, mientras la fuente no lo
    // traiga: entonces sus discursos son nuestros y hay que poder ponerlos,
    // que es justo para lo que se añade (cuadrar un bosquejo con meses de
    // antelación). Cuando la fuente lo reclame, apaga la marca y este editor
    // vuelve a cerrarse solo.
    cong_synced:
      (congregation?.cong_data.cong_id.length ?? 0) > 0 &&
      speaker.speaker_data.manual?.value !== true,
  };
};

export default useTalksSongs;
