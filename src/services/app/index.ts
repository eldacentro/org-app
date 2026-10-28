import { enUS } from 'date-fns/locale';
import { store } from '@states/index';
import {
  generateDayCapitalNames,
  generateMonthNames,
  handleAppChangeLanguage,
} from '@services/i18n/translation';
import {
  appLangState,
  congAccountConnectedState,
  isAppLoadState,
  isPocketSignUpState,
  isSetupState,
  offlineOverrideState,
} from '@states/app';
import { userSignOut } from '@services/firebase/auth';
import { setRootModalOpen } from '@services/states/app';
import { dbWeekTypeUpdate } from '@services/dexie/weekType';
import { dbAssignmentUpdate } from '@services/dexie/assignment';
import { dbAppDelete } from '@services/dexie/app';
import { schedulesBuildHistoryList } from './schedules';
import { setAssignmentsHistory } from '@services/states/schedules';
import {
  dbSchedAuxClassUpdate,
  dbSchedUpdateOutgoingTalksFields,
} from '@services/dexie/schedules';
import { FORCED_UI_LANG, LANGUAGE_LIST } from '@constants/index';
import { dbMetadataDefault } from '@services/dexie/metadata';
import {
  dbAppSettingsCreatePublishersSort,
  dbAppSettingsGet,
  dbAppSettingsUpdate,
  dbAppSettingsUpdateCongNumber,
  dbAppSettingsUpdateWithoutNotice,
  dbConvertAutoAssignPrayers,
  dbAppSettingsInitializeGoogleDriveBackup,
} from '@services/dexie/settings';
import { dbRemoveDuplicateReports } from '@services/dexie/cong_field_service_reports';
import { LanguageItem } from '@definition/app';
import {
  dbPersonsCleanUp,
  dbPersonsUpdateAssignments,
  dbPersonsInitializePredicacionFields,
} from '@services/dexie/persons';
import {
  dbUserFieldServiceReportsRemoveEmpty,
  dbUserSaveTimerToStorage,
} from '@services/dexie/user_field_service_reports';
import { dbPublicTalkUpdate } from '@services/dexie/public_talk';
import { dbSongUpdate } from '@services/dexie/songs';
import { localesListos } from '@services/i18n/ready';
import { escribirAlmacen, leerAlmacen } from '@utils/almacenamiento';
import { dbSourcesUpdateEventsName } from '@services/dexie/sources';
import {
  congAccessCodeState,
  congNameState,
  congNumberState,
  settingsState,
  userLocalUIDState,
} from '@states/settings';
import { apiPocketValidateMe } from '@services/api/pocket';
import { shouldResetLocalData } from './account_guard';
import { UserLoginResponseType } from '@definition/api';
import { settingSchema } from '@services/dexie/schema';
import { dbUpcomingEventsCleanup } from '@services/dexie/upcoming_events';
import appDb from '@db/appDb';
import { dbSpeakersCongregationsSetName } from '@services/dexie/speakers_congregations';
import { conLimite, intentarConLimite } from '@utils/con_limite';
import { AP_APPLICATIONS_SEEN_KEY } from '@services/app/applications_seen';

export const loadApp = () => {
  const appLang = store.get(appLangState);

  handleAppChangeLanguage(appLang);

  // Clear notification badge when the user opens the app
  if ('clearAppBadge' in navigator) {
    (navigator as Navigator & { clearAppBadge: () => Promise<void> })
      .clearAppBadge()
      .catch(() => {});
  }

  // load assignment history
  const history = schedulesBuildHistoryList();
  setAssignmentsHistory(history);

  // check for new/changed assignments on startup (catches changes while app was closed)
  import('@services/push/diff')
    .then(({ runAssignmentPushDiffs }) =>
      runAssignmentPushDiffs().catch(() => {})
    )
    .catch(() => {});
};

