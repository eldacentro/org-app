import { apiSendAuthorization } from '@services/api/user';
import { currentAuthUser } from '@services/firebase/auth';
import logger from '@services/logger';

/**
 * Recuperar la sesión sin echar a nadie.
 *
 * EL FALLO QUE ESTO ARREGLA, que costó caro. Cuando el servidor contestaba 403,
 * la app enseñaba «Sesión caducada» y llamaba a `userSignOut()`. Eso no cierra
 * una sesión: DESTRUYE la sesión de Firebase del dispositivo. Y a partir de ahí
 * el botón de «Reconectar» ya no puede hacer nada —no queda token que
 * refrescar—, así que solo quedaba volver a entrar desde cero.
 *
 * El problema es que ese 403 llega por cuatro motivos muy distintos y solo dos
 * significan que haga falta volver a entrar:
 *
 * - `LOGIN_FIRST` — el servidor no pudo comprobar el token. A veces es un token
 *   caducado (se arregla con uno nuevo) y a veces es que el SERVIDOR no pudo
 *   verificarlo: se acaba de reiniciar y aún no tiene las claves públicas de
 *   Google. Eso último no es culpa del dispositivo y le pasa a todos a la vez —
 *   es lo que dejó fuera a media congregación el 2026-08-05.
 * - `DEVICE_REVOKED` — no llegó la cookie de sesión. La de Firebase está
 *   perfecta. Safari purga esa cookie por su cuenta cada pocos días (ITP).
 * - `SESSION_REVOKED` — alguien revocó este dispositivo a propósito.
 * - `ACCOUNT_NOT_FOUND` — la cuenta ya no existe.
 *
 * Los dos primeros se arreglan solos y en silencio: se pide un token nuevo y se
 * vuelve a pedir sesión al servidor, que es lo que repone la cookie. Solo los
 * dos últimos justifican mandar a nadie a la pantalla de acceso.
 */

/** Motivos por los que sí hace falta que la persona vuelva a entrar. */
const TERMINAL_MESSAGES = ['ACCOUNT_NOT_FOUND', 'SESSION_REVOKED'];

/** Espera mínima entre intentos automáticos. */
const RECOVERY_COOLDOWN_MS = 30_000;

let lastAttemptAt = 0;

export type SessionVerdict =
  /** Sesión repuesta sin que nadie note nada. */
  | 'recovered'
  /** No se ha podido ahora; no se toca nada y se reintenta más tarde. */
  | 'retry'
  /** Aquí sí: hay que volver a entrar. */
  | 'terminal';

/**
 * Intenta reponer la sesión del servidor usando la de Firebase, que sigue viva.
 *
 * `/user-login` es la clave: NO pasa por el control de visitante, así que
 * funciona precisamente cuando falta la cookie, y su respuesta la vuelve a
 * poner. Es el mismo camino que el inicio de sesión normal, sin pantallas.
 */
export const recoverVipSession = async (
  message: string,
  { force = false } = {}
): Promise<SessionVerdict> => {
  if (TERMINAL_MESSAGES.includes(message)) return 'terminal';

  // Sin red no se concluye nada: reintentar es lo único honesto.
  if (!navigator.onLine) return 'retry';

  // Freno. Si reponer la sesión funciona pero el servidor sigue contestando
  // 403 —porque el problema era suyo y aún no se le ha pasado—, volveríamos a
  // preguntar, a reponer, a preguntar... en bucle y contra un servidor que ya
  // va justo. Con esto se intenta como mucho una vez cada medio minuto; el
  // resto del tiempo se contesta «reintentar», que no toca nada.
  //
  // El botón de «Reconectar» pasa `force`: si alguien lo pulsa a propósito,
  // tiene que intentarlo de verdad, no contestarle con un freno invisible.
  const ahora = Date.now();

  if (!force && ahora - lastAttemptAt < RECOVERY_COOLDOWN_MS) return 'retry';

  lastAttemptAt = ahora;

  const user = currentAuthUser();

  // Sin sesión de Firebase no hay nada con lo que reponer nada. No debería
  // pasar (es justo lo que este módulo existe para no provocar), pero si pasa,
  // volver a entrar es lo único que queda.
  if (!user) return 'terminal';

  let idToken: string;

  try {
    // Forzado a propósito: puede que el que teníamos esté rancio de verdad.
    idToken = await user.getIdToken(true);
  } catch (error) {
    logger.error('app', `session recovery: token refresh failed — ${error}`);
    return 'retry';
  }

  if (!idToken || idToken.length === 0) return 'retry';

  try {
    const { status, data } = await apiSendAuthorization(user);

    if (status === 200) {
      // Con doble factor la sesión existe pero le falta el código, y eso no lo
      // puede teclear nadie por su cuenta: ahí sí hace falta la persona.
      if (data?.message === 'MFA_VERIFY') return 'terminal';

      logger.info('app', 'session recovery: session restored silently');
      return 'recovered';
    }

    if (TERMINAL_MESSAGES.includes(data?.message)) return 'terminal';

    // Cualquier otra cosa —un 503 del servidor recién arrancado, un 500, un
    // corte— NO es prueba de nada. Se reintenta.
    logger.error('app', `session recovery: login returned ${status}`);
    return 'retry';
  } catch (error) {
    logger.error('app', `session recovery: login failed — ${error}`);
    return 'retry';
  }
};
