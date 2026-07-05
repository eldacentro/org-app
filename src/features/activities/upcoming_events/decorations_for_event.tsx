import {
  IconAirplaneTicket,
  IconCalendarClock,
  IconCampaign,
  IconCart,
  IconCorporateFare,
  IconDiagnosis,
  IconDistance,
  IconJwHome,
  IconLightbulb,
  IconLocalLibrary,
  IconStadium,
  IconTranslate,
  IconVacuum,
  IconVoiceSelection,
  IconWavingHand,
  IconWine,
} from '@components/icons';
import {
  UpcomingEventCategory,
  UpcomingEventDuration,
} from '@definition/upcoming_events';

// Las 3 categorías que en español se llaman "Asamblea ___" — solo para
// ellas aplica el enlace de JW Library (no hay programa de JW Library para
// el resto de eventos).
export const ASSEMBLY_CATEGORIES = [
  UpcomingEventCategory.AssemblyWeek,
  UpcomingEventCategory.ConventionWeek,
  UpcomingEventCategory.InternationalConventionWeek,
];

// Las categorías de asamblea además de la Conmemoración pueden llevar foto
// de portada (p. ej. la imagen oficial del año de la Conmemoración).
export const COVER_PHOTO_CATEGORIES = [
  ...ASSEMBLY_CATEGORIES,
  UpcomingEventCategory.MemorialWeek,
];

export const decorationsForEvent = [
  {
    translationKey: 'tr_circuitOverseerWeek',
    icon: <IconWavingHand />,
    duration: UpcomingEventDuration.MultipleDays,
  },
  {
    translationKey: 'tr_pioneerWeek',
    icon: <IconLocalLibrary />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_memorialWeek',
    icon: <IconWine />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_conventionWeek',
    icon: <IconStadium />,
    duration: UpcomingEventDuration.MultipleDays,
  },
  {
    translationKey: 'tr_assemblyWeek',
    icon: <IconDistance />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_internationalConventionWeek',
    icon: <IconAirplaneTicket />,
    duration: UpcomingEventDuration.MultipleDays,
  },
  {
    translationKey: 'tr_specialCampaignWeek',
    icon: <IconCampaign />,
    duration: UpcomingEventDuration.MultipleDays,
  },
  {
    translationKey: 'tr_hallMaintenanceTrainingWeek',
    icon: <IconVacuum />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_theocraticTrainingWeek',
    icon: <IconVoiceSelection />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_bethelTour',
    icon: <IconCorporateFare />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_specialProgram',
    icon: <IconLightbulb />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_publicWitnessing',
    icon: <IconCart />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_kingdomDedication',
    icon: <IconJwHome />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_languageCourse',
    icon: <IconTranslate />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_annualMeeting',
    icon: <IconDiagnosis />,
    duration: UpcomingEventDuration.SingleDay,
  },
  {
    translationKey: 'tr_custom',
    icon: <IconCalendarClock />,
    duration: UpcomingEventDuration.SingleDay,
  },
];
