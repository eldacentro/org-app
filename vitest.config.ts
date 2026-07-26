import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Pruebas automáticas del proyecto.
 *
 * Alcance a propósito reducido: NO se prueba la interfaz. Se prueban las
 * piezas donde un fallo se traduce en datos perdidos o mal contados —la fusión
 * de la sincronización, el cifrado, las reglas de retención— que es donde este
 * repo ya ha sangrado. Corren en Node, sin navegador, así que son rápidas y se
 * pueden ejecutar en cada cambio.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: [
      { find: '@constants', replacement: resolve(__dirname, 'src/constants') },
      { find: '@definition', replacement: resolve(__dirname, 'src/definition') },
      { find: '@services', replacement: resolve(__dirname, 'src/services') },
      { find: '@utils', replacement: resolve(__dirname, 'src/utils') },
      { find: '@states', replacement: resolve(__dirname, 'src/states') },
    ],
  },
});
