import { apiValidateMe } from '@services/api/user';
import { apiPocketValidateMe } from '@services/api/pocket';
import logger from '@services/logger';

/**
 * Guardián del borrado de la base local.
 *
 * Varios sitios reaccionaban a UNA sola respuesta 403/404 del servidor
 * borrando la base de datos del dispositivo entera y sin preguntar. Eso
 * destruye lo que aún no se haya subido, y las causas de esas respuestas no
 * son siempre definitivas ni mucho menos:
 *
 *  - `DEVICE_REVOKED` solo significa que no llegó la cookie de sesión. Safari
 *    la purga por su cuenta (ITP), y también la pierde el modo privado o
 *    borrar datos del sitio. No es prueba de nada.
 *  - `LOGIN_FIRST` es un token de Firebase caducado: se arregla con un token
 *    nuevo (ver apiFetch), no borrando datos.
 *  - Un 404 puede darse en la carrera que ya está documentada justo después
 *    del handshake, con la congregación recién asignada.
 *  - Un fallo de red o un 5xx no dicen absolutamente nada del estado de la
 *    cuenta.
 *
 * Regla: **antes de destruir nada, preguntar otra vez**, con una espera de por
 * medio, y borrar solo si el servidor lo confirma con un motivo definitivo.
 * En la duda, no se borra: el vigilante de reconexión seguirá intentándolo y
 * el aviso de "sin sincronizar" lo dirá si la cosa persiste.
 */

// Motivos por los que la cuenta SÍ está definitivamente fuera: el usuario ya
// no existe, o alguien revocó esa sesión a propósito desde "Mis sesiones".
const TERMINAL_MESSAGES = ['ACCOUNT_NOT_FOUND', 'SESSION_REVOKED'];

// Espera antes de volver a preguntar. Suficiente para pasar por encima de un
// reinicio del servidor, un pico de latencia o un bache de cobertura.
const RECHECK_DELAY_MS = 6000;

export type AccountVerdict = 'gone' | 'alive' | 'unknown';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Segunda comprobación, con espera, de si la cuenta está realmente fuera.
 * Devuelve 'gone' solo cuando el servidor lo confirma.
 */
export const confirmAccountGone = async (
  accountType: 'vip' | 'pocket',
  reason: string
): Promise<AccountVerdict> => {
  if (!navigator.onLine) return 'unknown';

  await wait(RECHECK_DELAY_MS);

  if (!navigator.onLine) return 'unknown';

  try {
    const { status, result } =
      accountType === 'pocket'
        ? await apiPocketValidateMe()
        : await apiValidateMe();

    const message = result?.message ?? '';

    if (status === 200) {
      logger.info(
        'app',
        `local data reset avoided (${reason}): the account is still valid`
      );
      return 'alive';
    }

    // congregación o usuario que ya no existen
    if (status === 404) return 'gone';

    if (status === 403 && TERMINAL_MESSAGES.includes(message)) return 'gone';

    logger.info(
      'app',
      `local data reset avoided (${reason}): inconclusive answer ${status} ${message}`
    );

    return 'unknown';
  } catch (error) {
    logger.info(
      'app',
      `local data reset avoided (${reason}): ${(error as Error)?.message}`
    );

    return 'unknown';
  }
};

/**
 * ¿Hay que borrar la base local? Envuelve la comprobación de arriba con el
 * filtro del primer motivo: `DEVICE_REVOKED` y `LOGIN_FIRST` no llegan
 * siquiera a preguntarse — nunca justifican borrar.
 */
export const shouldResetLocalData = async ({
  accountType,
  reason,
  message,
}: {
  accountType: 'vip' | 'pocket';
  reason: string;
  message?: string;
}) => {
  if (message === 'DEVICE_REVOKED' || message === 'LOGIN_FIRST') {
    logger.info(
      'app',
      `local data reset refused (${reason}): ${message} is recoverable`
    );
    return false;
  }

  const verdict = await confirmAccountGone(accountType, reason);

  return verdict === 'gone';
};
