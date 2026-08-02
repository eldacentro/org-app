import { getI18n } from 'react-i18next';
import { getListLanguages } from '@services/app';
import { SongOverrideType, SongType } from '@definition/songs';
import { applySongsOverride } from '@utils/songs';
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

  // Y encima de lo del paquete, lo que se importó a mano.
  //
  // Aquí es donde conviven las dos cosas. `songs` se rehace ENTERA en cada
  // sincronización, así que una importación escrita directamente en esa tabla
  // duraría hasta el ciclo siguiente. Guardándola aparte y volviéndola a
  // aplicar aquí, el ciclo la rehace igual y la importación sigue en pie —
  // exactamente el trato que ya tienen los bosquejos de discursos públicos.
  const override = await appDb.songs_override.get('1');
  applySongsOverride(result, override);

  // Se rehace en cada sincronización, pero el contenido sale de las
  // traducciones (más los títulos importados): solo cambia de verdad al
  // cambiar de idioma, al actualizar la app o al guardar una importación. Ver
  // dbReplaceTableIfChanged.
  await dbReplaceTableIfChanged(appDb.songs, result, 'song_number');
};

export const dbSongOverrideGet = async (): Promise<
  SongOverrideType | undefined
> => {
  return await appDb.songs_override.get('1');
};

/**
 * Guarda los títulos importados y vuelve a reconstruir `songs` para que se
 * vean de inmediato, sin esperar al próximo cambio de idioma.
 *
 * No se sincroniza, y es una decisión, no un olvido: meter una tabla nueva en
 * la subida exige tocar el worker y que el backend (otro repositorio) la
 * acepte. Mientras tanto el cancionero importado es de ESTE dispositivo, y la
 * pantalla de Materiales de reunión lo dice.
 */
export const dbSongOverrideSave = async (
  override: Omit<SongOverrideType, 'id' | 'updatedAt'>
) => {
  await appDb.songs_override.put({
    ...override,
    id: '1',
    updatedAt: new Date().toISOString(),
  });

  await dbSongUpdate();
};
