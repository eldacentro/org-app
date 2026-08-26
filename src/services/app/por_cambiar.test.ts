import { describe, expect, it } from 'vitest';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';
import { partesPorCambiar } from './por_cambiar';

/**
 * La lista de partes que hay que cambiar.
 *
 * Lo que se comprueba es que no se cuele ni se pierda ninguna: una que se
 * pierde no se arregla, y una que sobra manda a alguien a rehacer algo que ya
 * estaba hecho.
 */

const semana = (
  weekOf: string,
  partes: Record<string, Partial<AssignmentCongregation>>
): SchedWeekType => ({ weekOf, partes }) as unknown as SchedWeekType;

const PARTES = ['MM_TGWTalk', 'MM_Bible_Reading'] as AssignmentFieldType[];

const asignaciones = () => PARTES;

const leer = (
  schedule: SchedWeekType,
  assignment: AssignmentFieldType
): AssignmentCongregation | undefined =>
  (schedule as unknown as { partes: Record<string, AssignmentCongregation> })
    .partes[assignment as unknown as string];

const sacar = (schedules: SchedWeekType[], fromWeek = '2026/01/01') =>
  partesPorCambiar({
    schedules,
    dataView: 'main',
    fromWeek,
    assignmentsForWeek: asignaciones,
    getAssignment: leer,
  });

describe('partesPorCambiar', () => {
  it('saca solo lo marcado', () => {
    const s = [
      semana('2026/09/07', {
        MM_TGWTalk: { value: 'uid-1', name: 'Fulano', toReplace: true },
        MM_Bible_Reading: { value: 'uid-2', name: 'Mengano' },
      }),
    ];

    expect(sacar(s)).toEqual([
      {
        weekOf: '2026/09/07',
        assignment: 'MM_TGWTalk',
        person: 'uid-1',
        name: 'Fulano',
        by: undefined,
        at: undefined,
      },
    ]);
  });

  it('trae quién la marcó y cuándo', () => {
    const s = [
      semana('2026/09/07', {
        MM_TGWTalk: {
          value: 'uid-1',
          name: 'Fulano',
          toReplace: true,
          toReplaceBy: 'Carlos',
          toReplaceAt: '2026-08-25T10:00:00.000Z',
        },
      }),
    ];

    expect(sacar(s)[0]).toMatchObject({
      by: 'Carlos',
      at: '2026-08-25T10:00:00.000Z',
    });
  });

  it('ordena por semana aunque lleguen desordenadas', () => {
    const s = [
      semana('2026/10/05', {
        MM_TGWTalk: { value: 'uid-2', name: 'B', toReplace: true },
      }),
      semana('2026/09/07', {
        MM_TGWTalk: { value: 'uid-1', name: 'A', toReplace: true },
      }),
    ];

    expect(sacar(s).map((p) => p.weekOf)).toEqual([
      '2026/09/07',
      '2026/10/05',
    ]);
  });

  it('no mira hacia atrás: lo de hace tres meses ya no se arregla', () => {
    const s = [
      semana('2026/05/04', {
        MM_TGWTalk: { value: 'uid-1', name: 'A', toReplace: true },
      }),
      semana('2026/09/07', {
        MM_TGWTalk: { value: 'uid-2', name: 'B', toReplace: true },
      }),
    ];

    expect(sacar(s, '2026/08/31').map((p) => p.name)).toEqual(['B']);
  });

  it('la propia semana de corte SÍ cuenta', () => {
    // La reunión de esta semana todavía no ha pasado: es justo la más urgente.
    const s = [
      semana('2026/08/31', {
        MM_TGWTalk: { value: 'uid-1', name: 'A', toReplace: true },
      }),
    ];

    expect(sacar(s, '2026/08/31')).toHaveLength(1);
  });

  it('una parte marcada pero ya vacía no se pide dos veces', () => {
    // Si alguien la vació a mano sin quitar la marca, ya está arreglada: el
    // hueco se ve solo en el programa.
    const s = [
      semana('2026/09/07', {
        MM_TGWTalk: { value: '', name: '', toReplace: true },
      }),
    ];

    expect(sacar(s)).toEqual([]);
  });

  it('aguanta una semana sin esa parte', () => {
    const s = [semana('2026/09/07', {})];

    expect(() => sacar(s)).not.toThrow();
    expect(sacar(s)).toEqual([]);
  });

  it('sin programas no revienta', () => {
    expect(sacar([])).toEqual([]);
    expect(sacar(undefined as unknown as SchedWeekType[])).toEqual([]);
  });
});
