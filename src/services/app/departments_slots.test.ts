import { describe, expect, it } from 'vitest';
import {
  buildAllDeptSlots,
  buildDeptSlots,
  buildDeptSlotGroups,
  DEFAULT_DEPT_CONFIG,
  deptConfigForMonth,
  deptConfigForWeek,
  deptConfigIguales,
  deptConfigSetForMonth,
  deptConfigTramos,
  DepartmentsConfig,
  DepartmentsConfigStored,
  DEPT_LABEL,
  deptSlotKey,
  deptSlotsForMeeting,
  MAX_DEPT_TURNS,
  readDeptConfig,
} from './departments_slots';

/**
 * Puestos de los departamentos.
 *
 * Esto decide qué se guarda, qué se enseña en el editor, qué autocompleta, qué
 * sale en el PDF y qué le llega al hermano. La propiedad que lo hace seguro es
 * que la configuración por defecto produzca EXACTAMENTE las claves que ya
 * están en la base de datos: si eso se rompe, los programas ya guardados dejan
 * de encontrarse y parece que se han borrado.
 */

describe('la configuración por defecto no cambia nada', () => {
  it('las claves son las de siempre, sin sufijos', () => {
    // Si esto falla, los programas ya guardados dejan de leerse.
    expect(buildDeptSlots(null, 'acomodadores').map((s) => s.key)).toEqual([
      'exterior',
      'interior',
    ]);
    expect(buildDeptSlots(null, 'microfonos').map((s) => s.key)).toEqual([
      'micro1',
      'micro2',
    ]);
    expect(buildDeptSlots(null, 'multimedia').map((s) => s.key)).toEqual([
      'video',
      'audio',
    ]);
    expect(buildDeptSlots(null, 'plataforma').map((s) => s.key)).toEqual([
      'encargado',
    ]);
  });

  it('todos los departamentos juntos dan los siete puestos de siempre', () => {
    const keys = buildAllDeptSlots(undefined).map((s) => `${s.dept}.${s.key}`);

    expect(keys).toEqual([
      'acomodadores.exterior',
      'acomodadores.interior',
      'microfonos.micro1',
      'microfonos.micro2',
      'multimedia.video',
      'multimedia.audio',
      'plataforma.encargado',
    ]);
  });

  it('sin configuración guardada, se asume lo de siempre', () => {
    expect(readDeptConfig(null, 'acomodadores')).toEqual(DEFAULT_DEPT_CONFIG);
    expect(readDeptConfig({}, 'microfonos')).toEqual(DEFAULT_DEPT_CONFIG);
  });

  it('el rótulo es el del puesto, sin añadidos', () => {
    expect(buildDeptSlots(null, 'acomodadores')[0].label).toBe('Exterior');
  });
});

describe('por reunión', () => {
  const config = { acomodadores: { scope: 'meeting' as const, turns: 1 } };

  it('desdobla cada puesto en las dos reuniones', () => {
    expect(buildDeptSlots(config, 'acomodadores').map((s) => s.key)).toEqual([
      'exterior__midweek',
      'interior__midweek',
      'exterior__weekend',
      'interior__weekend',
    ]);
  });

  it('el rótulo dice de qué reunión es', () => {
    const slots = buildDeptSlots(config, 'acomodadores');

    expect(slots[0].label).toBe('Exterior · Entre semana');
    expect(slots[2].label).toBe('Exterior · Fin de semana');
  });

  it('no toca los departamentos que no se configuran', () => {
    expect(buildDeptSlots(config, 'microfonos').map((s) => s.key)).toEqual([
      'micro1',
      'micro2',
    ]);
  });
});

