import { describe, expect, it } from 'vitest';
import {
  buildAllDeptSlots,
  buildDeptSlots,
  DEFAULT_DEPT_CONFIG,
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
