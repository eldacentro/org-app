import { describe, expect, it } from 'vitest';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { countWeeksChangedSincePublish } from '@services/app/month_publish';
import { normalizeServiceOutingSettings } from './service_outings';

/**
 * Forma del sello de publicación de las salidas.
 *
 * `publishedMonthsAt` viaja cifrado. Un dispositivo con la versión anterior no
 * sabe descifrarlo y se queda con la cadena cifrada tal cual; si esa cadena
 * llegara a `setMonthPublishedAt`, el `{...cadena}` la desharía en un objeto de
 * letras sueltas y eso es lo que se guardaría en la congregación entera. Esto
 * fija que cualquier forma que llegue se quede en un objeto vacío.
 */

const build = (extra: Partial<ServiceOutingSettingsType> = {}) =>
  ({
    weekOf: 'settings',
    defaultHours: {},
    locations: [],
    availability: {},
    ...extra,
  }) as ServiceOutingSettingsType;

describe('normalizar el sello de publicación de las salidas', () => {
  it('un sello que llega como texto cifrado se queda vacío, no rompe', () => {
    const settings = build({
      publishedMonthsAt: 'U2FsdGVkX1+abc123==' as unknown as Record<
        string,
        string
      >,
    });

    expect(normalizeServiceOutingSettings(settings).publishedMonthsAt).toEqual(
      {}
    );
  });

  it('un sello a null pasa a objeto vacío, nunca se queda en null', () => {
    const settings = build({
      publishedMonthsAt: null as unknown as Record<string, string>,
    });

    expect(normalizeServiceOutingSettings(settings).publishedMonthsAt).toEqual(
      {}
    );
  });

  it('sin sello ninguno se crea vacío, para poder sellar encima', () => {
    expect(normalizeServiceOutingSettings(build()).publishedMonthsAt).toEqual(
      {}
    );
  });

  it('una lista tampoco vale: el sello es un mapa mes → fecha', () => {
    const settings = build({
      publishedMonthsAt: ['2026/09'] as unknown as Record<string, string>,
    });

    expect(normalizeServiceOutingSettings(settings).publishedMonthsAt).toEqual(
      {}
    );
  });

  it('un sello bueno se queda tal cual', () => {
    const sello = { '2026/09': '2026-08-03T10:00:00.000Z' };

    expect(
      normalizeServiceOutingSettings(build({ publishedMonthsAt: sello }))
        .publishedMonthsAt
    ).toEqual(sello);
  });

  it('sin ajustes no revienta', () => {
    expect(normalizeServiceOutingSettings(null)).toBeNull();
  });
});

/**
 * Publicar NO puede contarse a sí mismo como un cambio.
 *
 * En Salidas el sello va en el registro de ajustes, que vive en la MISMA tabla
 * que las semanas (`weekOf: 'settings'`). Publicar guarda ese registro con una
 * marca nueva, así que si llegara a colarse en la lista de semanas, el aviso
 * saldría solo por publicar y diría «has cambiado 1 semana» sin que nadie haya
 * tocado nada.
 *
 * La página lee las semanas de `serviceOutingsListState`, que ya excluye
 * 'settings'. Esto fija el segundo cierre: aunque se colara, no cuenta, porque
 * 'settings' no es la fecha de ningún mes.
 */
describe('publicar no se cuenta a sí mismo como cambio', () => {
  const SELLO = '2026-08-03T10:00:00.000Z';

  it('el registro de ajustes no cuenta como semana tocada', () => {
    const registros = [
      { weekOf: 'settings', updatedAt: SELLO },
      { weekOf: '2026/09/07', updatedAt: '2026-08-01T10:00:00.000Z' },
    ];

    expect(countWeeksChangedSincePublish(registros, '2026/09', SELLO)).toBe(0);
  });

  it('una semana guardada en el mismo instante tampoco cuenta', () => {
    const registros = [{ weekOf: '2026/09/07', updatedAt: SELLO }];

    expect(countWeeksChangedSincePublish(registros, '2026/09', SELLO)).toBe(0);
  });

  it('tocar una semana después de publicar sí cuenta', () => {
    const registros = [
      { weekOf: '2026/09/07', updatedAt: '2026-08-04T09:00:00.000Z' },
      { weekOf: '2026/09/14', updatedAt: '2026-08-01T09:00:00.000Z' },
    ];

    expect(countWeeksChangedSincePublish(registros, '2026/09', SELLO)).toBe(1);
  });
});
