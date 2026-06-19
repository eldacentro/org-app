import { de, enUS, es, fr, it, ptBR } from 'date-fns/locale';
import { AppRoleType, LanguageItem } from '@definition/app';
import { AssignmentCode } from '@definition/assignment';
import { Week } from '@definition/week_type';

export const LANGUAGE_LIST: LanguageItem[] = [
  {
    code: 'x',
    locale: 'de-DE',
    name: 'Deutsch',
    source: true,
    threeLettersCode: 'deu',
    browserLangCode: ['de-DE', 'de'],
    fnsLocale: de,
  },
  {
    code: 'e',
    locale: 'en',
    name: 'English',
    source: true,
    threeLettersCode: 'eng',
    browserLangCode: ['en-US', 'en-GB', 'en'],
    fnsLocale: enUS,
  },
  {
    code: 's',
    locale: 'es-ES',
    name: 'Español',
    source: true,
    threeLettersCode: 'spa',
    browserLangCode: [
      'es',
      'es-ES',
      'es-AR',
      'es-BO',
      'es-CL',
      'es-CO',
      'es-CR',
      'es-CU',
      'es-DO',
      'es-EC',
      'es-GQ',
      'es-GT',
      'es-HN',
      'es-MX',
      'es-NI',
      'es-PA',
      'es-PE',
      'es-PR',
      'es-PY',
      'es-SV',
      'es-US',
      'es-UY',
      'es-VE',
    ],
    fnsLocale: es,
  },
  {
    code: 'f',
    locale: 'fr-FR',
    name: 'Français',
    source: true,
    threeLettersCode: 'fra',
    browserLangCode: ['fr-FR', 'fr'],
    fnsLocale: fr,
  },
  {
    code: 'i',
    locale: 'it-IT',
    name: 'Italiano',
    source: true,
    threeLettersCode: 'ita',
    browserLangCode: ['it-IT', 'it'],
    fnsLocale: it,
  },
  {
    code: 't',
    locale: 'pt-POR',
    name: 'Português',
    source: true,
    threeLettersCode: 'por',
    browserLangCode: ['pt-BR', 'pt'],
    fnsLocale: ptBR,
  },
].sort((a, b) => a.code.localeCompare(b.code));

export const APP_READ_ONLY_ROLES: AppRoleType[] = [
  'view_schedules',
  'elder',
  'ms',
  'publisher',
  'group_overseers',
  'language_group_overseers',
];

export const APP_ROLES: AppRoleType[] = [
  'admin',
  'coordinator',
  'midweek_schedule',
  'weekend_schedule',
  'public_talk_schedule',
  'attendance_tracking',
  'departments_schedule',
  'secretary',
  'service_overseer',
  ...APP_READ_ONLY_ROLES,
];

export const VIP_ROLES: AppRoleType[] = [
  'admin',
  'coordinator',
  'midweek_schedule',
  'weekend_schedule',
  'public_talk_schedule',
  'departments_schedule',
  'secretary',
  'service_overseer',
  'elder',
  'group_overseers',
  'language_group_overseers',
];

export const POCKET_ROLES: AppRoleType[] = [
  'elder',
  'ms',
  'publisher',
  'view_schedules',
];

// Single-language lock: while every congregation using this app speaks
// Spanish, browser-language auto-detection caused some devices to land on
// English (then mix with Spanish strings that came from elsewhere — data,
// dates, etc.), producing "Spanglish". Setting this forces the UI language
// to Spanish for everyone, on every load, ignoring navigator.language.
// To restore multi-language support later: set this back to `null`. None of
// the i18n infra (locale JSON files, hooks, LanguageSwitcher) was removed —
// only gated behind this flag — so re-enabling is a one-line revert.
export const FORCED_UI_LANG: string | null = 'spa';

export const APP_ENVIRONMENT = import.meta.env.VITE_APP_MODE;

export const isTest = APP_ENVIRONMENT === 'TEST';

export const isStaging = APP_ENVIRONMENT === 'STAGING';

export const isDEV = isTest ? false : import.meta.env.DEV;

