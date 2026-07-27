import { getI18n } from 'react-i18next';
import { getListLanguages } from '@services/app';
import { SongType } from '@definition/songs';
import { dbReplaceTableIfChanged } from './rebuild';
import appDb from '@db/appDb';

export const dbSongUpdate = async () => {
  const result: SongType[] = [];

  const languages = await getListLanguages();

  for (const lang of languages) {
    const langCode = lang.code.toUpperCase();

    const resource = getI18n().options.resources[lang.locale];

    if (!resource) continue;

    const translations = resource.songs;

    if (!translations) continue;

    for (const [key, value] of Object.entries(translations)) {
      const number = +key.split('_')[2];

      const findTalk = result.find((record) => record.song_number === number);

      if (findTalk) {
        findTalk.song_title[langCode] = value;
      }

      if (!findTalk) {
        result.push({ song_number: number, song_title: { [langCode]: value } });
      }
    }
  }

  // Se rehace en cada sincronización, pero el contenido sale de las
  // traducciones: solo cambia de verdad al cambiar de idioma o al actualizar
  // la app. Ver dbReplaceTableIfChanged.
  await dbReplaceTableIfChanged(appDb.songs, result, 'song_number');
};
