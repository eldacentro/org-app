import { MidweekMeetingDataType } from '@definition/schedules';

/**
 * Cómo se llama cada parte y quién la tiene.
 *
 * Todo sale de `schedulesMidweekData`, que es lo mismo que rellena el programa
 * impreso. No se vuelve a leer el material ni a buscar a nadie: si el nombre
 * está mal aquí, está mal también en la hoja, y se arregla en un solo sitio.
 */
export type MeetingRunPartInfo = {
  /** De qué va la parte. */
  label: string;
  /** Quién la tiene. Vacío en las que no lleva nadie (las canciones). */
  person: string;
  /** Las asignaciones de estudiante, que son las que llevan cronómetro aparte. */
  student: boolean;
};

/**
 * Los nombres compuestos vienen con un salto de línea dentro (estudiante y
 * ayudante, conductor y lector) porque así se imprimen en la hoja. En una
 * barra de una sola línea eso rompe la altura, así que se separan con un punto.
 */
const limpio = (value?: string) =>
  (value ?? '').split('\u000A').join(' · ').trim();

export const buildRunPartsInfo = (
  data: MidweekMeetingDataType,
  t: (key: string) => string
): Record<string, MeetingRunPartInfo> => {
  const info: Record<string, MeetingRunPartInfo> = {};

  const poner = (key: string, label: string, person = '', student = false) => {
    if (!label) return;

    info[key] = { label, person: limpio(person), student };
  };

  // La canción no la «hace» nadie: quien sale ahí es el que echa la oración, y
  // sin decirlo parecía que la canción era suya. El hueco del programa son los
  // dos juntos.
  const cancionPrimera = limpio(data.song_first);

  poner(
    'pgm_start',
    cancionPrimera ? `${cancionPrimera} y oración` : 'Canción y oración',
    data.opening_prayer_name ? `Oración: ${data.opening_prayer_name}` : ''
  );
  poner('opening_comments', t('tr_openingComments'), data.chairman_A_name);

  poner('tgw_talk', limpio(data.tgw_talk_src), data.tgw_talk_name);
  poner('tgw_gems', limpio(data.tgw_gems_src), data.tgw_gems_name);
  poner(
    'tgw_bible_reading',
    t('tr_bibleReading'),
    data.tgw_bible_reading_A_name,
    true
  );

  for (let i = 1; i < 5; i++) {
    poner(
      `ayf_part${i}`,
      limpio(data[`ayf_part${i}_type_name`]),
      data[`ayf_part${i}_A_student_name`] ?? data[`ayf_part${i}_A_name`],
      true
    );
  }

  poner('lc_middle_song', limpio(data.lc_middle_song));

  for (let i = 1; i < 4; i++) {
    poner(
      `lc_part${i}`,
      limpio(data[`lc_part${i}_src`]),
      data[`lc_part${i}_name`]
    );
  }

  poner('cbs', limpio(data.lc_cbs_title), data.lc_cbs_conductor_name);
  poner(
    'concluding_comments',
    t('tr_concludingComments'),
    data.chairman_A_name
  );
  poner('co_talk', limpio(data.lc_co_talk), data.co_name);

  return info;
};
