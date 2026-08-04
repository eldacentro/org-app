import { loadPub } from 'meeting-schedules-parser';
import { extractJwpubDocids, JwpubDocids } from './jwpub_docid_extractor';
import { store } from '@states/index';
import {
  ApplyMinistryType,
  CongregationBibleStudyType,
  LivingAsChristiansType,
  SourceAssignmentType,
  SourceWeekIncomingType,
  SourceWeekType,
} from '@definition/sources';
import { assignmentTypeAYFOnlyState } from '@states/assignment';
import { dbSourcesSave } from '@services/dexie/sources';
import { dbSchedCheck } from '@services/dexie/schedules';
import { cookiesConsentState } from '@states/app';
import { getTranslation } from '@services/i18n/translation';
import { MeetingType } from '@definition/app';
import {
  JWLangState,
  sourcesJWAutoImportFrequencyState,
  sourcesJWAutoImportState,
} from '@states/settings';
import { addWeeks, formatDate, getWeekDate } from '@utils/date';
import { STORAGE_KEY } from '@constants/index';

/**
 * Qué ha traído de verdad una importación.
 *
 * Sin esto, importar un .jwpub que no aporta nada y uno que trae cinco
 * semanas se ven EXACTAMENTE igual: "Importado correctamente". Cuando algo no
 * cuadra —el archivo equivocado, un idioma que no toca, una publicación que el
 * lector no reconoce— no hay forma de saberlo desde la aplicación.
 */
export type SourcesImportResult = {
  /** Semanas con programa de la Guía de actividades. */
  midweek: number;
  /** Semanas con artículo de estudio de La Atalaya. */
  weekend: number;
  /** De cuántas se pudo guardar el identificador de semana/artículo. */
  withDocid: number;
};

export const sourcesImportEPUB = async (
  fileEPUB
): Promise<SourcesImportResult> => {
  const [data, docids] = await Promise.all([
    loadPub(fileEPUB),
    extractJwpubDocids(fileEPUB),
  ]);

  return await sourcesFormatAndSaveData(data, docids);
};

export const sourcesImportJW = async (dataJw) => {
  const result = await sourcesFormatAndSaveData(dataJw);

  const isAutoImportEnabled = store.get(sourcesJWAutoImportState);
  const cookiesConsent = store.get(cookiesConsentState);

  const autoImportFrequency = store.get(sourcesJWAutoImportFrequencyState);

  if (cookiesConsent && isAutoImportEnabled) {
    const nextSync = addWeeks(new Date(), autoImportFrequency);

    localStorage.setItem(STORAGE_KEY.source_import, nextSync.toISOString());
  }

  return result;
};

const remapAssignmentType = (week: string, type: number) => {
  if (week < '2024/01/01') {
    return type;
  }

  switch (type) {
    case 101:
      return 123;
    case 102:
      return 124;
    default:
      return type;
  }
};

