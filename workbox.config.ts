import { generateSW } from 'workbox-build';

export default generateSW({
  swDest: 'dist/service-worker.js',
  globDirectory: 'dist/',
  // `mjs` entró con pdf.js, que convierte la hojita en imagen para mandarla por
  // WhatsApp: su hilo de trabajo se emite con esa extensión y, sin recogerlo
  // aquí, quedaba fuera de la precarga. Se veía solo sin conexión — con
  // cobertura el navegador lo pedía a la red y nadie se enteraba.
  globPatterns: [
    '**/*.{ico,json,png,html,js,mjs,css,webmanifest,pdf,svg,woff,woff2,ttf}',
  ],
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
  maximumFileSizeToCacheInBytes: 12582912,
  sourcemap: false,
  clientsClaim: true,
  skipWaiting: true,
}).then(({ count, size, warnings, filePaths }) => {
  if (warnings.length > 0) {
    console.warn(
      'Warnings encountered while generating a service worker:',
      warnings.join('\n')
    );
  }

  const appSize = (size / (1024 * 1024)).toFixed(2);

  console.log(
    `The service worker files were written to:\n  • ${filePaths.join('\n  • ')}`
  );

  console.log(
    `The service worker will precache ${count} URLs, totaling ${appSize} MB.`
  );
});