export const runUpdater = async () => {
  const currentLang = localStorage.getItem('ui_lang') || 'spa';
  const currentVersion = '3.37.1';

  const lastLang = localStorage.getItem('last_run_updater_lang') || '';
  const lastVersion = localStorage.getItem('last_run_updater_version') || '';

  const needsStaticUpdate =
    currentLang !== lastLang || currentVersion !== lastVersion;

  if (needsStaticUpdate) {
    // Las cuatro tablas derivadas se rehacen leyendo TODOS los idiomas de la
    // lista, y desde que el arranque solo espera al de la interfaz, los demás
    // pueden estar aún cargándose. Se espera aquí a que estén (ver
    // services/i18n/ready.ts).
    //
    // Si no llegan —red caída a media descarga—, ni se reconstruye ni se
    // apunta la versión como hecha: así se vuelve a intentar en el próximo
    // arranque, en vez de dar por buena una reconstrucción que no ocurrió.
    const languages = await getListLanguages();
    const listos = await localesListos(languages.map((lang) => lang.locale));

    if (listos) {
      await Promise.all([
        dbSongUpdate(),
        dbPublicTalkUpdate(),
        dbWeekTypeUpdate(),
        dbAssignmentUpdate(),
      ]);

      localStorage.setItem('last_run_updater_lang', currentLang);
      localStorage.setItem('last_run_updater_version', currentVersion);
    }
  }

  // Run all other database cleanup, migration and setup tasks in parallel groups
  await Promise.all([
    // Persons sequential pipeline
    (async () => {
      await dbPersonsUpdateAssignments();
      await dbPersonsCleanUp();
      await dbPersonsInitializePredicacionFields();
    })(),

    // Schedules sequential pipeline
    (async () => {
      await dbSchedAuxClassUpdate();
      await dbSchedUpdateOutgoingTalksFields();
    })(),

    // Other independent tasks
    dbRemoveDuplicateReports(),
    dbMetadataDefault(),
    dbAppSettingsCreatePublishersSort(),
    dbConvertAutoAssignPrayers(),
    dbUserFieldServiceReportsRemoveEmpty(),
    dbSourcesUpdateEventsName(),
    dbUserSaveTimerToStorage(),
    dbUpcomingEventsCleanup(),
    dbAppSettingsUpdateCongNumber(),
    dbAppSettingsInitializeGoogleDriveBackup(),
    dbSpeakersCongregationsSetName(),
  ]);
};

/**
 * Borra una base IndexedDB sin esperar más de la cuenta.
 *
 * `deleteDatabase` no termina mientras alguien la tenga abierta (Firebase,
 * el sincronizador, otra pestaña): se queda «bloqueada» hasta que la cierran.
 * Se pide y se espera un poco; si sigue bloqueada, la petición queda en cola
 * en el navegador y se completa al cerrarse la página, que es justo lo que
 * viene después.
 */
const borrarBaseIndexedDB = (nombre: string) =>
  new Promise<void>((resolve) => {
    try {
      const peticion = indexedDB.deleteDatabase(nombre);
      peticion.onsuccess = () => resolve();
      peticion.onerror = () => resolve();
      peticion.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });

/**
 * Lo que hace borrar la app de la pantalla de inicio y volver a instalarla,
 * pero desde dentro.
 *
 * Era el último recurso que acababa usando la gente cuando cerrar sesión no
 * servía: el cierre de sesión borraba los datos de la congregación, pero se
 * dejaba la sesión de Google guardada por Firebase, la caché de Firestore,
 * las claves guardadas en el dispositivo y la propia app en caché. Si lo que
 * estaba roto era cualquiera de esas cosas, al volver a entrar seguía roto.
 *
 * La app en caché (service worker) solo se borra CON internet: sin él, la
 * página no podría volver a cargarse hasta tener cobertura.
 */
const limpiarTodoElDispositivo = async () => {
  const nombres = new Set<string>([
    'firebaseLocalStorageDb',
    'firebase-heartbeat-database',
    'firebase-installations-database',
    'firebase-messaging-database',
  ]);

  try {
    // Safari 14+, Chrome 71+. Donde no exista, quedan los de arriba.
    const todas = await conLimite(indexedDB.databases(), 2_000, 'databases');
    for (const db of todas) if (db.name) nombres.add(db.name);
  } catch {
    // Seguimos con la lista conocida.
  }

  nombres.delete('organized'); // ya la borra `dbAppDelete`

  await intentarConLimite(
    Promise.all([...nombres].map(borrarBaseIndexedDB)),
    3_000,
    'borrar bases'
  );

  try {
    sessionStorage.clear();
  } catch {
    // Sin almacén de sesión no hay nada que limpiar.
  }

  if (!navigator.onLine) return;

  await intentarConLimite(
    (async () => {
      if ('caches' in window) {
        const claves = await caches.keys();
        await Promise.all(claves.map((clave) => caches.delete(clave)));
      }

      if ('serviceWorker' in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map((registro) => registro.unregister()));
      }
    })(),
    3_000,
    'borrar la app en caché'
  );
};

/**
 * Borra lo de la congregación de este dispositivo y cierra la sesión.
 *
 * Cada paso tiene tope: antes cualquiera podía no volver (Dexie esperando a
 * que el sincronizador soltara la base, Firebase atascado en su almacén) y la
 * pantalla se quedaba con el «espere» para siempre. Pase lo que pase, se
 * termina recargando, que es lo que de verdad cierra todo lo abierto.
 *
 * `limpiezaCompleta` es para el cierre de sesión que pide la persona: deja el
 * dispositivo como recién instalado. Los borrados automáticos (la cuenta ya no
 * existe, cambió de congregación) no lo necesitan.
 */
