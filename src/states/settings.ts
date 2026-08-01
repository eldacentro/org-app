/*
This file holds the source of the truth from the table "settings".
Individual property are evaluated using recoil selector
*/

import { atom } from 'jotai';
import { appLangState } from './app';
import { settingSchema } from '@services/dexie/schema';
import { buildPersonFullname } from '@utils/common';
import { currentServiceYear } from '@utils/date';
import {
  FirstDayWeekOption,
  FullnameOption,
  PublishersSortOption,
  SourceFrequency,
} from '@definition/settings';
import { LANGUAGE_LIST } from '@constants/index';
import { AssignmentFieldType } from '@definition/assignment';
import { AppRoleType } from '@definition/app';

export const settingsState = atom(settingSchema);

// CONGREGATION SETTINGS
export const congNumberState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.cong_number.value;
});

export const congNameState = atom((get) => {
  const settings = get(settingsState);

  // El nombre sincronizado desde el registro oficial de la congregación
  // puede traer guiones como separador de palabras (p. ej. "Elda - Centro").
  // Se normaliza aquí, en el origen, para que se muestre igual en toda la
  // app (PDFs, invitaciones, navbar, etc.) sin tener que tocar el dato real.
  return settings.cong_settings.cong_name.replace(/\s*-\s*/g, ' ').trim();
});

export const congFullnameState = atom((get) => {
  const congName = get(congNameState);
  const congNumber = get(congNumberState);

  if (congNumber.trim().length === 0) {
    return congName;
  }

  return `${congName}, ${congNumber}`;
});

export const circuitNumberState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  const circuit = settings.cong_settings.cong_circuit.find(
    (record) => record.type === dataView
  );

  return circuit?.value ?? '';
});

export const countryCodeState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.country_code;
});

export const territoriesEnabledPublishersState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.territories_enabled_publishers?.value ?? false;
});

/**
 * Cómo está organizado cada departamento (por semana o por reunión, y cuántos
 * turnos). Sin configurar, lo de siempre. Ver `services/app/departments_slots`.
 */
export const departmentsConfigState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.departments_config?.value ?? {};
});

export const congMasterKeyState = atom((get) => {
  const settings = get(settingsState);

  // Nunca devolver undefined: el arranque VIP lee `.length` directamente
  // (useCongregationEncryption) y un undefined aquí tumbaba TODA la app con
  // "Cannot read properties of undefined (reading 'length')". Cadena vacía =
  // "sin clave" = necesita configurarse, que es justo la semántica correcta.
  return settings.cong_settings.cong_master_key ?? '';
});

export const congAccessCodeState = atom((get) => {
  const settings = get(settingsState);

  // Ver nota en congMasterKeyState: '' en vez de undefined para no reventar
  // el `.length` del arranque.
  return settings.cong_settings.cong_access_code ?? '';
});

export const congNewState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.cong_new;
});

export const congRoleState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.cong_role;
});

export const fullnameOptionState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.fullname_option.find(
      (record) => record.type === dataView
    )?.value || FullnameOption.FIRST_BEFORE_LAST
  );
});

export const shortDateFormatState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.short_date_format.find(
      (record) => record.type === dataView
    )?.value || 'MM/dd/yyyy'
  );
});

export const hour24FormatState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.format_24h_enabled.find(
      (record) => record.type === dataView
    )?.value ?? true
  );
});

export const COFirstnameState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.circuit_overseer.firstname.value;
});

export const COLastnameState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.circuit_overseer.lastname.value;
});

export const CODisplayNameState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.circuit_overseer.display_name.value;
});

export const COFullnameState = atom((get) => {
  const firstname = get(COFirstnameState);
  const lastname = get(COLastnameState);
  const fullnameOption = get(fullnameOptionState);

  const fullname = buildPersonFullname(lastname, firstname, fullnameOption);

  return fullname;
});

/** Nombre de la esposa del CO. Vacío = soltero. */
export const COSpouseNameState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.circuit_overseer.spouse_name?.value ?? '';
});

export const COPhoneState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.circuit_overseer.phone?.value ?? '';
});

export const COEmailState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.circuit_overseer.email?.value ?? '';
});

/** Correo al que los oradores públicos envían el contenido multimedia de su discurso. */
export const publicTalkSpeakersEmailState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.public_talk_speakers_email?.value ?? '';
});

