import { SongOverrideType, SongType } from '@definition/songs';

/**
 * Pone encima de los títulos por defecto (los del paquete de la aplicación,
 * vía Crowdin) lo que un administrador importó a mano desde el `.jwpub` del
 * cancionero — solo los números donde de verdad difieren.
 *
 * Esto es lo que hace que las dos cosas convivan. `songs` se reconstruye
 * entera desde las traducciones al terminar CADA sincronización, así que una
 * importación escrita ahí duraría hasta el ciclo siguiente. Escribiéndola
 * aparte y volviéndola a aplicar en cada reconstrucción, el ciclo la rehace
 * igual y la importación sigue en pie.
 *
 * Función pura y sin `react-i18next` a propósito, igual que su hermana de
 * discursos públicos: se llama después de construir la lista desde el paquete,
 * y no tiene por qué saber de dónde salió esa lista.
 */
export const applySongsOverride = (
  result: SongType[],
  override?: SongOverrideType
) => {
  if (!override?.overrides) return;

  for (const [langCode, songs] of Object.entries(override.overrides)) {
    for (const [numberStr, title] of Object.entries(songs)) {
      const number = +numberStr;

      const findSong = result.find((record) => record.song_number === number);

      if (findSong) {
        findSong.song_title[langCode] = title;
      } else {
        result.push({ song_number: number, song_title: { [langCode]: title } });
      }
    }
  }
};
