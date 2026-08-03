import { describe, expect, it } from 'vitest';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { countWeeksChangedSincePublish } from '@services/app/month_publish';
import {
  deriveWeekOutingSlots,
  normalizeServiceOutingSettings,
  normalizeServiceOutingWeek,
} from './service_outings';

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

/**
 * Forma de los campos que han pasado a cifrarse.
 *
 * `monthlyOverrides`, `disabledSlots` y `sharedSlots` viajaban en claro y ahora
 * van cifrados. Mientras la congregación se actualiza, quien tenga la versión
 * anterior no sabe descifrarlos y se queda con la cadena cifrada tal cual:
 * `sharedSlots.map(...)` sobre un texto rompe la página de Salidas entera.
 *
 * AUSENTE no es lo mismo que MAL: aquí ausente significa "no hay ninguna
 * excepción / ningún turno inhabilitado", y todo el módulo ya lo lee con `|| []`
 * y `?.`. Solo se corrige lo que está presente con la forma equivocada.
 */
describe('normalizar la forma de los ajustes de salidas', () => {
  const CIFRADO = 'U2FsdGVkX1+abc123==';

  it('unos turnos compartidos sin descifrar se quedan en lista vacía', () => {
    const settings = build({
      sharedSlots:
        CIFRADO as unknown as ServiceOutingSettingsType['sharedSlots'],
    });

    expect(normalizeServiceOutingSettings(settings).sharedSlots).toEqual([]);
  });

  it('unos turnos inhabilitados sin descifrar se quedan en lista vacía', () => {
    const settings = build({
      disabledSlots: CIFRADO as unknown as string[],
    });

    expect(normalizeServiceOutingSettings(settings).disabledSlots).toEqual([]);
  });

  it('unas excepciones de mes sin descifrar se quedan en objeto vacío', () => {
    const settings = build({
      monthlyOverrides:
        CIFRADO as unknown as ServiceOutingSettingsType['monthlyOverrides'],
    });

    expect(normalizeServiceOutingSettings(settings).monthlyOverrides).toEqual(
      {}
    );
  });

  it('lo que no está sigue sin estar: ausente no es lo mismo que mal', () => {
    const settings = normalizeServiceOutingSettings(build());

    expect(settings.monthlyOverrides).toBeUndefined();
    expect(settings.disabledSlots).toBeUndefined();
    expect(settings.sharedSlots).toBeUndefined();
  });

  it('lo que llega bien se queda tal cual', () => {
    const monthlyOverrides = { '2026/08': { isCancelledMonth: true } };
    const disabledSlots = ['monday_morning'];
    const sharedSlots = [
      { id: 'a1', slotKey: 'sunday_morning', congregation: 'Elda Oeste' },
    ];

    const settings = normalizeServiceOutingSettings(
      build({ monthlyOverrides, disabledSlots, sharedSlots })
    );

    expect(settings.monthlyOverrides).toEqual(monthlyOverrides);
    expect(settings.disabledSlots).toEqual(disabledSlots);
    expect(settings.sharedSlots).toEqual(sharedSlots);
  });
});

/**
 * El filo del booleano.
 *
 * `isCircuitOverseerWeek` también ha pasado a cifrarse, y una cadena cifrada es
 * un valor VERDADERO. Sin normalizar, un registro sin descifrar marcaría la
 * semana como la del superintendente de circuito y `deriveWeekOutingSlots`
 * pondría al superintendente en todos los turnos libres de miércoles a domingo,
 * sin que nadie lo haya marcado.
 */
describe('normalizar la forma de una semana de salidas', () => {
  const CIFRADO = 'U2FsdGVkX1+abc123==';

  it('un texto cifrado NO cuenta como semana del superintendente', () => {
    const week = normalizeServiceOutingWeek({
      weekOf: '2026/10/12',
      isCircuitOverseerWeek: CIFRADO as unknown as boolean,
    });

    expect(week.isCircuitOverseerWeek).toBeUndefined();
    expect(!!week.isCircuitOverseerWeek).toBe(false);
  });

  it('sin normalizar, ese mismo texto llenaría la semana de superintendente', () => {
    const settings = build({ defaultHours: { wednesday_morning: '10:00' } });

    const sinNormalizar = deriveWeekOutingSlots(
      settings,
      { isCircuitOverseerWeek: CIFRADO as unknown as boolean },
      '2026/10/12'
    );
    expect(
      sinNormalizar.some((s) => s.person === 'CIRCUIT_OVERSEER')
    ).toBe(true);

    const normalizada = deriveWeekOutingSlots(
      settings,
      normalizeServiceOutingWeek({
        weekOf: '2026/10/12',
        isCircuitOverseerWeek: CIFRADO as unknown as boolean,
      }),
      '2026/10/12'
    );
    expect(normalizada.some((s) => s.person === 'CIRCUIT_OVERSEER')).toBe(false);
  });

  it('un booleano de verdad se respeta, tanto true como false', () => {
    expect(
      normalizeServiceOutingWeek({
        weekOf: '2026/10/12',
        isCircuitOverseerWeek: true,
      }).isCircuitOverseerWeek
    ).toBe(true);

    expect(
      normalizeServiceOutingWeek({
        weekOf: '2026/10/19',
        isCircuitOverseerWeek: false,
      }).isCircuitOverseerWeek
    ).toBe(false);
  });

  it('unas horas a medida sin descifrar se quitan, no se dejan en {}', () => {
    // Un `{}` de relleno abriría el bloque de horas a medida en el diálogo de
    // la semana, porque se decide con `!!weekRecord?.weekOverrideHours`.
    const week = normalizeServiceOutingWeek({
      weekOf: '2026/10/12',
      weekOverrideHours: CIFRADO as unknown as Record<string, string>,
    });

    expect(week.weekOverrideHours).toBeUndefined();
    expect('weekOverrideHours' in week).toBe(false);
  });

  it('unas horas a medida buenas se quedan tal cual', () => {
    const weekOverrideHours = { wednesday_morning: '10:30' };

    expect(
      normalizeServiceOutingWeek({ weekOf: '2026/10/12', weekOverrideHours })
        .weekOverrideHours
    ).toEqual(weekOverrideHours);
  });

  it('una semana normal no se toca, y sin registro no revienta', () => {
    const week = { weekOf: '2026/10/12', outings: [] };

    expect(normalizeServiceOutingWeek(week)).toEqual(week);
    expect(normalizeServiceOutingWeek(null)).toBeNull();
  });
});
