import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

import { getAppLang, getListLanguages } from '@services/app';
import { LANGUAGE_LIST } from '@constants/index';
import { store } from '@states/index';
import { localeReadyState } from '@states/app';
import { setPendingLocales } from './ready';

export const defaultNS = 'ui';

const resources = {};

const appLang = getAppLang();

const appLangPath =
  LANGUAGE_LIST.find((record) => record.threeLettersCode === appLang)?.locale ??
  'en';

/**
 * Los trece ficheros de un idioma, TODOS A LA VEZ.
 *
 * Iban uno detrás de otro (`await` seguido de `await`), y cada uno es una
 * petición aparte: en el wifi del Salón, con medio segundo de ida y vuelta por
 * petición, eran trece medios segundos en fila por idioma. No dependen unos de
 * otros — nada impide pedirlos juntos. Si vuelves a añadir un espacio de
 * nombres, mételo en este mismo `Promise.all`, no debajo con su propio
 * `await`.
 */
const getLangTranslations = async (language: string) => {
  const [
    activities,
    congregation,
    dashboard,
    formsTemplates,
    general,
    meetings,
    ministry,
    onboarding,
    profile,
    errors,
    talks,
    songs,
    releases,
  ] = await Promise.all([
    import(`@locales/${language}/activities.json`).then((m) => m.default),
    import(`@locales/${language}/congregation.json`).then((m) => m.default),
    import(`@locales/${language}/dashboard.json`).then((m) => m.default),
    import(`@locales/${language}/forms-templates.json`).then((m) => m.default),
    import(`@locales/${language}/general.json`).then((m) => m.default),
    import(`@locales/${language}/meetings.json`).then((m) => m.default),
    import(`@locales/${language}/ministry.json`).then((m) => m.default),
    import(`@locales/${language}/onboarding.json`).then((m) => m.default),
    import(`@locales/${language}/profile.json`).then((m) => m.default),
    import(`@locales/${language}/errors.json`).then((m) => m.default),
    // talks, songs y releases van a espacios de nombres propios
    import(`@locales/${language}/public_talks.json`).then((m) => m.default),
    import(`@locales/${language}/songs.json`).then((m) => m.default),
    import(`@locales/${language}/release_notes.json`).then((m) => m.default),
  ]);

  return {
    ui: {
      ...activities,
      ...congregation,
      ...dashboard,
      ...general,
      ...onboarding,
      ...profile,
      ...ministry,
      ...meetings,
      ...formsTemplates,
      ...errors,
    },
    talks,
    songs,
    releases,
  };
};

// El ÚNICO idioma que bloquea el arranque: el de la interfaz.
//
// Antes se esperaba aquí a la lista entera de idiomas —lo que además obligaba
// a abrir IndexedDB antes de pintar nada, porque la lista sale de los ajustes—
// y con el castellano eso eran dos idiomas: el de la interfaz y el inglés que
// `getListLanguages` añade siempre como reserva del material. Veintiséis
// ficheros para poder pintar una pantalla que solo enseña uno de los idiomas.
//
// El resto se cargan en segundo plano al final de este archivo. Quien necesite
// esos otros idiomas para escribir en la base de datos tiene que preguntar
// antes en `./ready` — ahí está explicado por qué.
resources[appLang] = await getLangTranslations(appLangPath);

const supportedLangs = LANGUAGE_LIST.map((record) => record.threeLettersCode);

// Fuerza el recálculo de los átomos derivados de traducción (meses/días) cada
// vez que i18n carga o cambia las traducciones. Evita que queden cacheados con
// las claves crudas (p.ej. "tr_may") si se evaluaron antes de estar listas.
const bumpLocaleReady = () => {
  store.set(localeReadyState, (value) => value + 1);
};

i18n.on('initialized', bumpLocaleReady);
i18n.on('languageChanged', bumpLocaleReady);
i18n.on('loaded', bumpLocaleReady);
i18n.on('added', bumpLocaleReady);

i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: appLang,
  fallbackLng: 'spa',
  supportedLngs: [...supportedLangs],
  interpolation: { escapeValue: false },
  react: {
    // Re-renderiza los componentes cuando i18n cambia de idioma O cuando se
    // AÑADEN/cargan bundles de recursos (addResourceBundle). Sin 'added', si los
    // recursos del idioma se añaden tarde (vía refreshLocalesResources tras la
    // sincronización), los componentes se quedan mostrando la clave cruda
    // ("tr_greeting", títulos, descripciones...) hasta el siguiente render.
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed',
  },
});

// El idioma de la interfaz ya está cargado en `resources` al llegar aquí, así
// que sus traducciones están listas justo tras init: refrescamos por si algún
// átomo se evaluó demasiado pronto.
bumpLocaleReady();

export default i18n;

export const refreshLocalesResources = async () => {
  const languages = await getListLanguages();

  const pendientes = languages.filter(
    (language) => !i18n.hasResourceBundle(language.locale, 'ui')
  );

  if (pendientes.length === 0) return;

  const cargados = await Promise.all(
    pendientes.map((language) => getLangTranslations(language.path))
  );

  pendientes.forEach((language, index) => {
    for (const [key, values] of Object.entries(cargados[index])) {
      i18n.addResourceBundle(language.locale, key, values, true, true);
    }
  });
};

// Los demás idiomas —el del material y el inglés de reserva—, en segundo
// plano. Arranca aquí mismo, en el mismo tick que el init de arriba, así que
// para cuando el usuario puede tocar algo ya suelen estar; pero nadie espera
// por ellos para pintar. `setPendingLocales` guarda esta promesa para que
// `localesListos` (ver ./ready) pueda esperarla antes de reconstruir las
// tablas derivadas.
setPendingLocales(refreshLocalesResources());