describe('turnos (principio y final)', () => {
  it('un puesto por semana se parte en dos turnos', () => {
    const config = { acomodadores: { scope: 'week' as const, turns: 2 } };

    expect(buildDeptSlots(config, 'acomodadores').map((s) => s.key)).toEqual([
      'exterior',
      'exterior__t2',
      'interior',
      'interior__t2',
    ]);
  });

  it('el primer turno conserva la clave de siempre', () => {
    // Así, activar los turnos no pierde lo que ya estaba asignado.
    const config = { microfonos: { scope: 'week' as const, turns: 2 } };
    const slots = buildDeptSlots(config, 'microfonos');

    expect(slots[0].key).toBe('micro1');
    expect(slots[0].label).toBe('Micro 1 · Principio');
    expect(slots[1].label).toBe('Micro 1 · Final');
  });

  it('se combinan con las reuniones', () => {
    const config = { plataforma: { scope: 'meeting' as const, turns: 2 } };

    expect(buildDeptSlots(config, 'plataforma').map((s) => s.key)).toEqual([
      'encargado__midweek',
      'encargado__midweek__t2',
      'encargado__weekend',
      'encargado__weekend__t2',
    ]);

    expect(buildDeptSlots(config, 'plataforma')[1].label).toBe(
      'Encargado · Entre semana · Final'
    );
  });

  it('están disponibles para cualquier departamento, no solo acomodadores', () => {
    const config = { multimedia: { scope: 'week' as const, turns: 2 } };

    expect(buildDeptSlots(config, 'multimedia').map((s) => s.key)).toContain(
      'video__t2'
    );
  });
});

describe('valores raros no rompen nada', () => {
  it('un número de turnos absurdo se recorta', () => {
    const config = { acomodadores: { scope: 'week' as const, turns: 99 } };

    expect(readDeptConfig(config, 'acomodadores').turns).toBe(MAX_DEPT_TURNS);
  });

  it('cero o negativo vuelve a un turno', () => {
    expect(
      readDeptConfig(
        { acomodadores: { scope: 'week', turns: 0 } },
        'acomodadores'
      ).turns
    ).toBe(1);
  });

  it('un ámbito desconocido se trata como "por semana"', () => {
    expect(
      readDeptConfig(
        { acomodadores: { scope: 'loquesea' as never, turns: 1 } },
        'acomodadores'
      ).scope
    ).toBe('week');
  });
});

describe('qué puestos le tocan a cada reunión', () => {
  it('por semana, el mismo puesto sale en las dos', () => {
    // Es lo que ya hacía "Mis asignaciones" al partir la semana en dos.
    expect(
      deptSlotsForMeeting(null, 'acomodadores', 'midweek').map((s) => s.key)
    ).toEqual(['exterior', 'interior']);
    expect(
      deptSlotsForMeeting(null, 'acomodadores', 'weekend').map((s) => s.key)
    ).toEqual(['exterior', 'interior']);
  });

  it('con turnos, cada reunión se lleva los suyos y solo los suyos', () => {
    // Es de lo que vive "Mis asignaciones": el turno del jueves no puede
    // aparecer en la tarjeta del domingo.
    const config = { acomodadores: { scope: 'meeting' as const, turns: 2 } };

    expect(
      deptSlotsForMeeting(config, 'acomodadores', 'midweek').map((s) => s.key)
    ).toEqual([
      'exterior__midweek',
      'exterior__midweek__t2',
      'interior__midweek',
      'interior__midweek__t2',
    ]);
  });

  it('por reunión, cada una tiene los suyos', () => {
    const config = { acomodadores: { scope: 'meeting' as const, turns: 1 } };

    expect(
      deptSlotsForMeeting(config, 'acomodadores', 'midweek').map((s) => s.key)
    ).toEqual(['exterior__midweek', 'interior__midweek']);
    expect(
      deptSlotsForMeeting(config, 'acomodadores', 'weekend').map((s) => s.key)
    ).toEqual(['exterior__weekend', 'interior__weekend']);
  });
});

