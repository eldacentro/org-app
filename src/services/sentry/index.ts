import * as Sentry from '@sentry/react';

/**
 * Los enlaces públicos de territorio llevan su clave de descifrado en el
 * fragmento de la URL (`#/t/{congId}/{token}?k={clave}`). El navegador nunca
 * envía el fragmento al servidor, pero Sentry SÍ adjunta `window.location.href`
 * completo en los eventos y en las migas de navegación — sin esto, cualquier
 * error ocurrido con un enlace abierto mandaría a Sentry la clave y el token,
 * que juntos son todo lo que hace falta para abrir el territorio.
 */
const SECRET_PARAM = /([?&])k=[A-Za-z0-9_\-=]+/g;
const SHARE_PATH = /(#\/t\/[^/]+\/)[A-Za-z0-9_-]+/g;

export const scrubShareSecrets = (value: string): string =>
  value.replace(SECRET_PARAM, '$1k=[redactado]').replace(SHARE_PATH, '$1[redactado]');

/** Limpia en profundidad cualquier cadena que parezca la URL de un enlace. */
const scrubDeep = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return value;

  if (typeof value === 'string') {
    return value.includes('k=') || value.includes('#/t/')
      ? scrubShareSecrets(value)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = scrubDeep(item, depth + 1);
    }

    return out;
  }

  return value;
};

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: `v${import.meta.env.PACKAGE_VERSION}`,
  environment: import.meta.env.VITE_APP_MODE || 'PROD',

  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = scrubShareSecrets(event.request.url);
    }

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
        ...crumb,
        data: crumb.data ? (scrubDeep(crumb.data) as typeof crumb.data) : crumb.data,
        message: crumb.message ? scrubShareSecrets(crumb.message) : crumb.message,
      }));
    }

    if (event.extra) {
      event.extra = scrubDeep(event.extra) as typeof event.extra;
    }

    return event;
  },

  beforeBreadcrumb(crumb) {
    return {
      ...crumb,
      data: crumb.data ? (scrubDeep(crumb.data) as typeof crumb.data) : crumb.data,
      message: crumb.message ? scrubShareSecrets(crumb.message) : crumb.message,
    };
  },
});

export default Sentry;
