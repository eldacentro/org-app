import { AssignmentCode, AssignmentType } from '@definition/assignment';
import { getTranslation } from '@services/i18n/translation';
import { getListLanguages } from '@services/app';
import { LANGUAGE_LIST } from '@constants/index';
import { dbReplaceTableIfChanged } from './rebuild';
import { localesListos } from '@services/i18n/ready';
import appDb from '@db/appDb';

export const dbAssignmentUpdate = async () => {
  const bReadObj: { [language: string]: string } = {};
  const initCallObj: { [language: string]: string } = {};
  const rvObj: { [language: string]: string } = {};
  const bsObj: { [language: string]: string } = {};
  const talkObj: { [language: string]: string } = {};
  const icVideoObj: { [language: string]: string } = {};
  const rvVideoObj: { [language: string]: string } = {};
  const otherObj: { [language: string]: string } = {};
  const memorialObj: { [language: string]: string } = {};
  const memorialVideoObj: { [language: string]: string } = {};
  const chairmanMMObj: { [language: string]: string } = {};
  const prayerMMObj: { [language: string]: string } = {};
  const tgwTalkObj: { [language: string]: string } = {};
  const tgwGemsObj: { [language: string]: string } = {};
  const lcPartObj: { [language: string]: string } = {};
  const cbsConductorObj: { [language: string]: string } = {};
  const cbsReaderObj: { [language: string]: string } = {};
  const initCallVariationsObj: { [language: string]: string } = {};
  const rvVariationsObj: { [language: string]: string } = {};
  const chairmanWMObj: { [language: string]: string } = {};
  const prayerWMObj: { [language: string]: string } = {};
  const speakerObj: { [language: string]: string } = {};
  const speakerSymposiumObj: { [language: string]: string } = {};
  const wtStudyReaderObj: { [language: string]: string } = {};
  const wtStudyConductor: { [language: string]: string } = {};
  const auxClassroomMMObj: { [language: string]: string } = {};
  const assistantOnlyMMObj: { [language: string]: string } = {};
  const startingConversationObj: { [language: string]: string } = {};
  const followingUpObj: { [language: string]: string } = {};
  const makingDisciplesObj: { [language: string]: string } = {};
  const explainingBeliefsObj: { [language: string]: string } = {};
  const dicussionObj: { [language: string]: string } = {};

  const languages = await getListLanguages();

  // Sin todos los idiomas cargados, `getTranslation` caería en el idioma de
  // reserva y guardaría castellano en la casilla del inglés. Ver
  // services/i18n/ready.ts.
  const listos = await localesListos(languages.map((lang) => lang.locale));

  if (!listos) return;

  for (const lang of languages) {
    const langCode = lang.code.toUpperCase();

    const isSource = LANGUAGE_LIST.find(
      (l) => l.threeLettersCode === lang.locale
    )?.source;

    if (!isSource && bReadObj[langCode]) continue;

    bReadObj[langCode] = getTranslation({
      key: 'tr_bibleReading',
      language: lang.locale,
    });
    initCallObj[langCode] = getTranslation({
      key: 'tr_initialCall',
      language: lang.locale,
    });
    rvObj[langCode] = getTranslation({
      key: 'tr_returnVisit',
      language: lang.locale,
    });
    bsObj[langCode] = getTranslation({
      key: 'tr_bibleStudy',
      language: lang.locale,
    });
    talkObj[langCode] = getTranslation({
      key: 'tr_talk',
      language: lang.locale,
    });
    otherObj[langCode] = getTranslation({
      key: 'tr_otherPart',
      language: lang.locale,
    });
    icVideoObj[langCode] = getTranslation({
      key: 'tr_initialCallVideo',
      language: lang.locale,
    });
    rvVideoObj[langCode] = getTranslation({
      key: 'tr_returnVisitVideo',
      language: lang.locale,
    });
    memorialObj[langCode] = getTranslation({
      key: 'tr_memorialInvite',
      language: lang.locale,
    });
    memorialVideoObj[langCode] = getTranslation({
      key: 'tr_memorialInviteVideo',
      language: lang.locale,
    });

    chairmanMMObj[langCode] =
      getTranslation({
        key: 'tr_chairman',
        language: lang.locale,
      }) +
      ' (' +
      getTranslation({
        key: 'tr_midweekMeeting',
        language: lang.locale,
      }) +
      ')';

    prayerMMObj[langCode] =
      getTranslation({
        key: 'tr_prayer',
        language: lang.locale,
      }) +
      ' (' +
      getTranslation({
        key: 'tr_midweekMeeting',
        language: lang.locale,
      }) +
      ')';

    tgwTalkObj[langCode] = getTranslation({
      key: 'tr_tgwTalk',
      language: lang.locale,
    });
    tgwGemsObj[langCode] = getTranslation({
      key: 'tr_tgwGems',
      language: lang.locale,
    });
    lcPartObj[langCode] = getTranslation({
      key: 'tr_lcPart',
      language: lang.locale,
    });
    cbsConductorObj[langCode] = getTranslation({
      key: 'tr_cbsConductor',
      language: lang.locale,
    });
    cbsReaderObj[langCode] = getTranslation({
      key: 'tr_cbsReader',
      language: lang.locale,
    });
    initCallVariationsObj[langCode] = getTranslation({
      key: 'tr_initialCallVariations',
      language: lang.locale,
    });
    rvVariationsObj[langCode] = getTranslation({
      key: 'tr_returnVisitVariations',
      language: lang.locale,
    });

    chairmanWMObj[langCode] =
      getTranslation({
        key: 'tr_chairman',
        language: lang.locale,
      }) +
      ' (' +
      getTranslation({
        key: 'tr_weekendMeeting',
        language: lang.locale,
      }) +
      ')';

    prayerWMObj[langCode] =
      getTranslation({
        key: 'tr_prayer',
        language: lang.locale,
      }) +
      ' (' +
      getTranslation({
        key: 'tr_weekendMeeting',
        language: lang.locale,
      }) +
      ')';

    speakerObj[langCode] = getTranslation({
      key: 'tr_speaker',
      language: lang.locale,
    });
    speakerSymposiumObj[langCode] = getTranslation({
      key: 'tr_speakerSymposium',
      language: lang.locale,
    });
    wtStudyReaderObj[langCode] = getTranslation({
      key: 'tr_watchtowerStudyReader',
      language: lang.locale,
    });
    wtStudyConductor[langCode] = getTranslation({
      key: 'tr_watchtowerStudyConductor',
      language: lang.locale,
    });
    auxClassroomMMObj[langCode] = getTranslation({
      key: 'tr_auxClassCounselor',
      language: lang.locale,
    });
    assistantOnlyMMObj[langCode] = getTranslation({ key: 'tr_assistantOnly' });
    startingConversationObj[langCode] = getTranslation({
      key: 'tr_startingConversation',
      language: lang.locale,
    });
    followingUpObj[langCode] = getTranslation({
      key: 'tr_followingUp',
      language: lang.locale,
    });
    makingDisciplesObj[langCode] = getTranslation({
      key: 'tr_makingDisciples',
      language: lang.locale,
    });
    explainingBeliefsObj[langCode] = getTranslation({
      key: 'tr_explainingBeliefs',
      language: lang.locale,
    });
    dicussionObj[langCode] = getTranslation({
      key: 'tr_discussion',
      language: lang.locale,
    });
  }

  const records: AssignmentType[] = [];

  records.push({
    code: AssignmentCode.MM_BibleReading,
    maleOnly: true,
    assignable: true,
    type: 'tgw',
    assignment_type_name: {
      ...bReadObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_InitialCall,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...initCallObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_ReturnVisit,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...rvObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_BibleStudy,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...bsObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Talk,
    maleOnly: true,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...talkObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_InitialCallVideo,
    maleOnly: false,
    assignable: false,
    type: 'ayf',
    assignment_type_name: {
      ...icVideoObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_ReturnVisitVideo,
    maleOnly: false,
    assignable: false,
    type: 'ayf',
    assignment_type_name: {
      ...rvVideoObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Other,
    maleOnly: false,
    assignable: false,
    type: 'ayf',
    assignment_type_name: {
      ...otherObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Memorial,
    maleOnly: false,
    linkTo: AssignmentCode.MM_InitialCall,
    assignable: false,
    type: 'ayf',
    assignment_type_name: {
      ...memorialObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Chairman,
    maleOnly: true,
    assignable: true,
    type: 'mm',
    assignment_type_name: {
      ...chairmanMMObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Prayer,
    maleOnly: true,
    assignable: true,
    type: 'mm',
    assignment_type_name: {
      ...prayerMMObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_TGWTalk,
    maleOnly: true,
    assignable: true,
    type: 'tgw',
    assignment_type_name: {
      ...tgwTalkObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_TGWGems,
    maleOnly: true,
    assignable: true,
    type: 'tgw',
    assignment_type_name: {
      ...tgwGemsObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_LCPart,
    maleOnly: true,
    assignable: true,
    type: 'lc',
    assignment_type_name: {
      ...lcPartObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_CBSConductor,
    maleOnly: true,
    assignable: true,
    type: 'lc',
    assignment_type_name: {
      ...cbsConductorObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_CBSReader,
    maleOnly: true,
    assignable: true,
    type: 'lc',
    assignment_type_name: {
      ...cbsReaderObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_MemorialVideo,
    maleOnly: false,
    linkTo: AssignmentCode.MM_InitialCallVideo,
    assignable: false,
    type: 'ayf',
    assignment_type_name: {
      ...memorialVideoObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_Chairman,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...chairmanWMObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_Prayer,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...prayerWMObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_Speaker,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...speakerObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_SpeakerSymposium,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...speakerSymposiumObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_WTStudyReader,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...wtStudyReaderObj,
    },
  });

  records.push({
    code: AssignmentCode.WM_WTStudyConductor,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...wtStudyConductor,
    },
  });

  records.push({
    code: AssignmentCode.MM_AuxiliaryCounselor,
    maleOnly: true,
    assignable: true,
    assignment_type_name: {
      ...auxClassroomMMObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_AssistantOnly,
    maleOnly: true,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...assistantOnlyMMObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_StartingConversation,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...startingConversationObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_FollowingUp,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...followingUpObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_MakingDisciples,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...makingDisciplesObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_ExplainingBeliefs,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...explainingBeliefsObj,
    },
  });

  records.push({
    code: AssignmentCode.MM_Discussion,
    maleOnly: false,
    assignable: true,
    type: 'ayf',
    assignment_type_name: {
      ...dicussionObj,
    },
  });

  // handle initial call variation (140-169)
  let codeIndice = 140;
  for (const [key, value] of Object.entries(initCallVariationsObj)) {
    if (value && value !== '0' && codeIndice < 170) {
      const variations = value.split('|');
      for (const variation of variations) {
        records.push({
          code: codeIndice,
          maleOnly: false,
          linkTo: AssignmentCode.MM_InitialCall,
          assignable: false,
          type: 'ayf',
          assignment_type_name: {
            [key]: variation,
          },
        });

        codeIndice++;
      }
    }
  }

  // handle return call variation (170-199)
  codeIndice = 170;
  for (const [key, value] of Object.entries(rvVariationsObj)) {
    if (value && value !== '0' && codeIndice < 200) {
      const variations = value.split('|');
      for (const variation of variations) {
        records.push({
          code: codeIndice,
          maleOnly: false,
          linkTo: AssignmentCode.MM_ReturnVisit,
          assignable: false,
          type: 'ayf',
          assignment_type_name: {
            [key]: variation,
          },
        });

        codeIndice++;
      }
    }
  }

  // Antes esto eran un `clear()` y treinta y dos `put()` sueltos, o sea más de
  // treinta avisos a los observadores de la tabla en CADA sincronización, con
  // el mismo contenido de siempre (sale de las traducciones). Las asignaciones
  // las lee entera la Reunión de entre semana: era el parpadeo más ruidoso.
  // Ahora se compara y, si hace falta escribir, se hace de una sola vez.
  await dbReplaceTableIfChanged(appDb.assignment, records, 'code');
};