describe('rótulos de los departamentos', () => {
  it('Multimedia lleva la tilde de siempre en Vídeo', () => {
    // El editor decía "Vídeo" antes de que los puestos salieran de aquí.
    expect(buildDeptSlots(null, 'multimedia')[0].label).toBe('Vídeo');
  });

  it('cada departamento tiene su nombre para el PDF y los avisos', () => {
    expect(DEPT_LABEL.acomodadores).toBe('Acomodadores');
    expect(DEPT_LABEL.microfonos).toBe('Micrófonos');
    expect(DEPT_LABEL.multimedia).toBe('Multimedia');
    expect(DEPT_LABEL.plataforma).toBe('Plataforma');
  });
});

describe('la clave de guardado', () => {
  it('el caso de siempre es el id a secas', () => {
    expect(deptSlotKey('exterior')).toBe('exterior');
    expect(deptSlotKey('exterior', undefined, 1)).toBe('exterior');
  });

  it('y los demás llevan sufijo', () => {
    expect(deptSlotKey('exterior', 'midweek')).toBe('exterior__midweek');
    expect(deptSlotKey('exterior', undefined, 2)).toBe('exterior__t2');
    expect(deptSlotKey('exterior', 'weekend', 2)).toBe('exterior__weekend__t2');
  });
});

describe('buildDeptSlotGroups — los puestos, agrupados para pintarlos', () => {
  it('sin reuniones ni turnos, un solo grupo SIN rótulo', () => {
    const grupos = buildDeptSlotGroups(null, 'acomodadores');

    expect(grupos).toHaveLength(1);
    expect(grupos[0].titulo).toBeNull();
    // Y las etiquetas se quedan como están: no hay sufijo que quitar.
    expect(grupos[0].slots.map((s) => s.label)).toEqual([
      'Exterior',
      'Interior',
    ]);
  });

  it('por reunión: dos grupos, y la etiqueta del campo pierde el sufijo', () => {
    const config = {
      acomodadores: { scope: 'meeting' as const, turns: 1 },
    };

    const grupos = buildDeptSlotGroups(config, 'acomodadores');

    expect(grupos.map((g) => g.titulo)).toEqual([
      'Entre semana',
      'Fin de semana',
    ]);
    // Lo que se ve en el campo es el puesto y nada más — la reunión la dice el
    // rótulo de arriba.
    expect(grupos[0].slots.map((s) => s.label)).toEqual([
      'Exterior',
      'Interior',
    ]);
    expect(grupos[1].slots.map((s) => s.label)).toEqual([
      'Exterior',
      'Interior',
    ]);
  });

  it('las CLAVES no cambian: son las que guardan la asignación', () => {
    const config = { acomodadores: { scope: 'meeting' as const, turns: 1 } };

    const planas = buildDeptSlots(config, 'acomodadores').map((s) => s.key);
    const agrupadas = buildDeptSlotGroups(config, 'acomodadores').flatMap((g) =>
      g.slots.map((s) => s.key)
    );

    expect(agrupadas).toEqual(planas);
  });

  it('y `buildDeptSlots` sigue devolviendo la etiqueta larga, que es la que viaja a la exportación', () => {
    const config = { acomodadores: { scope: 'meeting' as const, turns: 1 } };

    expect(buildDeptSlots(config, 'acomodadores')[0].label).toBe(
      'Exterior · Entre semana'
    );
  });
});

/**
 * La configuración, mes a mes.
 *
 * El fallo que esto arregla: se cambiaba en septiembre para que rigiera en
 * octubre y el cambio se llevaba por delante septiembre y todo lo anterior —
 * con las asignaciones ya hechas guardadas bajo las claves de entonces, que
 * dejaban de encontrarse y parecían borradas.
 */
