import { describe, expect, it } from 'vitest';
import { SchedWeekType } from '@definition/schedules';
import { mergeOutgoingTalks } from './outgoingTalksMerge';

/**
 * Los discursos salientes que manda el servidor, fusionados con lo que hay en
 * el dispositivo. Van dentro de la semana, no en su propia tabla, así que un
 * fallo aquí no se ve como "falta un discurso": se ve como una semana que se
 * reescribe sola, o como una asignación que aparece y desaparece.
 *
 * Cada `it` está escrito como una frase en cristiano: si alguna falla, el texto
 * ya dice qué se ha roto sin tener que leer el código.
 */

const talk = (
  id: string,
  updatedAt: string,
  extra: Record<string, unknown> = {}
) => ({ id, updatedAt, synced: true, ...extra });

const week = (weekOf: string, outgoing_talks: unknown[]) =>
  ({
    weekOf,
    weekend_meeting: { outgoing_talks },
  }) as unknown as SchedWeekType;

const incoming = (id: string, weekOf: string, updatedAt: string, extra = {}) =>
  ({
    id,
    weekOf,
    updatedAt,
    synced: true,
    recipient: 'cong-a',
    sender: 'cong-b',
    ...extra,
  }) as never;

describe('discursos salientes que llegan del servidor', () => {
  it('un discurso nuevo se añade a su semana', () => {
    const schedules = [week('2026-01-05', [])];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].weekend_meeting.outgoing_talks).toHaveLength(1);
    expect(result[0].weekend_meeting.outgoing_talks[0].id).toBe('t1');
  });

  it('lo que se guarda no lleva ni remitente ni destinatario ni la semana', () => {
    const schedules = [week('2026-01-05', [])];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
    ]);

    const saved = result[0].weekend_meeting.outgoing_talks[0];

    expect('recipient' in saved).toBe(false);
    expect('sender' in saved).toBe(false);
    expect('weekOf' in saved).toBe(false);
  });

  it('no toca el objeto que ha llegado del servidor', () => {
    const schedules = [week('2026-01-05', [])];
    const entrante = incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z');

    mergeOutgoingTalks(schedules, [entrante]);

    // Si se le vaciaran los campos, quien llama se quedaría sin saber de qué
    // semana era cada discurso.
    expect(entrante['weekOf']).toBe('2026-01-05');
    expect(entrante['recipient']).toBe('cong-a');
  });

  it('un discurso sincronizado que el servidor ya no manda se quita', () => {
    const schedules = [
      week('2026-01-05', [talk('t1', '2026-01-01T00:00:00Z')]),
    ];

    const result = mergeOutgoingTalks(schedules, []);

    expect(result).toHaveLength(1);
    expect(result[0].weekend_meeting.outgoing_talks).toHaveLength(0);
  });

  it('un discurso puesto A MANO no se quita nunca', () => {
    const manual = { id: 'm1', updatedAt: '2026-01-01T00:00:00Z' };
    const schedules = [
      week('2026-01-05', [manual, talk('t1', '2026-01-01T00:00:00Z')]),
    ];

    const result = mergeOutgoingTalks(schedules, []);

    expect(result[0].weekend_meeting.outgoing_talks).toEqual([manual]);
  });

  it('lo más nuevo del servidor gana; un empate se queda como está', () => {
    const stamp = '2026-01-10T00:00:00Z';
    const schedules = [
      week('2026-01-05', [talk('t1', stamp, { nota: 'local' })]),
    ];

    const masNuevo = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-11T00:00:00Z', { nota: 'remoto' }),
    ]);
    expect(masNuevo[0].weekend_meeting.outgoing_talks[0]['nota']).toBe('remoto');

    const empate = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', stamp, { nota: 'remoto' }),
    ]);
    expect(empate).toHaveLength(0);
  });

  it('si no cambia nada, no se escribe ninguna semana', () => {
    const schedules = [
      week('2026-01-05', [talk('t1', '2026-01-01T00:00:00Z')]),
    ];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
    ]);

    expect(result).toEqual([]);
  });

  it('un borrado y un añadido en la MISMA semana conviven', () => {
    // El fallo que arregla: el borrado se hacía sobre la copia en memoria y el
    // añadido sobre una lectura nueva de la base, así que al guardar ganaba la
    // segunda y el discurso borrado volvía a aparecer.
    const schedules = [
      week('2026-01-05', [
        talk('viejo', '2026-01-01T00:00:00Z'),
        talk('sigue', '2026-01-01T00:00:00Z'),
      ]),
    ];

    const result = mergeOutgoingTalks(schedules, [
      incoming('sigue', '2026-01-05', '2026-01-01T00:00:00Z'),
      incoming('nuevo', '2026-01-05', '2026-01-02T00:00:00Z'),
    ]);

    const ids = result[0].weekend_meeting.outgoing_talks.map((r) => r.id);

    expect(ids).toContain('sigue');
    expect(ids).toContain('nuevo');
    expect(ids).not.toContain('viejo');
  });

  it('dos discursos nuevos en la misma semana entran LOS DOS', () => {
    // El otro fallo: cada discurso se aplicaba sobre su propio clon de la
    // semana, así que al guardar solo sobrevivía el último.
    const schedules = [week('2026-01-05', [])];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
      incoming('t2', '2026-01-05', '2026-01-01T00:00:00Z'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].weekend_meeting.outgoing_talks.map((r) => r.id)).toEqual([
      't1',
      't2',
    ]);
  });

  it('un discurso de una semana que no existe en el dispositivo se ignora', () => {
    const schedules = [week('2026-01-05', [])];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-12-28', '2026-01-01T00:00:00Z'),
    ]);

    expect(result).toEqual([]);
  });

  it('una semana legada sin weekend_meeting no revienta la fusión', () => {
    const schedules = [
      { weekOf: '2026-01-05' } as SchedWeekType,
      week('2026-01-12', []),
    ];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
      incoming('t2', '2026-01-12', '2026-01-01T00:00:00Z'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].weekOf).toBe('2026-01-12');
  });

  it('una semana con la lista sin crear todavía la crea', () => {
    const schedules = [
      { weekOf: '2026-01-05', weekend_meeting: {} } as SchedWeekType,
    ];

    const result = mergeOutgoingTalks(schedules, [
      incoming('t1', '2026-01-05', '2026-01-01T00:00:00Z'),
    ]);

    expect(result[0].weekend_meeting.outgoing_talks.map((r) => r.id)).toEqual([
      't1',
    ]);
  });

  it('si el servidor no manda nada aprovechable, no se escribe nada', () => {
    const schedules = [
      week('2026-01-05', [talk('t1', '2026-01-01T00:00:00Z')]),
    ];

    expect(mergeOutgoingTalks(schedules, undefined as never)).toEqual([]);
  });
});
