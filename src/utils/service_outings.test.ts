import { describe, expect, it } from 'vitest';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { countWeeksChangedSincePublish } from '@services/app/month_publish';
import {
  deriveWeekOutingSlots,
  isOutingSlotSuppressedByMonth,
  isOutingsMonthCancelled,
  isOutingsMonthFullyCancelled,
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
 * Forma de los campos pendientes de cifrarse.
 *
 * `monthlyOverrides`, `disabledSlots` y `sharedSlots` viajan todavía en claro
 * (ver PENDIENTES_DE_CIFRAR en el mapa de cifrado). Sobre los datos de hoy esta
 * normalización no llega a actuar nunca; está puesta para el día que se active
 * la fase 2, cuando una cadena sin descifrar sí podría llegar aquí y
 * `sharedSlots.map(...)` sobre un texto rompería la página de Salidas entera.
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
 * `isCircuitOverseerWeek` está pendiente de cifrarse, y una cadena cifrada es
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

/**
 * UN MES SUSPENDIDO CON EXCEPCIÓN — el caso real de agosto de 2026.
 *
 * En la congregación, agosto está suspendido pero con el sábado por la mañana
 * mantenido activo: `{ isCancelledMonth: true, keepActiveSlots: ['saturday_morning'] }`.
 * Es el dato más frágil de todo el módulo, porque vive dentro de
 * `monthlyOverrides` —el campo que el normalizador puede vaciar— y porque un
 * `{}` de más no da error: simplemente el mes deja de estar suspendido y
 * aparecen turnos que nadie ha convocado.
 *
 * Y al revés: si el normalizador se pasara de celoso, se llevaría por delante
 * la suspensión al guardar CUALQUIER otro ajuste, porque la página guarda el
 * registro entero de una vez. Esto fija las dos direcciones.
 */
describe('un mes suspendido con excepción se conserva y se puede editar', () => {
  const AGOSTO = { isCancelledMonth: true, keepActiveSlots: ['saturday_morning'] };

  const conAgosto = () =>
    build({
      monthlyOverrides: {
        '2026/07': { saturday_morning: '09:45' },
        '2026/08': AGOSTO,
      },
      disabledSlots: ['monday_morning', 'friday_morning'],
      sharedSlots: [
        { id: 'a1', slotKey: 'saturday_morning', congregation: 'Elda Norte' },
      ],
    });

  it('normalizar no lo toca: sigue suspendido y con su excepción', () => {
    const s = normalizeServiceOutingSettings(conAgosto());

    expect(s.monthlyOverrides['2026/08']).toEqual(AGOSTO);
    expect(isOutingsMonthCancelled(s, '2026/08')).toBe(true);
    expect(isOutingsMonthFullyCancelled(s, '2026/08')).toBe(false);
  });

  it('el sábado por la mañana queda activo; el resto del mes, suprimido', () => {
    const s = normalizeServiceOutingSettings(conAgosto());

    expect(isOutingSlotSuppressedByMonth(s, '2026/08', 'saturday_morning')).toBe(
      false
    );
    expect(isOutingSlotSuppressedByMonth(s, '2026/08', 'wednesday_morning')).toBe(
      true
    );
  });

  it('guardar OTRO ajuste no se lleva por delante la suspensión', () => {
    // La página guarda el registro entero: `{...settings, disabledSlots: [...]}`.
    // Si normalizar vaciara monthlyOverrides, ese guardado propagaría el vacío
    // a toda la congregación y agosto dejaría de estar suspendido para todos.
    const s = normalizeServiceOutingSettings(conAgosto());

    const guardado = normalizeServiceOutingSettings({
      ...s,
      disabledSlots: [...(s.disabledSlots ?? []), 'tuesday_afternoon'],
    } as ServiceOutingSettingsType);

    expect(guardado.monthlyOverrides['2026/08']).toEqual(AGOSTO);
    expect(guardado.monthlyOverrides['2026/07']).toBeDefined();
    expect(guardado.sharedSlots).toHaveLength(1);
  });

  it('se puede quitar la suspensión de agosto sin tocar julio', () => {
    const s = normalizeServiceOutingSettings(conAgosto());
    const sinAgosto = { ...s.monthlyOverrides };
    delete sinAgosto['2026/08'];

    const guardado = normalizeServiceOutingSettings({
      ...s,
      monthlyOverrides: sinAgosto,
    } as ServiceOutingSettingsType);

    expect(isOutingsMonthCancelled(guardado, '2026/08')).toBe(false);
    expect(guardado.monthlyOverrides['2026/07']).toEqual({
      saturday_morning: '09:45',
    });
  });

  it('se puede ampliar la excepción a otro turno', () => {
    const s = normalizeServiceOutingSettings(conAgosto());

    const guardado = normalizeServiceOutingSettings({
      ...s,
      monthlyOverrides: {
        ...s.monthlyOverrides,
        '2026/08': {
          isCancelledMonth: true,
          keepActiveSlots: ['saturday_morning', 'wednesday_morning'],
        },
      },
    } as ServiceOutingSettingsType);

    expect(
      isOutingSlotSuppressedByMonth(guardado, '2026/08', 'wednesday_morning')
    ).toBe(false);
  });

  it('normalizar diez veces seguidas no degrada nada', () => {
    let s = conAgosto();
    const original = structuredClone(s);

    for (let i = 0; i < 10; i++) s = normalizeServiceOutingSettings(s);

    expect(s.monthlyOverrides).toEqual(original.monthlyOverrides);
    expect(s.disabledSlots).toEqual(original.disabledSlots);
    expect(s.sharedSlots).toEqual(original.sharedSlots);
  });
});