const sourcesFormatAndSaveData = async (
  data: SourceWeekIncomingType[],
  docids?: JwpubDocids
): Promise<SourcesImportResult> => {
  const source_lang = store.get(JWLangState);
  const assTypeList = store.get(assignmentTypeAYFOnlyState);

  // De dónde viene esta importación. Los identificadores de semana solo los
  // trae el .jwpub, así que su presencia distingue las dos vías.
  const origen = {
    type: (docids ? 'jwpub' : 'jw') as 'jw' | 'jwpub',
    updatedAt: new Date().toISOString(),
    // Un .jwpub trae UN número, así que todas sus semanas comparten éste. Va
    // aquí y no en la semana porque es una propiedad de la importación: quién
    // trajo este material y de qué número.
    ...(docids?.numero && { issue: docids.numero }),
  };

  // Cada archivo trae una publicación: la Guía va por su cuenta y La Atalaya
  // por la suya. Se lleva la cuenta por separado para que el índice de los
  // identificadores cuadre con las semanas de ESA publicación.
  let indiceMWB = 0;
  let indiceW = 0;

  const result: SourcesImportResult = { midweek: 0, weekend: 0, withDocid: 0 };

  for (const src of data) {
    const obj = {} as SourceWeekType;

    const isMWB = Object.keys(src).includes('mwb_week_date_locale');
    const isW = Object.keys(src).includes('w_study_date_locale');

    obj.weekOf = src.mwb_week_date || src.w_study_date || src.week_date;

    const mondayDate = formatDate(
      getWeekDate(new Date(obj.weekOf)),
      'yyyy/MM/dd'
    );

    if (mondayDate === obj.weekOf) {
      if (isMWB) {
        let assType: number;

        obj.midweek_meeting = {} as SourceWeekType['midweek_meeting'];

        obj.midweek_meeting.week_date_locale = {
          [source_lang]: src.mwb_week_date_locale,
        };
        obj.midweek_meeting.weekly_bible_reading = {
          [source_lang]: src.mwb_weekly_bible_reading,
        };
        obj.midweek_meeting.song_first = {
          [source_lang]: src.mwb_song_first.toString(),
        };
        obj.midweek_meeting.tgw_talk = {
          src: { [source_lang]: src.mwb_tgw_talk_title },
          time: { default: 10, override: [] },
        };
        obj.midweek_meeting.tgw_gems = {
          title: { [source_lang]: src.mwb_tgw_gems_title },
          time: { default: 10, override: [] },
        };
        obj.midweek_meeting.tgw_bible_reading = {
          src: { [source_lang]: src.mwb_tgw_bread },
          title: { [source_lang]: src.mwb_tgw_bread_title },
        };

        const cnAYF = src.mwb_ayf_count;
        obj.midweek_meeting.ayf_count = { [source_lang]: src.mwb_ayf_count };

        assType =
          assTypeList.find(
            (type) =>
              type.label.replace(/\u200B/g, '') ===
              src.mwb_ayf_part1_type.replace(/\u200B/g, '')
          )?.value || 127;

        assType = remapAssignmentType(obj.weekOf, assType);

        obj.midweek_meeting.ayf_part1 = {
          src: { [source_lang]: src.mwb_ayf_part1 },
          time: { [source_lang]: src.mwb_ayf_part1_time },
          title: { [source_lang]: src.mwb_ayf_part1_title },
          type: { [source_lang]: assType },
        };

        if (cnAYF > 1) {
          assType =
            assTypeList.find(
              (type) =>
                type.label.replace(/\u200B/g, '') ===
                src.mwb_ayf_part2_type.replace(/\u200B/g, '')
            )?.value || 127;

          assType = remapAssignmentType(obj.weekOf, assType);

          obj.midweek_meeting.ayf_part2 = {
            src: { [source_lang]: src.mwb_ayf_part2 },
            time: { [source_lang]: src.mwb_ayf_part2_time },
            title: { [source_lang]: src.mwb_ayf_part2_title },
            type: { [source_lang]: assType },
          };
        }

        if (cnAYF > 2) {
          assType =
            assTypeList.find(
              (type) =>
                type.label.replace(/\u200B/g, '') ===
                src.mwb_ayf_part3_type.replace(/\u200B/g, '')
            )?.value || 127;

          assType = remapAssignmentType(obj.weekOf, assType);

          obj.midweek_meeting.ayf_part3 = {
            src: { [source_lang]: src.mwb_ayf_part3 },
            time: { [source_lang]: src.mwb_ayf_part3_time },
            title: { [source_lang]: src.mwb_ayf_part3_title },
            type: { [source_lang]: assType },
          };
        }

        if (cnAYF > 3) {
          assType =
            assTypeList.find(
              (type) =>
                type.label.replace(/\u200B/g, '') ===
                src.mwb_ayf_part4_type.replace(/\u200B/g, '')
            )?.value || 127;

          assType = remapAssignmentType(obj.weekOf, assType);

          obj.midweek_meeting.ayf_part4 = {
            src: { [source_lang]: src.mwb_ayf_part4 },
            time: { [source_lang]: src.mwb_ayf_part4_time },
            title: { [source_lang]: src.mwb_ayf_part4_title },
            type: { [source_lang]: assType },
          };
        }

        obj.midweek_meeting.song_middle = {
          [source_lang]: src.mwb_song_middle.toString(),
        };
        obj.midweek_meeting.lc_count = {
          default: { [source_lang]: src.mwb_lc_count },
          override: [],
        };
        obj.midweek_meeting.lc_part1 = {
          title: {
            default: { [source_lang]: src.mwb_lc_part1_title },
            override: [],
          },
          time: {
            default: { [source_lang]: src.mwb_lc_part1_time },
            override: [],
          },
          desc: {
            default: { [source_lang]: src.mwb_lc_part1_content },
            override: [],
          },
        };

        if (src.mwb_lc_count > 1) {
          obj.midweek_meeting.lc_part2 = {
            title: {
              default: { [source_lang]: src.mwb_lc_part2_title },
              override: [],
            },
            time: {
              default: { [source_lang]: src.mwb_lc_part2_time },
              override: [],
            },
            desc: {
              default: { [source_lang]: src.mwb_lc_part2_content },
              override: [],
            },
          };
        }

        obj.midweek_meeting.lc_cbs = {
          src: { [source_lang]: src.mwb_lc_cbs },
          time: { default: 30, override: [] },
          title: {
            default: { [source_lang]: src.mwb_lc_cbs_title },
            override: [],
          },
        };
        obj.midweek_meeting.song_conclude = {
          default: { [source_lang]: src.mwb_song_conclude.toString() },
          override: [],
        };
      }

      if (isW) {
        obj.weekend_meeting = {} as SourceWeekType['weekend_meeting'];

        obj.weekend_meeting.song_first = [];
        obj.weekend_meeting.public_talk = [];
        obj.weekend_meeting.co_talk_title = {
          public: { src: '', updatedAt: '' },
          service: { src: '', updatedAt: '' },
        };
        obj.weekend_meeting.song_middle = {
          [source_lang]: src.w_study_opening_song.toString(),
        };
        obj.weekend_meeting.w_study = { [source_lang]: src.w_study_title };
        obj.weekend_meeting.song_conclude = {
          default: { [source_lang]: src.w_study_concluding_song.toString() },
          override: [],
        };
      }

      if (isMWB) {
        const docid = docids?.mwb?.[indiceMWB];
        if (docid !== undefined) {
          obj.mwb_week_docid = docid;
          result.withDocid++;
        }

        indiceMWB++;
        obj.import_source = { midweek: origen };
        result.midweek++;
      }

      if (isW) {
        const docid = docids?.w?.[indiceW];
        if (docid !== undefined) {
          obj.w_study_docid = docid;
          result.withDocid++;
        }

        indiceW++;
        obj.import_source = { ...obj.import_source, weekend: origen };
        result.weekend++;
      }

      await dbSourcesSave(obj);

      // check if record exists in sched table
      await dbSchedCheck(obj.weekOf);
    }
  }

  return result;
};

