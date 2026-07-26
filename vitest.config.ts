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
      // La base de datos local no existe fuera del navegador. Los módulos que
      // se prueban aquí NO la usan (son funciones puras), pero la importan por
      // arriba, así que se sustituye por un doble vacío para poder cargarlos.
      { find: '@db/appDb', replacement: resolve(__dirname, 'src/test/appDbStub.ts') },
      { find: '@constants', replacement: resolve(__dirname, 'src/constants') },
      { find: '@definition', replacement: resolve(__dirname, 'src/definition') },
      { find: '@services', replacement: resolve(__dirname, 'src/services') },
      { find: '@utils', replacement: resolve(__dirname, 'src/utils') },
      { find: '@states', replacement: resolve(__dirname, 'src/states') },
    ],
  },
});
