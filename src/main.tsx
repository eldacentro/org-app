import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './RootWrap';
import { getCSSPropertyValue } from '@utils/common';
import Sentry from '@services/sentry';
import { LANGUAGE_LIST } from './constants';
import { initDbWithRecovery } from '@services/app/dbRecovery';

const getInitialColor = () => {
  const savedColor = localStorage.getItem('color');

  if (!savedColor) return 'blue';

  try {
    return JSON.parse(savedColor) as string;
  } catch {
    return savedColor;
  }
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');

  if (!savedTheme) return 'light';

  try {
    return JSON.parse(savedTheme) as string;
  } catch {
    return savedTheme;
  }
};

const getInitialDirection = () => {
  const savedLang = localStorage.getItem('ui_lang') || 'spa';
  const direction = LANGUAGE_LIST.find(
    (record) => record.threeLettersCode === savedLang
  )?.direction;

  return direction || 'ltr';
};

const direction = getInitialDirection();
document.documentElement.setAttribute('dir', direction);

const theme = getInitialTheme();
const color = getInitialColor();
const newTheme = `${color}-${theme}`;
document.documentElement.setAttribute('data-theme', newTheme);

const themeColor = getCSSPropertyValue('--accent-100');

document
  .querySelector("meta[name='theme-color']")
  .setAttribute('content', themeColor);

console.info(`Elda Centro: version ${import.meta.env.PACKAGE_VERSION}`);

const container = document.getElementById('root');

// ── Enlace público de territorio ────────────────────────────────────────────
// Quien abre `#/t/...` es un invitado sin cuenta (p. ej. el superintendente de
// circuito). Se le monta una raíz mínima y se sale ANTES de abrir la base de
// datos local, registrar el service worker o pedir almacenamiento persistente:
// nada de eso le sirve, y Dexie en navegación privada le plantaría encima la
// pantalla de recuperación de base de datos.
if (window.location.hash.startsWith('#/t/')) {
  import('./PublicWrap')
    .then(({ default: PublicWrap }) => {
      createRoot(container).render(
        <React.StrictMode>
          <PublicWrap />
        </React.StrictMode>
      );
    })
    .catch((error) => {
      // Sin este catch, si falla la descarga del trozo (3G intermitente, o un
      // service worker sirviendo un index.html viejo que apunta a un chunk
      // que ya no existe tras un despliegue) la promesa se rechazaba, nunca
      // se llamaba a render y el invitado se quedaba MIRANDO EL LOGOTIPO
      // ANIMADO para siempre, sin error ni forma de reintentar. Es su primer
      // contacto con la app.
      console.error('No se pudo cargar la página del enlace público', error);
      container.innerHTML = '';
      const box = document.createElement('div');
      box.setAttribute(
        'style',
        'min-height:100dvh;display:flex;flex-direction:column;align-items:center;' +
          'justify-content:center;gap:16px;padding:24px;text-align:center;' +
          'font-family:Inter,system-ui,sans-serif;color:#1b1b1f;background:#f5f6fa;'
      );
      const title = document.createElement('p');
      title.textContent = 'No se ha podido abrir el enlace';
      title.setAttribute('style', 'font-size:18px;font-weight:600;margin:0;');
      const body = document.createElement('p');
      body.textContent =
        'Comprueba tu conexión y vuelve a intentarlo. Si acaba de actualizarse la aplicación, recargar suele bastar.';
      body.setAttribute('style', 'font-size:15px;margin:0;max-width:34ch;line-height:1.5;');
      const retry = document.createElement('button');
      retry.textContent = 'Reintentar';
      retry.setAttribute(
        'style',
        'font:inherit;font-weight:600;padding:10px 20px;border-radius:999px;' +
          'border:none;background:#1f6fd0;color:#fff;cursor:pointer;'
      );
      retry.addEventListener('click', () => window.location.reload());
      box.append(title, body, retry);
      container.append(box);
    });
} else {
  bootstrapApp();
}

function bootstrapApp() {
// Fire-and-forget: opens the local DB early so a fatal VersionError can
// auto-recover (delete + reload) before it bricks startup. Not awaited so a
// healthy DB never delays first paint — see initDbWithRecovery.
initDbWithRecovery();

const root = createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((granted) => {
    if (granted) {
      console.info('Storage persistence granted.');
    } else {
      console.warn('Storage persistence not granted.');
    }
  });
}

window.addEventListener('unhandledrejection', (event) => {
  const errorName = event.reason?.name || event.reason?.inner?.name || '';
  if (
    errorName === 'QuotaExceededError' ||
    errorName === 'DexieError' ||
    event.reason?.message?.includes('QuotaExceededError')
  ) {
    import('@services/states/app').then(
      ({ displaySnackNotification, setOfflineOverride }) => {
        displaySnackNotification({
          header: 'Almacenamiento lleno',
          message:
            'No hay espacio en el dispositivo. Libere espacio para asegurar el guardado de datos.',
          severity: 'error',
        });
        setOfflineOverride(true);
      }
    );
  }
});

root.render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
}