export const COScheduleNameState = atom((get) => {
  const fullname = get(COFullnameState);
  const displayName = get(CODisplayNameState);
  const useDisplayName = get(displayNameMeetingsEnableState);

  const scheduleName = useDisplayName ? displayName : fullname;

  return scheduleName;
});

export const secretaryRoleState = atom((get) => {
  const congRole = get(congRoleState);
  return congRole.includes('secretary');
});

export const coordinatorRoleState = atom((get) => {
  const congRole = get(congRoleState);
  return congRole.includes('coordinator');
});

export const adminRoleState = atom((get) => {
  const congRole = get(congRoleState);
  const secretaryRole = get(secretaryRoleState);
  const coordinatorRole = get(coordinatorRoleState);

  return congRole.includes('admin') || coordinatorRole || secretaryRole;
});

export const pioneerRoleState = atom((get) => {
  const congRole = get(congRoleState);
  return congRole.some((role) => role.includes('pioneer'));
});

export const congDiscoverableState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.cong_discoverable.value;
});

export const displayNameMeetingsEnableState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  if (!Array.isArray(settings.cong_settings.display_name_enabled)) {
    return settings.cong_settings.display_name_enabled['meetings']['value'];
  }

  return (
    settings.cong_settings.display_name_enabled.find(
      (record) => record.type === dataView
    )?.meetings ?? false
  );
});

export const JWLangState = atom((get) => {
  const settings = get(settingsState);
  const sourceLanguages = get(sourceLanguagesState);
  const dataView = get(userDataViewState);
  const appLang = get(appLangState);

  if (!settings.cong_settings.source_material) {
    return (
      LANGUAGE_LIST.find((record) => record.threeLettersCode === appLang)
        ?.code ?? 'E'
    );
  }

  const sourceLang = sourceLanguages.find(
    (record) => record.type === dataView
  )?.value;

  if (sourceLang) return sourceLang;

  return (
    LANGUAGE_LIST.find((record) => record.threeLettersCode === appLang)?.code ??
    'E'
  );
});

export const JWLangLocaleState = atom((get) => {
  const JWLang = get(JWLangState);

  const locale =
    LANGUAGE_LIST.find((record) => record.code.toUpperCase() === JWLang)
      ?.threeLettersCode || 'eng';

  return locale;
});

export const sourcesJWAutoImportState = atom((get) => {
  const settings = get(settingsState);

  return (
    settings.cong_settings.source_material?.auto_import.enabled.value ?? true
  );
});

export const sourcesJWAutoImportFrequencyState = atom((get) => {
  const settings = get(settingsState);

  return (
    settings.cong_settings.source_material?.auto_import.frequency.value ||
    SourceFrequency.BIWEEKLY
  );
});

export const attendanceOnlineRecordState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  if (!Array.isArray(settings.cong_settings.attendance_online_record)) {
    return settings.cong_settings.attendance_online_record['value'];
  }

  return (
    settings.cong_settings.attendance_online_record.find(
      (record) => record.type === dataView
    )?.value ?? false
  );
});

export const congAddressState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.cong_location.address;
});

export const congCountryState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.country_code;
});

export const congSpecialMonthsState = atom((get) => {
  const settings = get(settingsState);

  const result = settings.cong_settings.special_months.filter((record) => {
    if (record._deleted) return false;

    const currentYear = currentServiceYear();
    const previousYear = String(+currentYear - 1);

    return record.year >= previousYear;
  });

  return result.sort((a, b) => a.year.localeCompare(b.year));
});

export const congDataSyncState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.data_sync.value;
});

export const languageGroupEnabledState = atom((get) => {
  const settings = get(settingsState);

  if (Array.isArray(settings.cong_settings.language_groups)) {
    return false;
  }

  return settings.cong_settings.language_groups.enabled.value;
});

export const sourceLanguagesState = atom((get) => {
  const settings = get(settingsState);

  if (!settings.cong_settings.source_material) {
    return [];
  }

  return settings.cong_settings.source_material.language.filter(
    (record) => !record._deleted
  );
});

export const congIDState = atom((get) => {
  const settings = get(settingsState);

  return settings.cong_settings.cong_id || '';
});

// MIDWEEK MEETING

export const midweekMeetingClassCountState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return settings.cong_settings.midweek_meeting.find(
    (record) => record.type === dataView
  ).class_count.value;
});

export const midweekMeetingWeekdayState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.weekday.value ?? 3
  );
});

