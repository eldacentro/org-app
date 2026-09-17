import { describe, expect, it } from 'vitest';
import { ServiceOutingSettingsType } from '@definition/service_outings';
import { countWeeksChangedSincePublish } from '@services/app/month_publish';
import {
  applyWeekShiftDrafts,
  deriveWeekOutingSlots,
  isExtraOutingSlot,
  isOutingSlotSuppressedByMonth,
  isOutingsMonthCancelled,
  isOutingsMonthFullyCancelled,
  normalizeServiceOutingSettings,
  normalizeServiceOutingWeek,
  outingSlotLabel,
  rekeyOutingCompanions,
  weekExtraSlots,
  weekShiftCollisions,
  weekShiftDrafts,
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
    expect(sinNormalizar.some((s) => s.person === 'CIRCUIT_OVERSEER')).toBe(
      true
    );

    const normalizada = deriveWeekOutingSlots(
      settings,
      normalizeServiceOutingWeek({
        weekOf: '2026/10/12',
        isCircuitOverseerWeek: CIFRADO as unknown as boolean,
      }),
      '2026/10/12'
    );
    expect(normalizada.some((s) => s.person === 'CIRCUIT_OVERSEER')).toBe(
      false
    );
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
  const AGOSTO = {
    isCancelledMonth: true,
    keepActiveSlots: ['saturday_morning'],
  };

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

    expect(
      isOutingSlotSuppressedByMonth(s, '2026/08', 'saturday_morning')
    ).toBe(false);
    expect(
      isOutingSlotSuppressedByMonth(s, '2026/08', 'wednesday_morning')
    ).toBe(true);
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

/**
 * Turnos añadidos solo para una semana y «Ajustes de la semana».
 *
 * El caso real es la visita del superintendente de circuito: esa semana se sale
 * un miércoles por la tarde que normalmente no existe, y el sábado se queda
 * antes. Lo que estas pruebas fijan es que añadir, mover y quitar turnos no
 * deje asignaciones colgando — que es como un hermano acaba viendo en Mis
 * asignaciones una salida a una hora que ya no hay.
 */
describe('turnos añadidos solo para una semana', () => {
  // Lunes 14 de septiembre de 2026.
  const WEEK = '2026/09/14';

  const settings = build({
    defaultHours: {
      saturday_morning: '09:45',
      wednesday_morning: '10:00',
    },
    // Solo se sale el miércoles y el sábado por la mañana.
    disabledSlots: [
      'monday',
      'tuesday',
      'thursday',
      'friday',
      'sunday',
      'wednesday_afternoon',
      'saturday_afternoon',
    ],
  });

  it('sin turnos añadidos todo sale como siempre', () => {
    const slots = deriveWeekOutingSlots(settings, undefined, WEEK);

    expect(slots.map((s) => `${s.slotType}@${s.time}`)).toEqual([
      'wednesday_morning@10:00',
      'saturday_morning@09:45',
    ]);
  });

  it('un turno añadido sale en su día, ordenado por hora, aunque ese turno esté inhabilitado', () => {
    const slots = deriveWeekOutingSlots(
      settings,
      {
        extraSlots: [
          { id: 'x1', date: '2026/09/16', time: '17:00' },
          { id: 'x2', date: '2026/09/16', time: '08:30' },
        ],
      },
      WEEK
    );

    expect(slots.map((s) => `${s.date} ${s.time}`)).toEqual([
      '2026/09/16 08:30',
      '2026/09/16 10:00',
      '2026/09/16 17:00',
      '2026/09/19 09:45',
    ]);
    expect(slots[0].extraId).toBe('x2');
    expect(slots[1].extraId).toBeUndefined();
    // La clave sigue siendo única dentro del día.
    expect(new Set(slots.map((s) => `${s.date}_${s.slotType}`)).size).toBe(4);
  });

  it('en la semana del superintendente, el turno añadido sin conductor lo lleva él', () => {
    const slots = deriveWeekOutingSlots(
      settings,
      {
        isCircuitOverseerWeek: true,
        extraSlots: [
          { id: 'mie', date: '2026/09/16', time: '17:00' },
          { id: 'mar', date: '2026/09/15', time: '17:00' },
        ],
      },
      WEEK
    );

    const miercoles = slots.find((s) => s.extraId === 'mie');
    const martes = slots.find((s) => s.extraId === 'mar');

    expect(miercoles.person).toBe('CIRCUIT_OVERSEER');
    // El martes llega: ese día no sale con la congregación.
    expect(martes.person).toBe('');
  });

  it('un turno añadido con conductor enseña al conductor', () => {
    const slots = deriveWeekOutingSlots(
      settings,
      {
        isCircuitOverseerWeek: true,
        extraSlots: [{ id: 'mie', date: '2026/09/16', time: '17:00' }],
        outings: [
          {
            date: '2026/09/16',
            time: '17:00',
            person: 'roberto',
            location: 'Parque',
            cancelled: false,
          },
        ],
      },
      WEEK
    );

    const turno = slots.find((s) => s.extraId === 'mie');

    expect(turno.person).toBe('roberto');
    expect(turno.location).toBe('Parque');
  });

  it('un mes suspendido no esconde un turno añadido a propósito', () => {
    const suspendido = build({
      ...settings,
      monthlyOverrides: { '2026/09': { isCancelledMonth: true } },
    });

    const slots = deriveWeekOutingSlots(
      suspendido,
      { extraSlots: [{ id: 'x', date: '2026/09/19', time: '10:00' }] },
      WEEK
    );

    expect(slots.map((s) => s.time)).toEqual(['10:00']);
  });

  it('no duplica una hora que ya existe ese día', () => {
    const slots = deriveWeekOutingSlots(
      settings,
      { extraSlots: [{ id: 'x', date: '2026/09/16', time: '10:00' }] },
      WEEK
    );

    expect(slots.filter((s) => s.date === '2026/09/16')).toHaveLength(1);
  });

  it('de otra semana, mal formado o sin descifrar: se ignora sin romper', () => {
    expect(weekExtraSlots({ extraSlots: 'U2FsdGVkX1+abc123==' })).toEqual([]);
    expect(weekExtraSlots({ extraSlots: null })).toEqual([]);
    expect(
      weekExtraSlots({
        extraSlots: [
          null,
          { id: '', date: '2026/09/16', time: '17:00' },
          { id: 'a', date: '16/09/2026', time: '17:00' },
          { id: 'b', date: '2026/09/16', time: '25:00' },
          { id: 'ok', date: '2026/09/16', time: '17:00' },
        ],
      })
    ).toEqual([{ id: 'ok', date: '2026/09/16', time: '17:00' }]);

    // Un turno con fecha de otra semana no aparece en esta.
    const slots = deriveWeekOutingSlots(
      settings,
      { extraSlots: [{ id: 'x', date: '2026/09/23', time: '17:00' }] },
      WEEK
    );

    expect(slots.some((s) => s.extraId === 'x')).toBe(false);
  });

  it('la etiqueta de un turno añadido sale de su hora', () => {
    expect(outingSlotLabel('wednesday_morning', '10:00')).toBe('Mañana');
    expect(outingSlotLabel('wednesday_afternoon', '17:00')).toBe('Tarde');
    expect(outingSlotLabel('wednesday_extra_x', '08:30')).toBe('Mañana');
    expect(outingSlotLabel('wednesday_extra_x', '17:00')).toBe('Tarde');
    expect(outingSlotLabel('wednesday_extra_x', '20:30')).toBe('Noche');
    expect(isExtraOutingSlot('wednesday_extra_x')).toBe(true);
    expect(isExtraOutingSlot('wednesday_morning')).toBe(false);
  });
});

describe('ajustes de la semana', () => {
  const WEEK = '2026/09/14';

  const settings = build({
    defaultHours: {
      saturday_morning: '09:45',
      wednesday_morning: '10:00',
    },
    disabledSlots: [
      'monday',
      'tuesday',
      'thursday',
      'friday',
      'sunday',
      'wednesday_afternoon',
      'saturday_afternoon',
    ],
  });

  const semana = () => ({
    weekOf: WEEK,
    updatedAt: '2026-09-01T10:00:00.000Z',
    outings: [
      {
        id: 'o-sab',
        date: '2026/09/19',
        time: '09:45',
        person: 'juan',
        location: 'Salón del Reino',
        cancelled: false,
      },
      {
        id: 'o-mie',
        date: '2026/09/16',
        time: '10:00',
        person: 'pedro',
        location: 'Salón del Reino',
        cancelled: false,
      },
    ],
  });

  it('los borradores traen la hora de siempre para poder volver a ella', () => {
    const drafts = weekShiftDrafts(
      settings,
      { ...semana(), weekOverrideHours: { saturday_morning: '09:30' } },
      WEEK
    );

    const sabado = drafts.find((d) => d.key === 'saturday_morning');

    expect(sabado.time).toBe('09:30');
    expect(sabado.habitualTime).toBe('09:45');
    expect(sabado.kind).toBe('habitual');
  });

  it('cambiar la hora de un turno se lleva su asignación', () => {
    const drafts = weekShiftDrafts(settings, semana(), WEEK).map((d) =>
      d.key === 'saturday_morning' ? { ...d, time: '09:30' } : d
    );

    const { record, moved } = applyWeekShiftDrafts({
      weekRecord: semana(),
      weekOf: WEEK,
      isCircuitOverseerWeek: true,
      drafts,
    });

    expect(record.weekOverrideHours).toEqual({ saturday_morning: '09:30' });
    expect(record.outings.find((o) => o.id === 'o-sab').time).toBe('09:30');
    // La del miércoles no se ha tocado.
    expect(record.outings.find((o) => o.id === 'o-mie').time).toBe('10:00');
    expect(moved).toEqual([{ date: '2026/09/19', from: '09:45', to: '09:30' }]);

    // Y el programa enseña a Juan en el turno nuevo, no un hueco.
    const slots = deriveWeekOutingSlots(settings, record, WEEK);

    expect(slots.find((s) => s.slotType === 'saturday_morning').person).toBe(
      'juan'
    );
  });

  it('dos turnos que intercambian sus horas no se pisan', () => {
    const base = {
      ...semana(),
      extraSlots: [{ id: 'x', date: '2026/09/16', time: '12:00' }],
      outings: [
        ...semana().outings,
        {
          id: 'o-x',
          date: '2026/09/16',
          time: '12:00',
          person: 'luis',
          location: 'Salón del Reino',
          cancelled: false,
        },
      ],
    };

    const drafts = weekShiftDrafts(settings, base, WEEK).map((d) => {
      if (d.key === 'wednesday_morning') return { ...d, time: '12:00' };
      if (d.key === 'x') return { ...d, time: '10:00' };
      return d;
    });

    const { record } = applyWeekShiftDrafts({
      weekRecord: base,
      weekOf: WEEK,
      isCircuitOverseerWeek: false,
      drafts,
    });

    expect(record.outings.find((o) => o.id === 'o-mie').time).toBe('12:00');
    expect(record.outings.find((o) => o.id === 'o-x').time).toBe('10:00');
  });

  it('quitar un turno añadido quita su asignación, y solo esa', () => {
    const base = {
      ...semana(),
      extraSlots: [{ id: 'x', date: '2026/09/16', time: '17:00' }],
      outings: [
        ...semana().outings,
        {
          id: 'o-x',
          date: '2026/09/16',
          time: '17:00',
          person: 'luis',
          location: 'Salón del Reino',
          cancelled: false,
        },
      ],
    };

    const drafts = weekShiftDrafts(settings, base, WEEK).filter(
      (d) => d.key !== 'x'
    );

    const { record, removed } = applyWeekShiftDrafts({
      weekRecord: base,
      weekOf: WEEK,
      isCircuitOverseerWeek: false,
      drafts,
    });

    expect(record.extraSlots).toBeUndefined();
    expect(record.outings.map((o) => o.id)).toEqual(['o-sab', 'o-mie']);
    expect(removed).toEqual([{ date: '2026/09/16', time: '17:00' }]);
  });

  it('devolver una hora a la de siempre quita la hora a medida', () => {
    const base = {
      ...semana(),
      weekOverrideHours: { saturday_morning: '09:30' },
    };

    const drafts = weekShiftDrafts(settings, base, WEEK).map((d) =>
      d.key === 'saturday_morning' ? { ...d, time: d.habitualTime } : d
    );

    const { record } = applyWeekShiftDrafts({
      weekRecord: base,
      weekOf: WEEK,
      isCircuitOverseerWeek: false,
      drafts,
    });

    expect('weekOverrideHours' in record).toBe(false);
    expect(record.isCircuitOverseerWeek).toBe(false);
  });

  it('una semana sin registro se crea bien', () => {
    const drafts = [
      ...weekShiftDrafts(settings, undefined, WEEK),
      {
        key: 'nuevo',
        kind: 'extra' as const,
        date: '2026/09/17',
        dayKey: 'thursday' as const,
        time: '10:00',
        originalTime: '10:00',
      },
    ];

    const { record } = applyWeekShiftDrafts({
      weekRecord: undefined,
      weekOf: WEEK,
      isCircuitOverseerWeek: true,
      drafts,
    });

    expect(record).toEqual({
      weekOf: WEEK,
      outings: [],
      isCircuitOverseerWeek: true,
      extraSlots: [{ id: 'nuevo', date: '2026/09/17', time: '10:00' }],
    });
  });

  it('avisa de dos turnos del mismo día a la misma hora', () => {
    const drafts = [
      ...weekShiftDrafts(settings, undefined, WEEK),
      {
        key: 'choca',
        kind: 'extra' as const,
        date: '2026/09/16',
        dayKey: 'wednesday' as const,
        time: '10:00',
        originalTime: '10:00',
      },
    ];

    expect(weekShiftCollisions(drafts).sort()).toEqual(
      ['choca', 'wednesday_morning'].sort()
    );
    expect(
      weekShiftCollisions(weekShiftDrafts(settings, undefined, WEEK))
    ).toEqual([]);
  });

  it('no borra unos turnos añadidos que este dispositivo no ha sabido descifrar', () => {
    const base = {
      ...semana(),
      extraSlots: 'U2FsdGVkX1+abc123==' as unknown as [],
    };

    const { record } = applyWeekShiftDrafts({
      weekRecord: base,
      weekOf: WEEK,
      isCircuitOverseerWeek: false,
      drafts: weekShiftDrafts(settings, base, WEEK),
    });

    expect(record.extraSlots).toBe('U2FsdGVkX1+abc123==');
  });

  it('no modifica el registro que recibe', () => {
    const base = semana();
    const copia = structuredClone(base);

    applyWeekShiftDrafts({
      weekRecord: base,
      weekOf: WEEK,
      isCircuitOverseerWeek: true,
      drafts: weekShiftDrafts(settings, base, WEEK).map((d) => ({
        ...d,
        time: '08:00',
      })),
    });

    expect(base).toEqual(copia);
  });
});

describe('los acompañantes del superintendente siguen a su turno', () => {
  const companions = [
    { outingKey: '2026/09/19_09:45', brother: 'juan' },
    { outingKey: '2026/09/16_17:00', brother: 'pedro' },
    { outingKey: '2026/09/16_10:00', brother: 'luis' },
  ];

  it('si el turno cambia de hora, su clave cambia con él', () => {
    const resultado = rekeyOutingCompanions(companions, {
      moved: [{ date: '2026/09/19', from: '09:45', to: '09:30' }],
      removed: [],
    });

    expect(resultado.map((c) => c.outingKey)).toEqual([
      '2026/09/19_09:30',
      '2026/09/16_17:00',
      '2026/09/16_10:00',
    ]);
  });

  it('si se quita un turno añadido, se van sus acompañantes', () => {
    const resultado = rekeyOutingCompanions(companions, {
      moved: [],
      removed: [{ date: '2026/09/16', time: '17:00' }],
    });

    expect(resultado.map((c) => c.brother)).toEqual(['juan', 'luis']);
  });

  it('dos turnos que intercambian sus horas no se pisan', () => {
    const resultado = rekeyOutingCompanions(companions, {
      moved: [
        { date: '2026/09/16', from: '10:00', to: '17:00' },
        { date: '2026/09/16', from: '17:00', to: '10:00' },
      ],
      removed: [],
    });

    expect(resultado.find((c) => c.brother === 'pedro').outingKey).toBe(
      '2026/09/16_10:00'
    );
    expect(resultado.find((c) => c.brother === 'luis').outingKey).toBe(
      '2026/09/16_17:00'
    );
  });

  it('sin nada que tocar devuelve la misma lista: no hay que guardar la visita', () => {
    expect(
      rekeyOutingCompanions(companions, {
        moved: [{ date: '2026/09/18', from: '10:00', to: '11:00' }],
        removed: [],
      })
    ).toBe(companions);
  });
});
