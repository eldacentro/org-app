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
  assignmentsForWeek = () => CON_HOJITA,
  incluirAyudantes = false
) =>
  pendingS89Slips({
    schedules,
    dataView: 'main',
    fromWeek,
    assignmentsForWeek,
    incluirAyudantes,
    getAssignment: (schedule, assignment) =>
      (
        schedule as unknown as {
          asignaciones: Record<string, AssignmentCongregation>;
        }
      ).asignaciones[assignment],
  });

describe('hojitas que quedan por repartir', () => {
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
        papel: 'estudiante',
        sent: false,
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
  it('una hojita ya mandada sigue en la lista, pero marcada', () => {
    // Es la mitad del asunto: mandada y confirmada son dos cosas. Si al
    // mandarla desapareciera de la lista, nadie sabría a quién le falta
    // contestar; si no se marcara, se volvería a mandar.
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_TGWBibleReading_A: { value: 'ana', sent: true },
          MM_AYFPart1_Student_A: { value: 'luis' },
        }),
      ],
      '2026/08/03'
    );

    expect(result.map((r) => [r.person, r.sent])).toEqual([
      ['ana', true],
      ['luis', false],
    ]);
  });

  it('confirmada sí se va de la lista, aunque nunca se marcara como mandada', () => {
    // El tic se puede poner a mano sin haber pasado por el envío —así se
    // repartía antes—, y eso tiene que seguir cerrando la fila.
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_TGWBibleReading_A: { value: 'ana', confirmed: true },
        }),
      ],
      '2026/08/03'
    );

    expect(result).toHaveLength(0);
  });

  it('sin el ajuste, el ayudante no aparece', () => {
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_AYFPart1_Student_A: { value: 'luis' },
          MM_AYFPart1_Assistant_A: { value: 'javi' },
        }),
      ],
      '2026/08/03',
      () => ['MM_AYFPart1_Student_A']
    );

    expect(result.map((r) => r.person)).toEqual(['luis']);
  });

  it('con el ajuste, el ayudante va detrás del estudiante al que ayuda', () => {
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_AYFPart1_Student_A: { value: 'luis' },
          MM_AYFPart1_Assistant_A: { value: 'javi' },
        }),
      ],
      '2026/08/03',
      () => ['MM_AYFPart1_Student_A'],
      true
    );

    expect(result).toEqual([
      {
        weekOf: '2026/08/03',
        assignment: 'MM_AYFPart1_Student_A',
        person: 'luis',
        papel: 'estudiante',
        sent: false,
      },
      {
        weekOf: '2026/08/03',
        assignment: 'MM_AYFPart1_Assistant_A',
        person: 'javi',
        papel: 'ayudante',
        sent: false,
        ayudaA: 'luis',
      },
    ]);
  });

  it('al ayudante le basta con que se le haya avisado', () => {
    // No confirma nada —la parte no es suya—, así que su fila se cierra al
    // mandarle el mensaje. Con la regla del estudiante se quedaría ahí para
    // siempre esperando un tic que nadie va a poder poner.
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_AYFPart1_Student_A: { value: 'luis' },
          MM_AYFPart1_Assistant_A: { value: 'javi', sent: true },
        }),
      ],
      '2026/08/03',
      () => ['MM_AYFPart1_Student_A'],
      true
    );

    expect(result.map((r) => r.person)).toEqual(['luis']);
  });

  it('el ayudante aparece aunque su estudiante ya haya confirmado', () => {
    // Son dos avisos independientes: que el estudiante haya contestado no
    // significa que al que le acompaña le haya llegado nada.
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_AYFPart1_Student_A: { value: 'luis', confirmed: true },
          MM_AYFPart1_Assistant_A: { value: 'javi' },
        }),
      ],
      '2026/08/03',
      () => ['MM_AYFPart1_Student_A'],
      true
    );

    expect(result.map((r) => [r.person, r.papel])).toEqual([
      ['javi', 'ayudante'],
    ]);
  });

  it('la lectura de la Biblia no tiene ayudante que avisar', () => {
    // Se hace solo. Derivar el campo a ciegas buscaría un
    // `MM_TGWBibleReading_Assistant_A` que no existe.
    const result = llamar(
      [semana('2026/08/03', { MM_TGWBibleReading_A: { value: 'ana' } })],
      '2026/08/03',
      () => ['MM_TGWBibleReading_A'],
      true
    );

    expect(result.map((r) => r.papel)).toEqual(['estudiante']);
  });

  it('una parte sin ayudante asignado no inventa una fila', () => {
    const result = llamar(
      [
        semana('2026/08/03', {
          MM_AYFPart1_Student_A: { value: 'luis' },
          MM_AYFPart1_Assistant_A: { value: '' },
        }),
      ],
      '2026/08/03',
      () => ['MM_AYFPart1_Student_A'],
      true
    );

    expect(result).toHaveLength(1);
  });
});
