import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El permiso para reconstruir las tablas derivadas.
 *
 * Desde que el arranque solo espera al idioma de la interfaz, las cuatro
 * tablas que se rehacen ENTERAS desde las traducciones —tipos de semana,
 * asignaciones, discursos públicos y canciones— pueden encontrarse con que un
 * idioma todavía no ha llegado. Reconstruirlas en ese momento no da error: da
 * una tabla peor. Sin los títulos del idioma que falta en canciones y
 * discursos, y con CASTELLANO metido en la casilla del inglés en tipos de
 * semana y asignaciones, porque `getTranslation` cae en `fallbackLng`. Como la
 * tabla queda distinta de la que había, se escribe — y de ahí viaja a los
 * demás dispositivos en la siguiente sincronización.
 *
 * Por eso se prueba aquí lo único que importa de este módulo: que solo dice
 * que sí cuando están TODOS, y que un fallo de descarga es un no, nunca una
 * excepción suelta que tumbe el arranque.
 */

const bundles = new Set<string>();

vi.mock('react-i18next', () => ({
  getI18n: () => ({
    hasResourceBundle: (locale: string) => bundles.has(locale),
  }),
}));

const cargarModulo = async () => {
  vi.resetModules();
  return import('./ready');
};

describe('localesListos', () => {
  beforeEach(() => {
    bundles.clear();
  });

  it('dice que sí cuando están todos los idiomas pedidos', async () => {
    const { localesListos } = await cargarModulo();
    bundles.add('spa');
    bundles.add('eng');

    await expect(localesListos(['spa', 'eng'])).resolves.toBe(true);
  });

  it('dice que NO si falta uno solo', async () => {
    const { localesListos } = await cargarModulo();
    bundles.add('spa');

    await expect(localesListos(['spa', 'eng'])).resolves.toBe(false);
  });

  it('espera a la carga en segundo plano antes de responder', async () => {
    const { localesListos, setPendingLocales } = await cargarModulo();
    bundles.add('spa');

    let terminarCarga: () => void;
    setPendingLocales(
      new Promise<void>((resolve) => {
        terminarCarga = () => {
          bundles.add('eng');
          resolve();
        };
      })
    );

    let respuesta: boolean | undefined;
    const consulta = localesListos(['spa', 'eng']).then((v) => {
      respuesta = v;
    });

    // Todavía no ha llegado el inglés: la consulta no puede haber contestado.
    await Promise.resolve();
    expect(respuesta).toBeUndefined();

    terminarCarga!();
    await consulta;

    expect(respuesta).toBe(true);
  });

  it('si la carga falla, responde que no en vez de lanzar', async () => {
    const { localesListos, setPendingLocales } = await cargarModulo();
    bundles.add('spa');

    setPendingLocales(Promise.reject(new Error('se cayó la red')));

    await expect(localesListos(['spa', 'eng'])).resolves.toBe(false);
  });

  it('sin nada pendiente no se queda esperando', async () => {
    const { localesListos } = await cargarModulo();
    bundles.add('spa');

    await expect(localesListos(['spa'])).resolves.toBe(true);
  });
});
