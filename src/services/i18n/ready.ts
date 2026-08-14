import { getI18n } from 'react-i18next';

/**
 * Quién puede leer las traducciones de un idioma, y desde cuándo.
 *
 * El arranque solo espera al idioma de la interfaz; los demás (el del material
 * y el inglés de reserva) se cargan en segundo plano. Eso abre una ventana de
 * un segundo en la que `i18n` todavía no tiene esos idiomas, y hay código que
 * NO puede correr dentro de esa ventana: las cuatro tablas derivadas —tipos de
 * semana, asignaciones, discursos públicos y canciones— se reconstruyen
 * ENTERAS leyendo las traducciones de todos los idiomas de la lista, y se
 * rehacen al arrancar cada vez que cambia la versión (`runUpdater`).
 *
 * Si se reconstruyen con un idioma sin cargar, el daño es mudo y de los que
 * viajan: en canciones y discursos el idioma que falta se salta y la tabla se
 * reescribe sin esos títulos; en tipos de semana y asignaciones es peor, porque
 * `getTranslation` cae en `fallbackLng` y GUARDA TEXTO EN CASTELLANO dentro de
 * la casilla del inglés. Y como la tabla queda distinta de la que había,
 * `dbReplaceTableIfChanged` sí escribe.
 *
 * De ahí este módulo: quien vaya a leer traducciones de un idioma que no es el
 * de la interfaz, primero pregunta aquí. No tiene más dependencias que
 * `react-i18next` a propósito — lo importan tanto `services/i18n` como
 * `services/dexie/*`, y cualquier otra cosa montaría un ciclo de imports.
 */
let pendiente: Promise<void> = Promise.resolve();

/** La carga en segundo plano de los idiomas que no bloquean el arranque. */
export const setPendingLocales = (carga: Promise<unknown>) => {
  // Se traga el error a propósito: si la carga falla (red caída a media
  // descarga), quien espere aquí recibe `false` de `localesListos` y se
  // abstiene de reconstruir nada. Un rechazo suelto tumbaría el arranque.
  pendiente = carga.then(
    () => undefined,
    () => undefined
  );
};

/**
 * Espera a la carga en segundo plano y responde si TODOS esos idiomas están
 * disponibles de verdad. `false` significa «no reconstruyas nada todavía»:
 * mejor la tabla de antes intacta que una tabla nueva a medias.
 */
export const localesListos = async (locales: string[]): Promise<boolean> => {
  await pendiente;

  const i18n = getI18n();

  if (!i18n) return false;

  return locales.every((locale) => i18n.hasResourceBundle(locale, 'ui'));
};
