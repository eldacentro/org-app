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
 * Que lo importado VIAJE.
 *
 * Sin esta marca se quedaría en el dispositivo que lo importó: la subida solo
 * mete una tabla cuando hay algo pendiente que subir, y esa es justo la regla
 * que impide que la congregación entera se sincronice cada pocos segundos sin
 * que nada haya cambiado (ver CLAUDE.md).
 */
const dbUpdateSongsOverrideMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.songs_override = {
    ...metadata.metadata.songs_override,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

const triggerSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
  );
};

/**
 * Guarda los títulos importados, reconstruye `songs` para que se vean de
 * inmediato —sin esperar al próximo cambio de idioma— y lo manda al resto de
 * la congregación.
 *
 * Lo mismo que hacen los bosquejos de discursos públicos, pieza por pieza.
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

  await dbUpdateSongsOverrideMetadata();
  triggerSync();
};
