import { allowUnload } from './unload_guard';

const RELOAD_LOG_KEY = 'elda_auto_reload_log';
const MAX_AUTO_RELOADS = 3;
const AUTO_RELOAD_WINDOW_MS = 10 * 60 * 1000;

/**
 * Cortacircuitos de las recargas AUTOMÁTICAS.
 *
 * La app se recarga sola en varios sitios (oleada de actualización, service
 * worker nuevo, recuperación de la base de datos). Cada uno tiene su propio
 * freno, pero un fallo en cualquiera de ellos deja la app recargándose en la
 * pantalla de inicio sin forma de salir — le pasó a la congregación entera.
 *
 * Esto es la red por debajo de todos: como mucho tres recargas automáticas
 * cada diez minutos por dispositivo. Nunca se aplica a una recarga que haya
 * pedido una persona (el botón "Actualizar"), solo a las que decide la app.
 *
 * Si no hay localStorage, deja pasar: es una red de seguridad, no un permiso.
 */
export const canAutoReload = () => {
  try {
    const now = Date.now();

    const previous: number[] = JSON.parse(
      localStorage.getItem(RELOAD_LOG_KEY) || '[]'
    );

    const recent = previous.filter(
      (value) =>
        typeof value === 'number' && now - value < AUTO_RELOAD_WINDOW_MS
    );

    if (recent.length >= MAX_AUTO_RELOADS) {
      console.warn(
        'Recarga automática frenada: demasiadas seguidas. Se reanudará en unos minutos.'
      );
      return false;
    }

    recent.push(now);
    localStorage.setItem(RELOAD_LOG_KEY, JSON.stringify(recent));

    return true;
  } catch {
    return true;
  }
};

/**
 * Actualización de la app: busca una versión nueva, la instala y recarga.
 *
 * El `updatePwa()` de @sws2apps/react-sw-helper NO espera a
 * registration.update() y comprueba `waiting` en el mismo instante, por eso a
 * veces "no hacía nada". Esta función lo hace bien y la comparten el botón
 * "Actualizar la aplicación" de Acerca de y la oleada de actualización
 * forzada (useForceUpdate).
 *
 * La comprobación va contra la red y puede tardar —o no volver nunca con una
 * conexión mala—, así que tiene tope: pasado CHECK_TIMEOUT_MS se sigue
 * adelante con lo que haya en vez de dejar a alguien mirando un botón que no
 * hace nada. Ese era el motivo real de "le doy y se queda un buen rato sin
 * hacer nada": `registration.update()` se esperaba sin límite.
 *
 * @param extraTrigger  callback opcional idempotente (p. ej. el updatePwa de la
 *                      librería) que se dispara además, por si acaso.
 * @param options.reloadWhenUpToDate
 *   Si NO hay ninguna versión nueva que instalar, ¿recargar igualmente?
 *   El botón que pulsa una persona: sí — ha pedido actualizar y recargar es
 *   parte de lo que arregla. La oleada automática: NO, jamás. Recargar sin
 *   nada nuevo que traer deja el dispositivo exactamente igual, así que la
 *   oleada volvería a dispararse al arrancar y la app se quedaría recargándose
 *   sola para siempre.
 * @param options.onStatus
 *   Se llama en cuanto se sabe qué está pasando, ANTES de recargar, para poder
 *   decírselo a quien está mirando.
 * @param options.reloadDelayMs
 *   Margen antes de recargar cuando ya se sabe el resultado: el tiempo de que
 *   dé tiempo a leer el aviso.
 *
 * @returns qué ha pasado — ver AppUpdateOutcome.
 */
export type AppUpdateOutcome =
  /** Hay versión nueva: se está instalando y la app va a recargar. */
  | 'updating'
  /** Comprobado: ya se estaba en la última versión. */
  | 'up-to-date'
  /** No se ha podido comprobar (sin conexión, o la comprobación se agotó). */
  | 'unavailable'
  /** Aquí no hay service worker que comprobar; se recarga y ya está. */
  | 'reloading';

/** Tope de espera de la comprobación contra la red. */
const CHECK_TIMEOUT_MS = 8000;

/**
 * Margen para que el navegador ponga en `installing` el service worker nuevo
 * después de que `registration.update()` haya resuelto. Corto a propósito: si
 * de verdad no hay nada nuevo, nadie tiene que esperar casi.
 */