export const handleDeleteDatabase = async ({
  limpiezaCompleta = false,
}: { limpiezaCompleta?: boolean } = {}) => {
  setRootModalOpen(true);
  await intentarConLimite(dbAppDelete(), 5_000, 'dbAppDelete');
  await intentarConLimite(userSignOut(), 4_000, 'signOut');

  if (limpiezaCompleta) await limpiarTodoElDispositivo();

  const freezeKeys = [
    'userConsent',
    'organized_whatsnew',
    'theme',
    'app_font',
    'ui_lang',
    // Qué solicitudes de precursor auxiliar ya se vieron o se quitaron del
    // aviso. Son solo identificadores, nada de la congregación; borrarlos
    // hacía que al volver a entrar en la cuenta salieran otra vez todas.
    AP_APPLICATIONS_SEEN_KEY,
  ];

  const storageKeys = Object.keys(localStorage).filter(
    (key) => !freezeKeys.includes(key)
  );

  for (const key of storageKeys) {
    localStorage.removeItem(key);
  }

  window.location.href = './';
};

export const checkPwaUpdate = () => {
  if ('serviceWorker' in navigator) {
    const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});
  }
};

export const getUserDataView = <T extends { type: string }>(
  data: T[],
  dataView: string
) => {
  return data.find((record) => record.type === dataView);
};

const convertBrowserLanguage = () => {
  let found: LanguageItem | undefined;

  const languages = navigator.languages;

  for (const language of languages) {
    found = LANGUAGE_LIST.find((record) =>
      record.browserLangCode?.some(
        (lang) => lang.toLowerCase() === language.toLowerCase()
      )
    );

    if (found) break;
  }

  return found;
};

const setSourceLanguageDefault = async (lang: string) => {
  const settings = await dbAppSettingsGet();

  const sourceLanguages = structuredClone(
    settings.cong_settings.source_material.language
  );

  const main = sourceLanguages.find((record) => record.type === 'main');
  main.value = lang.toUpperCase();
  main.updatedAt = new Date().toISOString();

  await dbAppSettingsUpdateWithoutNotice({
    'cong_settings.source_material.language': sourceLanguages,
  });
};

export const getAppLang = () => {
  if (FORCED_UI_LANG) {
    // Single-language lock: always Spanish, ignore any previously-cached
    // browser-detected language and skip detection entirely.
    escribirAlmacen('ui_lang', FORCED_UI_LANG);
    store.set(appLangState, FORCED_UI_LANG);

    return FORCED_UI_LANG;
  }

  let appLang = leerAlmacen('ui_lang');

  if (!appLang) {
    const browserLang = convertBrowserLanguage();

    if (browserLang) {
      appLang = browserLang.threeLettersCode;

      // settings source language
      setSourceLanguageDefault(browserLang.code);
    }

    if (!browserLang) {
      appLang = 'spa';
    }

    escribirAlmacen('ui_lang', appLang);
  }

  store.set(appLangState, appLang);

  return appLang;
};

export const getListLanguages = async () => {
  const settings = await appDb.app_settings.get(1);

  const appLang = getAppLang();

  const appLangCode =
    LANGUAGE_LIST.find((record) => record.threeLettersCode === appLang)?.code ??
    'E';

  const appLangPath =
    LANGUAGE_LIST.find((record) => record.threeLettersCode === appLang)
      ?.locale ?? 'en';

  const languages = [
    { locale: appLang, path: appLangPath, code: appLangCode.toUpperCase() },
  ];

  for (const source of settings.cong_settings.source_material.language) {
    const JWLang = source.value;

    const sourceLang =
      LANGUAGE_LIST.find((record) => record.code.toUpperCase() === JWLang)
        ?.threeLettersCode ?? 'eng';

    const sourceLangPath =
      LANGUAGE_LIST.find((record) => record.threeLettersCode === sourceLang)
        ?.locale ?? 'en';

    if (!languages.some((r) => r.locale === sourceLang)) {
      languages.push({
        locale: sourceLang,
        path: sourceLangPath,
        code: JWLang.toUpperCase(),
      });
    }
  }

  // check source
  if (!languages.some((record) => record.locale === 'eng')) {
    languages.push({ code: 'E', locale: 'eng', path: 'en' });
  }

  return languages;
};

const handleLoadApp = async () => {
  await runUpdater();

  loadApp();

  store.set(isSetupState, false);

  setTimeout(async () => {
    store.set(offlineOverrideState, false);
    store.set(isAppLoadState, false);
  }, 2000);
};