describe('la línea del tiempo (tramos)', () => {
  const PorReunion = { scope: 'meeting' as const, turns: 1 };

  /**
   * Leer lo guardado SIN pasar por los tramos, que es lo que hace una versión
   * antigua de la aplicación. El tipo lo prohíbe a propósito (por eso el
   * casting): aquí se hace justo para comprobar que esa versión sigue leyendo
   * algo con sentido.
   */
  const comoUnaVersionAntigua = (guardado: DepartmentsConfigStored) =>
    guardado as DepartmentsConfig;

  describe('sin tramos, todo sigue exactamente como estaba', () => {
    it('la configuración de siempre vale para cualquier semana', () => {
      const guardado = { microfonos: PorReunion };

      for (const semana of ['2020/01/06', '2026/09/07', '2030/12/30']) {
        expect(
          buildDeptSlots(deptConfigForWeek(guardado, semana), 'microfonos').map(
            (s) => s.key
          )
        ).toEqual([
          'micro1__midweek',
          'micro2__midweek',
          'micro1__weekend',
          'micro2__weekend',
        ]);
      }
    });

    it('sin nada guardado, los puestos de siempre', () => {
      expect(
        buildDeptSlots(deptConfigForWeek(null, '2026/09/07'), 'microfonos').map(
          (s) => s.key
        )
      ).toEqual(['micro1', 'micro2']);
    });

    it('y no se inventa una línea del tiempo donde no la hay', () => {
      expect(deptConfigTramos({ microfonos: PorReunion })).toEqual([]);
    });
  });

  describe('cambiar a partir de un mes', () => {
    const guardado = deptConfigSetForMonth({}, '2026/10', {
      microfonos: PorReunion,
    });

    it('septiembre conserva SUS claves: es lo que hace que no se pierda nada', () => {
      expect(
        buildDeptSlots(
          deptConfigForWeek(guardado, '2026/09/28'),
          'microfonos'
        ).map((s) => s.key)
      ).toEqual(['micro1', 'micro2']);
    });

    it('octubre ya va por reunión', () => {
      expect(
        buildDeptSlots(
          deptConfigForWeek(guardado, '2026/10/05'),
          'microfonos'
        ).map((s) => s.key)
      ).toEqual([
        'micro1__midweek',
        'micro2__midweek',
        'micro1__weekend',
        'micro2__weekend',
      ]);
    });

    it('y noviembre también: rige desde ese mes EN ADELANTE', () => {
      expect(
        readDeptConfig(deptConfigForWeek(guardado, '2027/03/01'), 'microfonos')
          .scope
      ).toBe('meeting');
    });

    it('la semana cuenta por su LUNES, igual que la publicación por meses', () => {
      // El lunes 28 de septiembre lleva dentro el 1 de octubre, y aun así es
      // una semana de septiembre: es como la agrupa el selector y como se
      // publica el mes.
      expect(
        readDeptConfig(deptConfigForWeek(guardado, '2026/09/28'), 'microfonos')
          .scope
      ).toBe('week');
    });
  });

  describe('lo que leen las versiones antiguas de la aplicación', () => {
    it('arriba del todo queda la configuración del último tramo, con la forma de siempre', () => {
      const guardado = deptConfigSetForMonth({}, '2026/10', {
        microfonos: PorReunion,
      });

      // Una versión sin tramos lee esto tal cual y se comporta como ayer, en
      // vez de encontrarse una forma que no entiende y quedarse con los
      // puestos por defecto (que es como dejan de encontrarse los programas).
      expect(
        readDeptConfig(comoUnaVersionAntigua(guardado), 'microfonos').scope
      ).toBe('meeting');
    });

    it('sin línea del tiempo no se guarda ninguna: la forma no cambia hasta que hace falta', () => {
      const guardado = deptConfigSetForMonth({}, '', {
        microfonos: PorReunion,
      });

      expect(guardado.__tramos).toBeUndefined();
      expect(
        readDeptConfig(comoUnaVersionAntigua(guardado), 'microfonos').scope
      ).toBe('meeting');
    });
  });

  describe('deshacer', () => {
    it('dejar un mes como estaba quita el tramo, no acumula basura', () => {
      const conTramo = deptConfigSetForMonth({}, '2026/10', {
        microfonos: PorReunion,
      });

      expect(conTramo.__tramos).toHaveLength(2);

      const deshecho = deptConfigSetForMonth(conTramo, '2026/10', {
        microfonos: { scope: 'week', turns: 1 },
      });

      expect(deshecho.__tramos).toBeUndefined();
      expect(
        readDeptConfig(comoUnaVersionAntigua(deshecho), 'microfonos').scope
      ).toBe('week');
    });

    it('«sin configurar» y «por semana, un turno» son lo mismo', () => {
      expect(
        deptConfigIguales({}, { microfonos: { scope: 'week', turns: 1 } })
      ).toBe(true);
      expect(deptConfigIguales({}, { microfonos: PorReunion })).toBe(false);
    });
  });

  describe('varios tramos', () => {
    let guardado: DepartmentsConfigStored = deptConfigSetForMonth(
      {},
      '2026/10',
      {
        microfonos: PorReunion,
      }
    );

    guardado = deptConfigSetForMonth(guardado, '2027/01', {
      microfonos: { scope: 'week', turns: 2 },
    });

    it('cada mes con el suyo', () => {
      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2026/09'), 'microfonos')
      ).toEqual({
        scope: 'week',
        turns: 1,
      });
      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2026/11'), 'microfonos')
      ).toEqual({
        scope: 'meeting',
        turns: 1,
      });
      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2027/02'), 'microfonos')
      ).toEqual({
        scope: 'week',
        turns: 2,
      });
    });

    it('tocar un tramo de en medio no cambia los de después', () => {
      const tocado = deptConfigSetForMonth(guardado, '2026/10', {
        multimedia: PorReunion,
      });

      expect(
        readDeptConfig(deptConfigForMonth(tocado, '2027/02'), 'microfonos')
          .turns
      ).toBe(2);
      expect(
        readDeptConfig(deptConfigForMonth(tocado, '2026/11'), 'multimedia')
          .scope
      ).toBe('meeting');
    });
  });

  describe('lo que llega de otro dispositivo puede venir raro', () => {
    it('desordenado se pone en orden, y el que no tiene mes es el de siempre', () => {
      const guardado = {
        __tramos: [
          { desde: '2026/10', config: { microfonos: PorReunion } },
          { config: {} },
        ],
      } as DepartmentsConfigStored;

      expect(deptConfigTramos(guardado).map((t) => t.desde)).toEqual([
        undefined,
        '2026/10',
      ]);
      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2026/09'), 'microfonos')
          .scope
      ).toBe('week');
    });

    it('una fecha imposible se trata como el tramo de siempre', () => {
      const guardado = {
        __tramos: [{ desde: 'ayer', config: { microfonos: PorReunion } }],
      } as unknown as DepartmentsConfigStored;

      expect(deptConfigTramos(guardado)[0].desde).toBeUndefined();
      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2020/01'), 'microfonos')
          .scope
      ).toBe('meeting');
    });

    it('sin semana ni mes se contesta con la última, que es la de arriba', () => {
      const guardado = deptConfigSetForMonth({}, '2026/10', {
        microfonos: PorReunion,
      });

      expect(
        readDeptConfig(deptConfigForWeek(guardado, ''), 'microfonos').scope
      ).toBe('meeting');
    });

    it('un mes anterior al primer tramo con fecha usa el más antiguo que haya', () => {
      const guardado = {
        __tramos: [{ desde: '2026/10', config: { microfonos: PorReunion } }],
      } as DepartmentsConfigStored;

      expect(
        readDeptConfig(deptConfigForMonth(guardado, '2025/01'), 'microfonos')
          .scope
      ).toBe('meeting');
    });
  });

  it('no muta lo que recibe', () => {
    const guardado = { microfonos: PorReunion };
    const antes = JSON.stringify(guardado);

    deptConfigSetForMonth(guardado, '2026/10', {
      microfonos: { scope: 'week', turns: 1 },
    });

    expect(JSON.stringify(guardado)).toBe(antes);
  });
});
