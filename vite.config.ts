import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import loadVersion from 'vite-plugin-package-version';
import { comlink } from 'vite-plugin-comlink';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import svgx from '@svgx/vite-plugin-react';

/**
 * Qué carpeta de `src/locales` usa el idioma al que está fijada la app.
 *
 * Se lee del propio `src/constants/index.ts` en vez de escribirla a mano aquí,
 * para que cambiar el bloqueo de idioma no deje esta precarga apuntando en
 * silencio al idioma que ya no es. Si el bloqueo se quita
 * (`FORCED_UI_LANG = null`), no hay forma de saber en tiempo de compilación qué
 * idioma va a pedir el usuario: se devuelve null y no se precarga nada.
 */
const carpetaDelIdiomaFijado = (): string | null => {
  const fuente = readFileSync(
    resolve(__dirname, 'src/constants/index.ts'),
    'utf-8'
  );

  const bloqueo = fuente.match(
    /FORCED_UI_LANG:\s*string\s*\|\s*null\s*=\s*'([a-z]+)'/
  );

  if (!bloqueo) return null;

  const entrada = fuente
    .split(/\n\s*\{\n/)
    .find((bloque) => bloque.includes(`threeLettersCode: '${bloqueo[1]}'`));

  const locale = entrada?.match(/locale:\s*'([\w-]+)'/);

  if (!locale) return null;

  return existsSync(resolve(__dirname, 'src/locales', locale[1]))
    ? locale[1]
    : null;
};

/**
 * Los trece ficheros de traducción del idioma de la interfaz, anunciados en el
 * `index.html` para que el navegador los pida YA.
 *
 * Son `import()` dinámicos con la ruta construida a mano, así que Vite no
 * puede saber cuáles harán falta y los deja sin ninguna pista de precarga: el
 * navegador no se entera de que existen hasta que ha descargado Y ejecutado el
 * bundle principal (casi un mega). En una conexión lenta eso son casi dos
 * segundos de espera en fila detrás de algo que no tiene nada que ver.
 *
 * Con `modulepreload` bajan a la vez que el bundle y ya están en la caché
 * cuando i18n los pide. Es solo una pista: si falla o el navegador la ignora,
 * el arranque sigue funcionando exactamente igual que sin ella.
 *
 * Se piden DESPUÉS del primer pintado, y por eso van en un script en vez de en
 * etiquetas `<link>` sueltas. Puestas directamente en el `<head>`, esos 74 KB
 * le quitan el sitio a lo poquísimo que hace falta para pintar el logotipo
 * (hojas de estilo y un SVG, un par de KB): medido en 3G, el logotipo tardaba
 * 0,3 s más en aparecer. Y `fetchpriority="low"` no lo arregla. Esperando a que
 * haya pintado —dos `requestAnimationFrame`— se gana el arranque completo sin
 * retrasar la primera señal de vida, que es justo lo que mira quien abre la
 * app. Sigue habiendo tiempo de sobra: el bundle principal aún tarda segundos
 * en llegar.
 */
const precargarTraducciones = (): Plugin => ({
  name: 'precargar-traducciones-del-idioma-fijado',
  apply: 'build',
  enforce: 'post',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      const carpeta = carpetaDelIdiomaFijado();

      if (!carpeta || !ctx.bundle) return;

      const ficheros = Object.values(ctx.bundle)
        .filter(
          (salida) =>
            salida.type === 'chunk' &&
            (salida.facadeModuleId ?? '').includes(`/src/locales/${carpeta}/`)
        )
        .map((salida) => salida.fileName)
        .sort();

      if (ficheros.length === 0) {
        // Si un día cambia cómo se trocean los locales, mejor enterarse aquí
        // que descubrir meses después que la precarga no precargaba nada.
        console.warn(
          `[precargar-traducciones] no se encontró ningún chunk de src/locales/${carpeta}`
        );
        return;
      }

      return [
        {
          tag: 'script',
          children:
            `(function(){var f=${JSON.stringify(ficheros.map((f) => `/${f}`))};` +
            'function p(){for(var i=0;i<f.length;i++){' +
            "var l=document.createElement('link');" +
            "l.rel='modulepreload';l.href=f[i];document.head.appendChild(l);}}" +
            "if('requestAnimationFrame' in window){" +
            'requestAnimationFrame(function(){requestAnimationFrame(function(){' +
            'setTimeout(p,0);});});}else{setTimeout(p,0);}})();',
          injectTo: 'head' as const,
        },
      ];
    },
  },
});

// Hash corto del commit en el momento del build. Se muestra en "Acerca de"
// para poder verificar exactamente qué versión está corriendo un dispositivo.
let buildSha = 'dev';
try {
  buildSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // fuera de un repo git (p.ej. build aislado): se queda como 'dev'
}

// Número de build: MINUTOS transcurridos desde 1970 en el momento de compilar.
//
// Antes era el total de commits del historial, y eso resultó estar roto en
// producción: Vercel clona en superficial (unos pocos commits), así que
// `git rev-list --count HEAD` devolvía 10 en vez de 6038. Todos los
// despliegues se anunciaban como el mismo build, de modo que ni "Acerca de"
// decía la verdad ni podía funcionar nada que compare versiones — ni la
// oleada de actualización ni el panel de "quién tiene la app vieja".
//
// La marca de tiempo no depende de git ni del entorno de compilación, siempre
// crece y se puede comparar con un simple menor-que, que es todo lo que hace
// falta. En minutos para que sea un número corto y legible.
const buildNumber = String(Math.floor(Date.now() / 60000));

// Fecha del build, para poder decirle a la gente "tu app es del 12 de julio"
// en vez de soltarle un número.
const buildDate = new Date().toISOString();

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    comlink(),
    eslint(),
    loadVersion(),
    svgx(),
    precargarTraducciones(),
  ],
  resolve: {
    alias: [
      { find: '@assets', replacement: resolve(__dirname, 'src/assets') },
      {
        find: '@components',
        replacement: resolve(__dirname, 'src/components'),
      },
      {
        find: '@icons',
        replacement: resolve(__dirname, 'src/components/icons'),
      },
      {
        find: '@constants',
        replacement: resolve(__dirname, 'src/constants'),
      },
      { find: '@features', replacement: resolve(__dirname, 'src/features') },
      { find: '@hooks', replacement: resolve(__dirname, 'src/hooks') },
      { find: '@layouts', replacement: resolve(__dirname, 'src/layouts') },
      { find: '@pages', replacement: resolve(__dirname, 'src/pages') },
      { find: '@routes', replacement: resolve(__dirname, 'src/routes') },
      { find: '@services', replacement: resolve(__dirname, 'src/services') },
      { find: '@states', replacement: resolve(__dirname, 'src/states') },
      { find: '@utils', replacement: resolve(__dirname, 'src/utils') },
      { find: '@wrapper', replacement: resolve(__dirname, 'src/wrapper') },
      {
        find: '@locales',
        replacement: resolve(__dirname, 'src/locales'),
      },
      {
        find: '@definition',
        replacement: resolve(__dirname, 'src/definition'),
      },
      { find: '@global', replacement: resolve(__dirname, 'src/global') },
      { find: '@db', replacement: resolve(__dirname, 'src/indexedDb') },
      { find: '@views', replacement: resolve(__dirname, 'src/views') },
    ],
  },
  worker: { plugins: () => [comlink()] },
  server: {
    port: 4050,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: { port: 4050 },
  build: {
    chunkSizeWarningLimit: 2500,
    target: 'esnext',
    rollupOptions: {
      output: { manualChunks: { vendor: ['react'] } },
    },
  },
});
