import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import loadVersion from 'vite-plugin-package-version';
import { comlink } from 'vite-plugin-comlink';
import { resolve } from 'path';
import { execSync } from 'child_process';
import svgx from '@svgx/vite-plugin-react';

// Hash corto del commit en el momento del build. Se muestra en "Acerca de"
// para poder verificar exactamente qué versión está corriendo un dispositivo.
let buildSha = 'dev';
try {
  buildSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // fuera de un repo git (p.ej. build aislado): se queda como 'dev'
}

// Número de build: total de commits en el historial. A diferencia del
// campo "version" de package.json (que hay que subir a mano en cada
// release), este número sube solo con cada commit — nunca requiere editar
// ningún archivo para que "Acerca de" muestre un build distinto.
let buildNumber = '0';
try {
  buildNumber = execSync('git rev-list --count HEAD').toString().trim();
} catch {
  // fuera de un repo git (p.ej. build aislado): se queda como '0'
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
  },
  plugins: [react(), comlink(), eslint(), loadVersion(), svgx()],
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