const handleUpdateSettings = async (data: UserLoginResponseType) => {
  const { app_settings } = data;

  const settings = store.get(settingsState);

  const midweekMeeting = structuredClone(
    settings.cong_settings.midweek_meeting
  );

  for (const midweekRemote of app_settings.cong_settings.midweek_meeting) {
    const midweekLocal = midweekMeeting.find(
      (record) => record.type === midweekRemote.type
    );

    if (midweekLocal) {
      midweekLocal.time = midweekRemote.time;
      midweekLocal.weekday = midweekRemote.weekday;
    } else {
      midweekMeeting.push({
        ...settingSchema.cong_settings.midweek_meeting.at(0),
        time: midweekRemote.time,
        type: midweekRemote.type,
        weekday: midweekRemote.weekday,
      });
    }
  }

  const weekendMeeting = structuredClone(
    settings.cong_settings.weekend_meeting
  );

  for (const weekendRemote of app_settings.cong_settings.weekend_meeting) {
    const weekendLocal = weekendMeeting.find(
      (record) => record.type === weekendRemote.type
    );

    if (weekendLocal) {
      weekendLocal.time = weekendRemote.time;
      weekendLocal.weekday = weekendRemote.weekday;
    } else {
      weekendMeeting.push({
        ...settingSchema.cong_settings.weekend_meeting.at(0),
        time: weekendRemote.time,
        type: weekendRemote.type,
        weekday: weekendRemote.weekday,
      });
    }
  }

  await dbAppSettingsUpdate({
    'user_settings.account_type': 'pocket',
    'user_settings.user_local_uid': app_settings.user_settings.user_local_uid,
    'user_settings.user_members_delegate':
      app_settings.user_settings.user_members_delegate,
    'cong_settings.country_code': app_settings.cong_settings.country_code,
    'cong_settings.cong_name': app_settings.cong_settings.cong_name,
    'cong_settings.cong_number': app_settings.cong_settings.cong_number,
    'user_settings.cong_role': app_settings.user_settings.cong_role,
    'cong_settings.cong_location': app_settings.cong_settings.cong_location,
    'cong_settings.cong_circuit': app_settings.cong_settings.cong_circuit,
    'cong_settings.midweek_meeting': midweekMeeting,
    'cong_settings.weekend_meeting': weekendMeeting,
  });

  store.set(congAccountConnectedState, true);

  await handleLoadApp();
};

const validatePocket = async () => {
  const { result, status } = await apiPocketValidateMe();

  if (status === 403 || status === 404) {
    // Nunca borrar por una sola respuesta: en pocket la sesión es la cookie
    // del dispositivo y Safari la purga sola (ver account_guard).
    const confirmed = await shouldResetLocalData({
      accountType: 'pocket',
      reason: 'pocket startup validate',
      message: result?.message,
    });

    if (!confirmed) {
      // Sin confirmación no se destruye nada: se pide el código de invitación
      // otra vez (mismo destino que cualquier otra respuesta que no sea 200),
      // pero con los datos locales intactos.
      store.set(isPocketSignUpState, true);
      return;
    }

    await handleDeleteDatabase();
    return;
  }

  if (status !== 200) {
    store.set(isPocketSignUpState, true);
    console.error(result);
    throw new Error(result?.message);
  }

  await handleUpdateSettings(result);
};

export const pocketStartup = async () => {
  const userLocalUID = store.get(userLocalUIDState);
  const congName = store.get(congNameState);
  const congNumber = store.get(congNumberState);
  const accessCode = store.get(congAccessCodeState);

  try {
    if (userLocalUID.length === 0) {
      store.set(isPocketSignUpState, true);
      return;
    }

    const allowOpen =
      congName.length > 0 && congNumber.length > 0 && accessCode.length > 0;

    if (allowOpen) {
      // Mismo criterio que el arranque VIP: si la cuenta está configurada en
      // este dispositivo, se marca conectada aquí también. Sin esto, el atajo
      // sin red dejaba `backupEnabled` apagado y el dispositivo no
      // sincronizaba hasta que la revalidación de fondo respondiera — y si no
      // respondía, nunca.
      store.set(congAccountConnectedState, true);
      await handleLoadApp();
      return;
    }

    if (navigator.onLine) {
      await validatePocket();
      return;
    }

    store.set(isPocketSignUpState, true);
  } catch (error) {
    console.error(error);

    throw new Error(error?.message);
  }
};

export const buildLocalizeFn = (values: string[]) => {
  return (index: number) => values[index];
};

export const determineAppLocale = (appLang: string) => {
  const monthNames = generateMonthNames(appLang);
  const dayShorts = generateDayCapitalNames(appLang);

  let locale = LANGUAGE_LIST.find(
    (record) => record.threeLettersCode === appLang
  )?.fnsLocale;

  if (!locale) {
    locale = {
      ...enUS,
      code: appLang,
      localize: {
        ...enUS.localize,
        month: buildLocalizeFn(monthNames),
        day: buildLocalizeFn(dayShorts),
      },
    };
  }

  return locale;
};