export const ASSIGNMENT_PATH = {
  MM_Chairman_A: 'midweek_meeting.chairman.main_hall',
  MM_Chairman_B: 'midweek_meeting.chairman.aux_class_1',
  MM_OpeningPrayer: 'midweek_meeting.opening_prayer',
  MM_TGWTalk: 'midweek_meeting.tgw_talk',
  MM_TGWGems: 'midweek_meeting.tgw_gems',
  MM_TGWBibleReading_A: 'midweek_meeting.tgw_bible_reading.main_hall',
  MM_TGWBibleReading_B: 'midweek_meeting.tgw_bible_reading.aux_class_1',
  MM_AYFPart1_Student_A: 'midweek_meeting.ayf_part1.main_hall.student',
  MM_AYFPart1_Assistant_A: 'midweek_meeting.ayf_part1.main_hall.assistant',
  MM_AYFPart1_Student_B: 'midweek_meeting.ayf_part1.aux_class_1.student',
  MM_AYFPart1_Assistant_B: 'midweek_meeting.ayf_part1.aux_class_1.assistant',
  MM_AYFPart2_Student_A: 'midweek_meeting.ayf_part2.main_hall.student',
  MM_AYFPart2_Assistant_A: 'midweek_meeting.ayf_part2.main_hall.assistant',
  MM_AYFPart2_Student_B: 'midweek_meeting.ayf_part2.aux_class_1.student',
  MM_AYFPart2_Assistant_B: 'midweek_meeting.ayf_part2.aux_class_1.assistant',
  MM_AYFPart3_Student_A: 'midweek_meeting.ayf_part3.main_hall.student',
  MM_AYFPart3_Assistant_A: 'midweek_meeting.ayf_part3.main_hall.assistant',
  MM_AYFPart3_Student_B: 'midweek_meeting.ayf_part3.aux_class_1.student',
  MM_AYFPart3_Assistant_B: 'midweek_meeting.ayf_part3.aux_class_1.assistant',
  MM_AYFPart4_Student_A: 'midweek_meeting.ayf_part4.main_hall.student',
  MM_AYFPart4_Assistant_A: 'midweek_meeting.ayf_part4.main_hall.assistant',
  MM_AYFPart4_Student_B: 'midweek_meeting.ayf_part4.aux_class_1.student',
  MM_AYFPart4_Assistant_B: 'midweek_meeting.ayf_part4.aux_class_1.assistant',
  MM_LCPart1: 'midweek_meeting.lc_part1',
  MM_LCPart2: 'midweek_meeting.lc_part2',
  MM_LCPart3: 'midweek_meeting.lc_part3',
  MM_LCCBSConductor: 'midweek_meeting.lc_cbs.conductor',
  MM_LCCBSReader: 'midweek_meeting.lc_cbs.reader',
  MM_ClosingPrayer: 'midweek_meeting.closing_prayer',
  MM_CircuitOverseer: 'midweek_meeting.circuit_overseer',
  WM_Chairman: 'weekend_meeting.chairman',
  WM_OpeningPrayer: 'weekend_meeting.opening_prayer',
  WM_Speaker_Part1: 'weekend_meeting.speaker.part_1',
  WM_Speaker_Part2: 'weekend_meeting.speaker.part_2',
  WM_WTStudy_Conductor: 'weekend_meeting.wt_study.conductor',
  WM_WTStudy_Reader: 'weekend_meeting.wt_study.reader',
  WM_ClosingPrayer: 'weekend_meeting.closing_prayer',
  WM_CircuitOverseer: 'weekend_meeting.circuit_overseer',
  WM_SubstituteSpeaker: 'weekend_meeting.speaker.substitute',
  WM_Speaker_Outgoing: 'weekend_meeting.outgoing_talks',
};

export const BROTHER_ASSIGNMENT = [
  AssignmentCode.MM_Chairman,
  AssignmentCode.MM_AuxiliaryCounselor,
  AssignmentCode.MM_Prayer,
  AssignmentCode.MM_TGWTalk,
  AssignmentCode.MM_TGWGems,
  AssignmentCode.MM_LCPart,
  AssignmentCode.MM_CBSConductor,
  AssignmentCode.MM_CBSReader,
  AssignmentCode.WM_Chairman,
  AssignmentCode.WM_Prayer,
  AssignmentCode.WM_Speaker,
  AssignmentCode.WM_SpeakerSymposium,
  AssignmentCode.WM_WTStudyConductor,
  AssignmentCode.WM_WTStudyReader,
];