export const midweekMeetingTimeState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.time.value || '18:00'
  );
});

export const midweekMeetingOpeningPrayerLinkedState = atom<
  AssignmentFieldType | ''
>((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  const assignment =
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.opening_prayer_linked_assignment?.value || '';

  return assignment;
});

export const midweekMeetingClosingPrayerLinkedState = atom<
  AssignmentFieldType | ''
>((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  const assignment =
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.closing_prayer_linked_assignment?.value || '';

  return assignment;
});

export const meetingExactDateState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  if (!Array.isArray(settings.cong_settings.schedule_exact_date_enabled)) {
    return settings.cong_settings.schedule_exact_date_enabled['value'];
  }

  return (
    settings.cong_settings.schedule_exact_date_enabled.find(
      (record) => record.type === dataView
    )?.value ?? false
  );
});

export const midweekMeetingAuxCounselorDefaultEnabledState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.aux_class_counselor_default.enabled.value ?? false
  );
});

export const midweekMeetingAuxCounselorDefaultState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.aux_class_counselor_default.person.value || ''
  );
});

export const midweekMeetingAssigFSGState = atom((get) => {
  const settings = get(settingsState);
  return settings.cong_settings.aux_class_fsg?.value ?? false;
});

// WEEKEND MEETING

export const weekendMeetingOpeningPrayerAutoAssignState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return settings.cong_settings.weekend_meeting.find(
    (record) => record.type === dataView
  ).opening_prayer_auto_assigned.value;
});

export const weekendMeetingWeekdayState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.weekday.value ?? 7
  );
});

export const weekendMeetingSubstituteSpeakerState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return settings.cong_settings.weekend_meeting.find(
    (record) => record.type === dataView
  ).substitute_speaker_enabled.value;
});

export const weekendMeetingWTSubstituteDisplayedState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.substitute_w_study_conductor_displayed.value ?? false
  );
});

export const weekendMeetingWTStudyConductorDefaultState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.w_study_conductor_default.value ?? ''
  );
});

export const weekendMeetingShowMonthlyWarningState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.consecutive_monthly_parts_notice_shown.value ?? false
  );
});

export const weekendMeetingTimeState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.time.value || '08:00'
  );
});

export const weekendSchedulesSongsWeekend = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings?.cong_settings?.schedule_songs_weekend?.find(
      (record) => record.type === dataView
    )?.value ?? false
  );
});

// Toggle personal (solo esta cuenta) que ancianos/admin pueden activar en
// "Mi cuenta" → "Ajustes de la aplicación", sin tocar el ajuste de
// congregación que ven todos los demás.
export const pdfExportEnabledPersonalState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.pdf_export_enabled_personal?.value ?? false;
});

export const pdfExportEnabledState = atom((get) => {
  const settings = get(settingsState);

  const congEnabled = settings.cong_settings.pdf_export_enabled?.value ?? false;
  if (congEnabled) return true;

  const personalEnabled = get(pdfExportEnabledPersonalState);
  if (!personalEnabled) return false;

  const role = settings.user_settings.cong_role;
  const accountType = settings.user_settings.account_type;
  const isAdmin = role.some(
    (r) => r === 'admin' || r === 'coordinator' || r === 'secretary'
  );
  const isElder =
    isAdmin || (accountType !== 'pocket' && role.includes('elder'));

  return isElder;
});

/**
 * El interruptor personal, ACOTADO al documento del rol que lo posee.
 *
 * `pdfExportEnabledState` es un sí o un no para toda la app, y eso está bien
 * para un anciano: puede ver todos los programas, así que puede imprimirlos
 * todos. Pero a un hermano que solo edita Departamentos encenderle ese
 * interruptor le abriría también el botón de exportar de Próximos eventos y de
 * cualquier otra página a la que sí llega. Este de aquí solo abre el documento
 * del rol que se le pase.
 */
const pdfExportPorRol = (roles: AppRoleType[]) =>
  atom((get) => {
    // Quien ya puede exportar todo, puede exportar esto también.
    if (get(pdfExportEnabledState)) return true;

    if (!get(pdfExportEnabledPersonalState)) return false;

    const userRole = get(settingsState).user_settings.cong_role ?? [];

    return roles.some((role) => userRole.includes(role));
  });

/** El programa de departamentos: lo exporta quien lo edita. */
export const pdfExportDepartmentsEnabledState = pdfExportPorRol([
  'departments_schedule',
]);

