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

/**
 * En los programas van los nombres completos. Siempre.
 *
 * Había un interruptor para cambiarlos por el «nombre para mostrar» de cada
 * persona. Se ha quitado: en Elda Centro estaba apagado, nadie sabía qué
 * hacía, y encenderlo tenía un efecto que no anunciaba —ESCRIBÍA un nombre
 * generado en todas las personas activas, y apagarlo no lo deshacía—.
 *
 * Esto devuelve `false` en vez de arrancar la consulta de los TREINTA Y CINCO
 * sitios que la leen. Es el mismo resultado y una línea para volver atrás; ir
 * uno por uno por `schedules.ts`, `persons.ts` y treinta componentes sería un
 * barrido enorme para no cambiar ni un píxel.
 *
 * El ajuste guardado se queda quieto en la base de datos: viaja en la
 * sincronización y borrarlo no le haría bien a nadie.
 */
export const displayNameMeetingsEnableState = atom(() => false);

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

/**
 * ¿Se asigna a alguien en «Logros de la organización» y en «Informe del Cuerpo
 * Gobernante»?
 *
 * La aplicación reconoce esas dos partes por el título y no pide hermano,
 * porque en muchas congregaciones son un vídeo o un informe que presenta quien
 * preside. Donde se llevan como análisis con el auditorio sí hace falta poner a
 * alguien, y eso es lo que enciende este ajuste.
 *
 * Con `?? false` a propósito: un dispositivo que se sincronice antes de que
 * llegue el ajuste se comporta como se ha comportado siempre.
 */
export const midweekMeetingLCSpecialPartsAssignedState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.lc_special_parts_assigned?.value ?? false
  );
});

export const midweekMeetingChairmanNotesSharedState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.midweek_meeting.find(
      (record) => record.type === dataView
    )?.chairman_notes_shared?.value ?? false
  );
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

/**
 * "Mostrar programa de oradores salientes a todos los usuarios".
 *
 * Al publicar ya se decide con este interruptor si los discursos salientes
 * viajan o no en el programa público (`handleFilterOutgoingTalks`), pero la
 * pestaña de Programas semanales no lo miraba: era de ancianos y ya está. Con
 * lo cual encenderlo mandaba el dato a todos los dispositivos y no se lo
 * enseñaba a nadie nuevo.
 */
export const weekendMeetingOutgoingTalksPublicState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.outgoing_talks_schedule_public.value ?? false
  );
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

export const weekendMeetingPublicTalkRepeatMonthsState = atom((get) => {
  const settings = get(settingsState);
  const dataView = get(userDataViewState);

  return (
    settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    )?.public_talk_repeat_notice_months?.value ?? 12
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

/**
 * Ver o no los botones de exportar a PDF: preferencia de cada cuenta.
 *
 * Antes esto lo decidía un interruptor de congregación —uno solo para todos— y
 * el personal solo servía para que un anciano se lo encendiera aparte. Ya no:
 * ver un botón de imprimir no es un permiso, es gusto de cada uno, y quién
 * puede exportar qué ya lo deciden las rutas (a la página de Departamentos
 * solo llega quien la edita, a la de Exhibidores solo el comité de servicio).
 *
 * El valor de congregación sigue leyéndose como valor de partida para quien
 * nunca haya tocado el suyo: estaba encendido para toda la congregación y
 * quitarlo de golpe le habría hecho desaparecer los botones a todo el mundo
 * sin avisar. En cuanto alguien toca su interruptor, manda el suyo.
 */
export const pdfExportEnabledPersonalState = atom((get) => {
  const settings = get(settingsState);

  const personal = settings.user_settings.pdf_export_enabled_personal?.value;
  if (typeof personal === 'boolean') return personal;

  return settings.cong_settings.pdf_export_enabled?.value ?? false;
});

export const pdfExportEnabledState = pdfExportEnabledPersonalState;

/**
 * ¿Enseñar el botón de exportar el programa en «Programas semanales»?
 *
 * APAGADO de fábrica, a diferencia del interruptor general: este añade un botón
 * a una pantalla que se mira a diario, y a quien no lo use le estorba. Quien lo
 * quiera lo enciende una vez en Mi cuenta.
 *
 * Quién puede encenderlo se decide en la propia pantalla de ajustes (solo
 * ancianos, y solo si el interruptor general de exportar está puesto); aquí solo
 * vive el valor.
 */
export const midweekExportPersonalState = atom((get) => {
  const settings = get(settingsState);

  return settings.user_settings.midweek_export_enabled_personal?.value ?? false;
});

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