export const sourcesCheckAYFExplainBeliefsAssignment = (
  source: string,
  language: string
) => {
  if (source) {
    const boundary = '(?:^|\\s|$)';
    const talk = getTranslation({ key: 'tr_talk', language });
    const demonstration = getTranslation({ key: 'tr_demonstration', language });
    const searchKey = `${boundary}${talk}|${boundary}${demonstration}`;
    const regex = new RegExp(searchKey, 'i');
    const result = source.match(regex);

    if (result?.length > 0) {
      const isTalk = result[0].toLowerCase() === talk.toLowerCase();

      return isTalk;
    }
  }

  return false;
};

export const sourcesCheckLCElderAssignment = (
  source: string,
  desc: string,
  language: string
) => {
  if (source) {
    let isElderPart = false;

    const elderVariations = getTranslation({
      key: 'tr_lcSourceElderVariations',
      language,
    });

    const search = `(${elderVariations})`;
    const regex = new RegExp(search.toLowerCase());
    const array = regex.exec(source.toLowerCase());
    isElderPart = Array.isArray(array);

    if (!isElderPart && desc) {
      const contentVariations = getTranslation({
        key: 'tr_lcContentElderVariations',
        language,
      });

      const search = `(${contentVariations})`;
      const regex = new RegExp(search.toLowerCase());
      const array = regex.exec(desc.toLowerCase());
      isElderPart = Array.isArray(array);
    }

    return isElderPart;
  }

  return false;
};

export const sourcesCheckLCAssignments = (source: string, language: string) => {
  if (source) {
    const noAssigned = getTranslation({
      key: 'tr_lcNoAssignedVariations',
      language,
    });

    const search = `(${noAssigned})`;
    const regex = new RegExp(search.toLowerCase());
    const array = regex.exec(source.toLowerCase());

    return Array.isArray(array);
  }

  return false;
};

/**
 * ¿Hay que poner a alguien en esta parte de «Nuestra vida cristiana»?
 *
 * Dos partes se reconocen por su título —«Logros de la organización» y el
 * «Informe del Cuerpo Gobernante»— y normalmente NO llevan a nadie: son un
 * vídeo o un informe que presenta quien preside. Pero eso no vale para todas
 * las congregaciones: donde se llevan como análisis con el auditorio hay que
 * asignar a alguien, y hasta ahora no había forma — la casilla ni salía.
 *
 * De ahí el ajuste. Vive aquí, en una sola función, porque la misma respuesta
 * la necesitan dos sitios que TIENEN que decir lo mismo: la casilla del editor y
 * el autocompletado. Si se separaran, la aplicación pediría un hermano en
 * pantalla y el autocompletado se saltaría esa parte para siempre.
 */
export const sourcesLCPartNeedsAssignee = (
  title: string,
  language: string,
  specialPartsAssigned: boolean
) => {
  if (specialPartsAssigned) return true;

  return !sourcesCheckLCAssignments(title, language);
};