// USER SETTINGS

export const userDataViewState = atom((get) => {
  const settings = get(settingsState);
  const dataView = settings.user_settings.data_view;

  if (typeof dataView === 'string') {
    return dataView;
  }

  return settings.user_settings.data_view.value;
});

export const firstnameState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.firstname.value;
});

export const lastnameState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.lastname.value;
});

export const firstDayWeekState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings?.cong_settings?.first_day_week?.find(
      (record) => record.type === dataView
    )?.value ?? FirstDayWeekOption.MONDAY
  );
});

export const fullnameState = atom((get) => {
  const firstname = get(firstnameState);
  const lastname = get(lastnameState);
  const fullnameOption = get(fullnameOptionState);

  const fullname = buildPersonFullname(lastname, firstname, fullnameOption);

  return fullname;
});

export const userAvatarState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.user_avatar;
});

/**
 * La última foto convertida, para no repetir el trabajo ni dejar basura.
 *
 * `URL.createObjectURL` no es una función pura: cada llamada RESERVA memoria
 * para el blob y solo la suelta `revokeObjectURL`. Aquí se llamaba dentro de un
 * átomo derivado sin liberar nunca la anterior, así que cada recálculo dejaba
 * una copia de la foto en memoria hasta recargar la página.
 *
 * Se guarda junto al búfer del que salió, y no solo la URL, porque así:
 *   · si el búfer es EL MISMO (que es lo normal: el átomo se recalcula cuando
 *     cambia cualquier ajuste, no solo la foto) se devuelve la URL de antes y
 *     no se crea ninguna;
 *   · y si de verdad cambió, se libera la vieja.
 */
let fotoCache: { buffer: unknown; url: string } | null = null;

export const userAvatarUrlState = atom((get) => {
  const avatarBuffer = get(userAvatarState);

  if (fotoCache && fotoCache.buffer === avatarBuffer) return fotoCache.url;

  const anterior = fotoCache;
  fotoCache = avatarBuffer
    ? {
        buffer: avatarBuffer,
        url: URL.createObjectURL(new Blob([avatarBuffer])),
      }
    : null;

  // La anterior se suelta DESPUÉS, no aquí mismo: en el momento de este
  // cálculo todavía hay un <img> pintando la URL vieja, y liberarla a la vez
  // dejaría el hueco en blanco hasta que React repinte. Con el respiro de un
  // turno del bucle de eventos, el cambio no se ve.
  if (anterior) {
    setTimeout(() => URL.revokeObjectURL(anterior.url), 0);
  }

  return fotoCache?.url ?? '';
});

export const backupAutoState = atom(() => {
  // La sincronización automática está SIEMPRE puesta, para todo el mundo.
  //
  // Este átomo es el que cortaba las dos sincronizaciones —la instantánea y la
  // periódica—, y colgaba de un interruptor en Ajustes de mi cuenta. O sea que
  // un toque por error dejaba a esa persona con sus datos solo en su
  // dispositivo, sin nada que se lo dijera: la app sigue funcionando igual, y
  // lo que escribe simplemente no llega a nadie. En una app de congregación
  // eso es un informe que no le consta al secretario o una asignación que
  // nadie ve.
  //
  // El interruptor se retiró de la pantalla; esto es lo que garantiza que
  // quien ya lo tuviera apagado vuelva a sincronizar. El valor guardado sigue
  // ahí y se sigue sincronizando como antes —no se toca el registro— pero ya
  // no decide nada.
  return true;
});

export const backupIntervalState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.backup_automatic.interval.value;
});

export const accountTypeState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.account_type;
});

export const userLocalUIDState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.user_local_uid || '';
});

export const userMembersDelegateState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.user_members_delegate || [];
});

export const themeFollowOSEnabledState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.theme_follow_os_enabled.value;
});

export const hoursCreditsEnabledState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.hour_credits_enabled.value;
});

export const publishersSortState = atom((get) => {
  const settings = get(settingsState);

  return (
    settings.cong_settings.group_publishers_sort?.value ??
    PublishersSortOption.MANUAL
  );
});

export const isElderState = atom((get) => {
  const isAdmin = get(adminRoleState);
  const accountType = get(accountTypeState);
  const userRole = get(congRoleState);

  if (isAdmin) return true;

  if (accountType === 'pocket') return false;

  return userRole.includes('elder');
});