export const STUDENT_ASSIGNMENT = [
  AssignmentCode.MM_StartingConversation,
  AssignmentCode.MM_FollowingUp,
  AssignmentCode.MM_MakingDisciples,
  AssignmentCode.MM_ExplainingBeliefs,
];

export const ASSISTANT_ASSIGNMENT = [
  ...STUDENT_ASSIGNMENT,
  AssignmentCode.MM_AssistantOnly,
];

export const STORAGE_KEY = {
  source_import: 'organized_jw_import_next_sync',
};

export const WEEK_TYPE_WITH_MEETING = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.TREASURES_PART,
  Week.TREASURES_STUDENTS,
  Week.STUDENTS_ASSIGNMENTS,
  Week.STUDENTS_LIVING,
  Week.LIVING_PART,
  Week.SPECIAL_TALK,
  Week.PUBLIC_TALK,
  Week.WATCHTOWER_STUDY,
  Week.SPECIAL_TALK_ONLY,
];

export const WEEK_TYPE_NO_MEETING = [
  Week.ASSEMBLY,
  Week.CONVENTION,
  Week.NO_MEETING,
  Week.MEMORIAL,
];

export const WEEK_TYPE_LANGUAGE_GROUPS = [
  Week.TREASURES_PART,
  Week.TREASURES_STUDENTS,
  Week.STUDENTS_ASSIGNMENTS,
  Week.STUDENTS_LIVING,
  Week.LIVING_PART,
  Week.PUBLIC_TALK,
  Week.SPECIAL_TALK_ONLY,
  Week.WATCHTOWER_STUDY,
];

export const MIDWEEK_FULL = [Week.NORMAL, Week.CO_VISIT];

export const MIDWEEK_WITH_TREASURES = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.TREASURES_PART,
  Week.TREASURES_STUDENTS,
  Week.STUDENTS_ASSIGNMENTS,
  Week.STUDENTS_LIVING,
];

export const MIDWEEK_WITH_TREASURES_TALKS = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.TREASURES_PART,
  Week.TREASURES_STUDENTS,
];

export const MIDWEEK_WITH_STUDENTS = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.TREASURES_STUDENTS,
  Week.STUDENTS_ASSIGNMENTS,
  Week.STUDENTS_LIVING,
];

export const MIDWEEK_WITH_STUDENTS_LANGUAGE_GROUP = [
  Week.TREASURES_STUDENTS,
  Week.STUDENTS_ASSIGNMENTS,
  Week.STUDENTS_LIVING,
];

export const MIDWEEK_WITH_LIVING = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.STUDENTS_LIVING,
  Week.LIVING_PART,
];

export const MIDWEEK_WITH_CBS = [
  Week.NORMAL,
  Week.STUDENTS_LIVING,
  Week.LIVING_PART,
];

export const WEEKEND_FULL = [Week.NORMAL, Week.CO_VISIT, Week.SPECIAL_TALK];

export const WEEKEND_WITH_TALKS = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.PUBLIC_TALK,
  Week.SPECIAL_TALK,
  Week.SPECIAL_TALK_ONLY,
];

export const WEEKEND_WITH_TALKS_NOCO = [
  Week.NORMAL,
  Week.PUBLIC_TALK,
  Week.SPECIAL_TALK,
  Week.SPECIAL_TALK_ONLY,
];

export const WEEKEND_WITH_TALKS_ONLY = [
  Week.PUBLIC_TALK,
  Week.SPECIAL_TALK_ONLY,
];

export const WEEKEND_WITH_STANDARD_TALK = [Week.NORMAL, Week.PUBLIC_TALK];

export const WEEKEND_WITH_SPECIAL_TALK = [
  Week.SPECIAL_TALK,
  Week.SPECIAL_TALK_ONLY,
];

export const WEEKEND_WITH_WTSTUDY = [
  Week.NORMAL,
  Week.CO_VISIT,
  Week.SPECIAL_TALK,
  Week.WATCHTOWER_STUDY,
];

export const TIMER_KEY = 'organized_timer';