export const sourcesPartTiming = (
  source: SourceWeekType,
  type: SourceAssignmentType,
  dataView: string,
  lang: string
) => {
  if (type === 'tgw_talk') {
    const part = source.midweek_meeting.tgw_talk;
    const timeOverride =
      part.time.override.find((record) => record.type === dataView)?.value || 0;
    const timeDefault = part.time.default as number;
    const time = timeOverride > 0 ? timeOverride : timeDefault;

    return time;
  }

  if (type === 'tgw_gems') {
    const part = source.midweek_meeting.tgw_gems;
    const timeOverride =
      part.time.override.find((record) => record.type === dataView)?.value || 0;
    const timeDefault = part.time.default as number;
    const time = timeOverride > 0 ? timeOverride : timeDefault;

    return time;
  }

  if (type === 'lc_part1') {
    const part = source.midweek_meeting.lc_part1;
    const timeOverride =
      part.time.override.find((record) => record.type === dataView)?.value || 0;
    const timeDefault = part.time.default[lang];
    const time = timeOverride > 0 ? timeOverride : timeDefault;

    return time;
  }

  if (type === 'lc_part2') {
    const part = source.midweek_meeting.lc_part2;
    const timeOverride =
      part.time.override.find((record) => record.type === dataView)?.value || 0;
    const timeDefault = part.time.default[lang];
    const time = timeOverride > 0 ? timeOverride : timeDefault;

    return time;
  }

  if (type === 'lc_part3') {
    const part = source.midweek_meeting.lc_part3;
    const time =
      part.time.find((record) => record.type === dataView)?.value || 0;

    return time;
  }

  if (type === 'lc_cbs') {
    const part = source.midweek_meeting.lc_cbs;
    const timeOverride =
      part.time.override.find((record) => record.type === dataView)?.value || 0;
    const timeDefault = part.time.default as number;
    const time = timeOverride > 0 ? timeOverride : timeDefault;

    return time;
  }

  if (type.includes('ayf_part')) {
    const part = source.midweek_meeting[type] as ApplyMinistryType;
    const time = part.time[lang];

    return time;
  }
};

export const sourcesCountLC = (
  source: SourceWeekType,
  dataView: string,
  lang: string
) => {
  const countDefault = source.midweek_meeting.lc_count.default[lang];
  const countOverride =
    source.midweek_meeting.lc_count.override.find(
      (record) => record.type === dataView
    )?.value || 0;

  const count = countOverride > 0 ? countOverride : countDefault;

  return count;
};

export const sourcesLCGetTitle = (
  lcPart: LivingAsChristiansType,
  dataView: string,
  lang: string
) => {
  const titleDefault = lcPart.title.default[lang];
  const titleOverride =
    lcPart.title.override.find((record) => record.type === dataView)?.value ||
    '';

  const title = titleOverride.length > 0 ? titleOverride : titleDefault;

  return title;
};

export const sourcesCBSGetTitle = (
  cbs: CongregationBibleStudyType,
  dataView: string,
  lang: string
) => {
  const titleDefault = cbs.title.default[lang];
  const titleOverride =
    cbs.title.override.find((record) => record.type === dataView)?.value || '';

  const title = titleOverride.length > 0 ? titleOverride : titleDefault;

  return title;
};

export const sourcesSongConclude = ({
  dataView,
  lang,
  meeting,
  source,
}: {
  meeting: MeetingType;
  source: SourceWeekType;
  dataView: string;
  lang: string;
}) => {
  let song: string;

  if (meeting === 'midweek') {
    const songDefault = source.midweek_meeting.song_conclude.default[lang];
    const songOverride =
      source.midweek_meeting.song_conclude.override.find(
        (record) => record.type === dataView
      )?.value || '';

    song = songOverride.length > 0 ? songOverride : songDefault;
  }

  if (meeting === 'weekend') {
    const songDefault = source.weekend_meeting.song_conclude.default[lang];
    const songOverride =
      source.weekend_meeting.song_conclude.override.find(
        (record) => record.type === dataView
      )?.value || '';

    song = songOverride.length > 0 ? songOverride : songDefault;
  }

  return song;
};

export const sourcesLCGet = (
  part: LivingAsChristiansType,
  dataView: string,
  lang: string
) => {
  const srcOverride = part.title.override.find(
    (record) => record.type === dataView
  );

  const srcDefault = part.title.default[lang];
  const src = srcOverride?.value.length > 0 ? srcOverride.value : srcDefault;

  const descOverride = part.desc.override.find(
    (record) => record.type === dataView
  );

  const descDefault = part.desc.default[lang];
  const desc =
    descOverride?.value.length > 0 ? descOverride.value : descDefault;

  return { src, desc };
};