const APPEAR_GRACE_MS = 2500;

export const forceAppUpdate = async (
  extraTrigger?: () => void,
  options?: {
    reloadWhenUpToDate?: boolean;
    onStatus?: (outcome: AppUpdateOutcome) => void;
    reloadDelayMs?: number;
  }
): Promise<AppUpdateOutcome> => {
  const reloadWhenUpToDate = options?.reloadWhenUpToDate ?? true;
  const reloadDelayMs = options?.reloadDelayMs ?? 0;

  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  const finish = (outcome: AppUpdateOutcome, shouldReload: boolean) => {
    options?.onStatus?.(outcome);

    if (shouldReload) setTimeout(reloadOnce, reloadDelayMs);

    return outcome;
  };

  // Recarga decidida por la app: que no salte el aviso de "puede que no se
  // guarden los cambios" (ver unload_guard).
  allowUnload();

  if (!('serviceWorker' in navigator)) {
    return finish('reloading', reloadWhenUpToDate);
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return finish('reloading', reloadWhenUpToDate);
    }

    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, {
      once: true,
    });

    // Al service worker nuevo hay que decirle que tome el control, y hay que
    // hacerlo VENGA CUANDO VENGA. Antes solo se enganchaba si ya estaba ahí en
    // ese preciso instante: si aparecía un poco después se quedaba esperando
    // para siempre, y por eso había que pulsar el botón dos veces.
    const activar = (worker: ServiceWorker | null | undefined) => {
      if (!worker) return;

      const intentar = () => {
        if (worker.state === 'installed') {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      intentar();
      worker.addEventListener('statechange', intentar);
    };

    let nuevo: ServiceWorker | null =
      registration.installing ?? registration.waiting ?? null;

    let avisarAparicion: (() => void) | null = null;
    const aparicion = new Promise<void>((resolve) => {
      avisarAparicion = resolve;
    });

    const onUpdateFound = () => {
      nuevo = registration.installing ?? registration.waiting ?? nuevo;
      activar(nuevo);
      avisarAparicion?.();
    };

    // Se escucha ANTES de pedir la comprobación: si se hiciera después, un
    // `updatefound` rápido pasaría desapercibido.
    registration.addEventListener('updatefound', onUpdateFound);
    activar(nuevo);

    // Con tope: sin él, una conexión mala deja esta promesa sin resolver y el
    // botón se queda sin hacer absolutamente nada, sin aviso ni error.
    let timedOut = false;

    await Promise.race([
      registration.update(),
      new Promise((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve(undefined);
        }, CHECK_TIMEOUT_MS)
      ),
    ]);

    extraTrigger?.();

    // La segunda carrera, y la de verdad. `registration.update()` resuelve
    // cuando termina de comprobar el script, pero el navegador puede tardar un
    // pelín más en poner el worker nuevo en `installing`. Leerlo en el mismo
    // instante daba "ya tienes la última versión", recargaba en seco, y a la
    // vuelta el worker YA estaba instalado — así que la segunda pulsación sí
    // lo encontraba. De ahí las dos pulsaciones. Ahora se le da una ventana
    // corta a que aparezca antes de concluir nada.
    if (!nuevo) {
      await Promise.race([
        aparicion,
        new Promise((resolve) => setTimeout(resolve, APPEAR_GRACE_MS)),
      ]);
    }

    registration.removeEventListener('updatefound', onUpdateFound);

    const hasUpdate = Boolean(
      nuevo || registration.installing || registration.waiting
    );

    if (hasUpdate) {
      // controllerchange dispara la recarga en cuanto el service worker nuevo
      // toma el control; el temporizador es solo la red de seguridad.
      options?.onStatus?.('updating');
      setTimeout(reloadOnce, 6000);

      return 'updating';
    }

    navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);

    // Si la comprobación se agotó, no se puede afirmar que esté al día: no lo
    // sabemos, y decir "ya tienes la última versión" sin saberlo es peor que
    // reconocer que no se ha podido comprobar.
    if (timedOut) return finish('unavailable', false);

    return finish('up-to-date', reloadWhenUpToDate);
  } catch (error) {
    console.error(error);

    navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);

    return finish('unavailable', false);
  }
};
