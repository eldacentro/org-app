import { describe, expect, it } from 'vitest';
import { getObjectLatestUpdate, syncFromRemote } from './merge';

/**
 * El motor de fusión: lo que llega del servidor se mezcla con lo que hay en el
 * dispositivo. Aquí es donde este proyecto ha perdido datos más de una vez, así
 * que estas pruebas describen —caso a caso— lo que TIENE que pasar.
 *
 * Cada `it` está escrito como una frase en cristiano: si alguna falla, el texto
 * ya dice qué se ha roto sin tener que leer el código.
 */

describe('fusión de un registro con marca de tiempo', () => {
  it('lo más nuevo del servidor gana', () => {
    const local = { name: { value: 'local', updatedAt: '2026-01-01T00:00:00Z' } };
    const remote = { name: { value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' } };

    expect(syncFromRemote(local, remote).name.value).toBe('remoto');
  });

  it('lo más nuevo del dispositivo NO se pisa con lo viejo del servidor', () => {
    const local = { name: { value: 'local', updatedAt: '2026-03-01T00:00:00Z' } };
    const remote = { name: { value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' } };

    expect(syncFromRemote(local, remote).name.value).toBe('local');
  });

  it('empate: se queda lo local (no se rescribe por nada)', () => {
    const stamp = '2026-02-01T00:00:00Z';
    const local = { name: { value: 'local', updatedAt: stamp } };
    const remote = { name: { value: 'remoto', updatedAt: stamp } };

    expect(syncFromRemote(local, remote).name.value).toBe('local');
  });

  it('si lo local no tiene marca, el servidor manda', () => {
    const local = { name: { value: 'local', updatedAt: '' } };
    const remote = { name: { value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' } };

    expect(syncFromRemote(local, remote).name.value).toBe('remoto');
  });
});

describe('fusión de listas de registros', () => {
  const week = (weekOf: string, value: string, updatedAt: string) => ({
    weekOf,
    id: weekOf,
    value,
    updatedAt,
  });

  it('una semana que solo está en el servidor se añade', () => {
    const local = { weeks: [week('2026-01-05', 'A', '2026-01-05T00:00:00Z')] };
    const remote = {
      weeks: [
        week('2026-01-05', 'A', '2026-01-05T00:00:00Z'),
        week('2026-01-12', 'B', '2026-01-12T00:00:00Z'),
      ],
    };

    const result = syncFromRemote(local, remote);

    expect(result.weeks).toHaveLength(2);
    expect(result.weeks.map((w) => w.weekOf)).toContain('2026-01-12');
  });

  it('una semana que solo está en el dispositivo NO se borra', () => {
    // Esto es lo que salvó los programas en el incidente de julio: la fusión
    // nunca elimina; para eso están las marcas de borrado.
    const local = {
      weeks: [
        week('2026-01-05', 'A', '2026-01-05T00:00:00Z'),
        week('2026-01-12', 'B', '2026-01-12T00:00:00Z'),
      ],
    };
    const remote = { weeks: [week('2026-01-05', 'A', '2026-01-05T00:00:00Z')] };

    const result = syncFromRemote(local, remote);

    expect(result.weeks).toHaveLength(2);
    expect(result.weeks.map((w) => w.weekOf)).toContain('2026-01-12');
  });

  it('cada semana se decide por separado: una gana el servidor y otra el dispositivo', () => {
    const local = {
      weeks: [
        week('2026-01-05', 'local-vieja', '2026-01-01T00:00:00Z'),
        week('2026-01-12', 'local-nueva', '2026-03-01T00:00:00Z'),
      ],
    };
    const remote = {
      weeks: [
        week('2026-01-05', 'remota-nueva', '2026-02-01T00:00:00Z'),
        week('2026-01-12', 'remota-vieja', '2026-02-01T00:00:00Z'),
      ],
    };

    const result = syncFromRemote(local, remote);

    expect(result.weeks.find((w) => w.weekOf === '2026-01-05')!.value).toBe(
      'remota-nueva'
    );
    expect(result.weeks.find((w) => w.weekOf === '2026-01-12')!.value).toBe(
      'local-nueva'
    );
  });

  it('los registros de hueco fijo se casan por "type" cuando no hay id', () => {
    const local = {
      slots: [{ type: 'chairman', value: 'local', updatedAt: '2026-01-01T00:00:00Z' }],
    };
    const remote = {
      slots: [{ type: 'chairman', value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' }],
    };

    const result = syncFromRemote(local, remote);

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].value).toBe('remoto');
  });

  it('el id manda sobre el type: dos registros con el mismo type no se pisan', () => {
    const local = {
      talks: [
        { id: 'a', type: 'main', value: 'A local', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'b', type: 'main', value: 'B local', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    };
    const remote = {
      talks: [
        { id: 'b', type: 'main', value: 'B remoto', updatedAt: '2026-02-01T00:00:00Z' },
      ],
    };

    const result = syncFromRemote(local, remote);

    expect(result.talks).toHaveLength(2);
    expect(result.talks.find((t) => t.id === 'a')!.value).toBe('A local');
    expect(result.talks.find((t) => t.id === 'b')!.value).toBe('B remoto');
  });
});

describe('cosas que no deberían perderse por el camino', () => {
  it('una marca de borrado más nueva del servidor llega al dispositivo', () => {
    const local = {
      persons: [{ id: 'p1', _deleted: false, updatedAt: '2026-01-01T00:00:00Z' }],
    };
    const remote = {
      persons: [{ id: 'p1', _deleted: true, updatedAt: '2026-02-01T00:00:00Z' }],
    };

    expect(syncFromRemote(local, remote).persons[0]._deleted).toBe(true);
  });

  it('un borrado local reciente no lo resucita un servidor viejo', () => {
    const local = {
      persons: [{ id: 'p1', _deleted: true, updatedAt: '2026-03-01T00:00:00Z' }],
    };
    const remote = {
      persons: [{ id: 'p1', _deleted: false, updatedAt: '2026-02-01T00:00:00Z' }],
    };

    expect(syncFromRemote(local, remote).persons[0]._deleted).toBe(true);
  });

  it('lista vacía en el servidor no vacía la del dispositivo', () => {
    const local = { weeks: [{ id: 'w1', value: 'A', updatedAt: '2026-01-01T00:00:00Z' }] };
    const remote = { weeks: [] };

    expect(syncFromRemote(local, remote).weeks).toHaveLength(1);
  });

  it('los objetos anidados sin marca se fusionan campo a campo, no de golpe', () => {
    const local = {
      meeting: {
        chairman: { value: 'local', updatedAt: '2026-03-01T00:00:00Z' },
        prayer: { value: 'local', updatedAt: '2026-01-01T00:00:00Z' },
      },
    };
    const remote = {
      meeting: {
        chairman: { value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' },
        prayer: { value: 'remoto', updatedAt: '2026-02-01T00:00:00Z' },
      },
    };

    const result = syncFromRemote(local, remote);

    expect(result.meeting.chairman.value).toBe('local');
    expect(result.meeting.prayer.value).toBe('remoto');
  });
});

describe('getObjectLatestUpdate', () => {
  it('encuentra la marca más nueva de todo el árbol', () => {
    const record = {
      a: { updatedAt: '2026-01-01T00:00:00Z' },
      b: { c: { updatedAt: '2026-05-01T00:00:00Z' } },
      d: { updatedAt: '2026-03-01T00:00:00Z' },
    };

    expect(getObjectLatestUpdate(record)).toBe('2026-05-01T00:00:00Z');
  });

  it('devuelve cadena vacía si no hay ninguna marca', () => {
    expect(getObjectLatestUpdate({ a: 1, b: { c: 'x' } })).toBe('');
  });

  it('no se atraganta con null', () => {
    expect(getObjectLatestUpdate({ a: null, b: { updatedAt: '2026-01-01T00:00:00Z' } })).toBe(
      '2026-01-01T00:00:00Z'
    );
  });
});

/**
 * Filos conocidos del motor.
 *
 * Estas pruebas no describen lo ideal, sino lo que el motor hace HOY en
 * situaciones que el esquema de datos nunca produce. Están aquí porque son
 * trampas de verdad: si alguien añade un campo con esa forma, el dato
 * desaparece sin ruido. La prueba es el aviso.
 */
describe('filos conocidos (el esquema los evita, no el motor)', () => {
  it('AVISO: una lista de valores sueltos NO se fusiona — envuélvela en {value, updatedAt}', () => {
    const local = { values: ['A'] };
    const remote = { values: ['A', 'B'] };

    // Lo de fuera se ignora por completo: sin marca de tiempo no hay forma de
    // decidir quién gana, y sobrescribir a ciegas perdería lo local.
    expect(syncFromRemote(local, remote).values).toEqual(['A']);

    // Así SÍ funciona, que es como está todo el esquema:
    const localOk = { values: { value: ['A'], updatedAt: '2026-01-01T00:00:00Z' } };
    const remoteOk = { values: { value: ['A', 'B'], updatedAt: '2026-02-01T00:00:00Z' } };

    expect(syncFromRemote(localOk, remoteOk).values.value).toEqual(['A', 'B']);
  });

  it('AVISO: un registro de lista sin id/type/talk_number se descarta — dale un id', () => {
    const local = { rows: [{ key: 'k1', value: 'local' }] };
    const remote = {
      rows: [
        { key: 'k1', value: 'remoto' },
        { key: 'k2', value: 'nuevo' },
      ],
    };

    // Ni actualiza el que ya estaba ni añade el nuevo.
    expect(syncFromRemote(local, remote).rows).toEqual([
      { key: 'k1', value: 'local' },
    ]);
  });

  it('AVISO: las marcas de tiempo se comparan como texto — escríbelas siempre en UTC (toISOString)', () => {
    // 12:00+02:00 son las 10:00Z, o sea que el servidor (11:00Z) es MÁS nuevo…
    const local = { n: { value: 'local', updatedAt: '2026-02-01T12:00:00+02:00' } };
    const remote = { n: { value: 'remoto', updatedAt: '2026-02-01T11:00:00Z' } };

    // …pero como texto gana el local. Por eso toda la app escribe en UTC.
    expect(syncFromRemote(local, remote).n.value).toBe('local');
  });

  it('un undefined del servidor no borra lo que hay en el dispositivo', () => {
    const local = { comments: 'lo que escribí yo' };
    const remote = { comments: undefined } as never;

    expect(syncFromRemote(local, remote).comments).toBe('lo que escribí yo');
  });
});
