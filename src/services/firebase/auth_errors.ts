import { getTranslation } from '@services/i18n/translation';

/**
 * Traducir un error de Google/Firebase a algo que un hermano pueda entender.
 *
 * EL FALLO QUE ESTO ARREGLA. Los sitios que atrapan un error al entrar hacían
 * `getMessageByCode(error.code)`, e i18next devuelve la CLAVE cuando no
 * encuentra traducción. No hay ni una traducción para los códigos `auth/*` —lo
 * comprobé, cero en los 25 mensajes de errors.json—, así que el hermano se
 * encontraba un aviso rojo que decía literalmente:
 *
 *     auth/network-request-failed
 *
 * Eso es el «me da un error» que no sabe explicar nadie. Y encima es el caso más
 * común de todos: `auth/network-request-failed` es simplemente que la conexión
 * se cortó a mitad, algo que se arregla volviendo a intentarlo — pero el aviso
 * no lo decía, así que el hermano concluía que la app no funcionaba.
 *
 * Cada mensaje dice QUÉ HACER, porque un aviso que no propone nada solo sirve
 * para que la persona se rinda.
 */

const MENSAJES: Record<string, string> = {
  'auth/network-request-failed': 'error_app_auth_network',
  'auth/timeout': 'error_app_auth_timeout',
  'auth/popup-blocked': 'error_app_auth_popup-blocked',
  'auth/popup-closed-by-user': 'error_app_auth_popup-closed',
  'auth/cancelled-popup-request': 'error_app_auth_popup-closed',
  'auth/too-many-requests': 'error_app_auth_too-many',
  'auth/unauthorized-domain': 'error_app_auth_domain',
  'auth/user-disabled': 'error_app_auth_disabled',
  'auth/internal-error': 'error_app_auth_internal',
  'auth/web-storage-unsupported': 'error_app_auth_storage',
  'auth/operation-not-supported-in-this-environment':
    'error_app_auth_storage',
  'auth/account-exists-with-different-credential':
    'error_app_auth_other-provider',
};

export const authErrorMessage = (error: unknown): string => {
  const code = (error as { code?: unknown })?.code;
  const codigo = typeof code === 'string' ? code : '';

  if (codigo.startsWith('auth/')) {
    const key = MENSAJES[codigo];

    if (key) return getTranslation({ key });

    // Un código que no está contemplado: mensaje claro para el hermano y el
    // código entre paréntesis, para que quien le ayude sepa qué ha pasado sin
    // tener que adivinarlo. Es la única forma de no perder el dato técnico sin
    // convertirlo en el mensaje.
    return `${getTranslation({ key: 'error_app_auth_generic' })} (${codigo})`;
  }

  // No es un error de Google. Los de red ya vienen con su mensaje en claro
  // desde `fetchWithTimeout`, así que se respeta tal cual.
  const message = (error as { message?: unknown })?.message;

  if (typeof message === 'string' && message.length > 0) return message;

  return getTranslation({ key: 'error_app_generic-desc' });
};
