import { describe, expect, it } from 'vitest';
import { pendingS89Slips } from './pending_s89';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';

/**
 * Contar hojitas pendientes.
 *
 * Se prueba porque contar de menos aquí es exactamente el fallo que la
 * función existe para evitar: una hojita sin entregar que nadie ve venir.
 */

// Programa de mentira: solo lo que la función mira de verdad.
const semana = (
  weekOf: string,
  asignaciones: Record<string, Partial<AssignmentCongregation>>
) => ({ weekOf, asignaciones }) as unknown as SchedWeekType;

const CON_HOJITA: AssignmentFieldType[] = [
  'MM_TGWBibleReading_A',
  'MM_AYFPart1_Student_A',
];

const llamar = (
  schedules: SchedWeekType[],
  fromWeek: string,
  assignmentsForWeek = () => CON_HOJITA
) =>
  pendingS89Slips({
    schedules,
    dataView: 'main',
    fromWeek,
    assignmentsForWeek,
    getAssignment: (schedule, assignment) =>
      (
        schedule as unknown as {
          asignaciones: Record<string, AssignmentCongregation>;
        }
      ).asignaciones[assignment],
  });

describe('hojitas que quedan por confirmar', () => {
  it('cuenta la que tiene persona y no está confirmada', () => {
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_TGWBibleReading_A: { value: 'ana' },
          MM_AYFPart1_Student_A: { value: 'luis', confirmed: true },
        }),
      ],
      '2026/08/03'
    );

    expect(result).toEqual([
      {
        weekOf: '2026/08/03',
        assignment: 'MM_TGWBibleReading_A',
        person: 'ana',
      },
    ]);
  });

  it('una parte SIN asignar no es una hojita pendiente', () => {
    // Es un hueco del programa, no algo que entregar. Si se contara, el número
    // dejaría de significar "esto lo tengo que hacer yo".
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_TGWBibleReading_A: { value: '' },
          MM_AYFPart1_Student_A: {},
        }),
      ],
      '2026/08/03'
    );

    expect(result).toHaveLength(0);
  });

  it('no mira hacia atrás: lo de una reunión que ya pasó no es tarea', () => {
    const result = llamar(
      [
        semana('2026/07/20', { MM_TGWBibleReading_A: { value: 'vieja' } }),
        semana('2026/08/03', { MM_TGWBibleReading_A: { value: 'ana' } }),
      ],
      '2026/07/27'
    );

    expect(result.map((r) => r.person)).toEqual(['ana']);
  });

  it('la semana en curso SÍ cuenta', () => {
    const result = llamar(
      [semana('2026/07/27', { MM_TGWBibleReading_A: { value: 'ana' } })],
      '2026/07/27'
    );

    expect(result).toHaveLength(1);
  });

  it('una semana sin reunión no aporta hojitas', () => {
    // Asamblea o congreso: `schedulesS89AssignmentsForWeek` devuelve lista
    // vacía, y aquí no puede colarse nada aunque el programa tenga restos de
    // asignaciones de antes de marcar la semana como especial.
    const result = llamar(
      [semana('2026/08/03', { MM_TGWBibleReading_A: { value: 'ana' } })],
      '2026/08/03',
      () => []
    );

    expect(result).toHaveLength(0);
  });

  it('las devuelve en orden de semana, de la más próxima a la más lejana', () => {
    const result = llamar(
      [
        semana('2026/09/07', { MM_TGWBibleReading_A: { value: 'c' } }),
        semana('2026/08/03', { MM_TGWBibleReading_A: { value: 'a' } }),
        semana('2026/08/17', { MM_TGWBibleReading_A: { value: 'b' } }),
      ],
      '2026/08/03'
    );

    expect(result.map((r) => r.person)).toEqual(['a', 'b', 'c']);
  });
});
