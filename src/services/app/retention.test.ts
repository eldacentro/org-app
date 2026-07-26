import { describe, expect, it } from 'vitest';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import {
  computeRetentionPlan,
  retentionWindowStart,
  serviceYearStartOf,
} from './retention';

/**
 * Norma de conservación de registros.
 *
 * Esto lo revisa el responsable de la congregación, y equivocarse tiene las
 * dos caras malas: borrar de más (informes que había que guardar) o borrar de
 * menos (guardar lo que la norma dice que no se guarde). Además el borrado se
 * propaga por sincronización a TODOS los dispositivos, así que no hay vuelta
 * atrás. De ahí que esté cubierto caso a caso.
 *
 * El año de servicio va del 1 de septiembre al 31 de agosto.
 */

const stamp = '2026-01-01T00:00:00Z';

const buildPerson = (
  uid: string,
  overrides: Partial<PersonType['person_data']> = {}
): PersonType =>
  ({
    person_uid: uid,
    _deleted: { value: false, updatedAt: stamp },
    person_data: {
      person_firstname: { value: 'Nombre', updatedAt: stamp },
      person_lastname: { value: uid, updatedAt: stamp },
      publisher_baptized: { active: { value: false, updatedAt: stamp }, history: [] },
      publisher_unbaptized: { active: { value: false, updatedAt: stamp }, history: [] },
      enrollments: [],
      ...overrides,
    },
  }) as unknown as PersonType;

const openHistory = () => [
  { id: 'h1', _deleted: false, start_date: '2020-01-01', end_date: null },
];

const closedHistory = (end: string) => [
  { id: 'h1', _deleted: false, start_date: '2020-01-01', end_date: end },
];

const buildReport = (uid: string, month: string): CongFieldServiceReportType =>
  ({
    report_id: `${uid}-${month}`,
    report_data: {
      _deleted: false,
      updatedAt: stamp,
      report_date: month,
      person_uid: uid,
    },
  }) as unknown as CongFieldServiceReportType;

// 15 de enero de 2026 → año de servicio en curso 2025/09–2026/08,
// anterior 2024/09–2025/08. Se conserva desde 2024/09.
const TODAY = new Date('2026-01-15T12:00:00Z');

describe('límites del año de servicio', () => {
  it('septiembre abre año de servicio nuevo', () => {
    expect(serviceYearStartOf('2025/09')).toBe('2025/09');
  });

  it('agosto todavía pertenece al año anterior', () => {
    expect(serviceYearStartOf('2025/08')).toBe('2024/09');
  });

  it('enero pertenece al año que empezó en septiembre', () => {
    expect(serviceYearStartOf('2026/01')).toBe('2025/09');
  });

  it('la ventana de los activos son dos años de servicio', () => {
    expect(retentionWindowStart(TODAY)).toBe('2024/09');
    // en octubre ya rueda sola
    expect(retentionWindowStart(new Date('2026-10-01T00:00:00Z'))).toBe('2025/09');
  });
});

describe('publicador ACTIVO', () => {
  it('conserva el año en curso y el anterior, y borra lo de más atrás', () => {
    const person = buildPerson('activo', {
      publisher_baptized: { active: { value: true, updatedAt: stamp }, history: openHistory() },
    } as never);

    const reports = [
      buildReport('activo', '2023/05'), // fuera
      buildReport('activo', '2024/08'), // fuera por un mes
      buildReport('activo', '2024/09'), // primer mes conservado
      buildReport('activo', '2025/12'),
      buildReport('activo', '2026/01'),
    ];

    const plan = computeRetentionPlan([person], reports, [], TODAY);
    const borrados = plan.reportsToDelete.map((r) => r.report.report_data.report_date);

    expect(borrados).toEqual(['2023/05', '2024/08']);
  });
});

describe('publicador BAUTIZADO que quedó inactivo', () => {
  it('conserva SOLO el año de servicio de su último informe', () => {
    // Requisito explícito del usuario: al inactivo se le guarda el año en que
    // se quedó inactivo, aunque sea más antiguo que la ventana de los activos.
    const person = buildPerson('inactivo', {
      publisher_baptized: {
        active: { value: false, updatedAt: stamp },
        history: closedHistory('2023-06-30'),
        baptism_date: { value: '2010-05-01', updatedAt: stamp },
      },
    } as never);

    const reports = [
      buildReport('inactivo', '2021/10'), // año anterior al de su baja → fuera
      buildReport('inactivo', '2022/09'), // su último año de servicio → se queda
      buildReport('inactivo', '2023/05'), // mismo año de servicio → se queda
    ];

    const plan = computeRetentionPlan([person], reports, [], TODAY);
    const borrados = plan.reportsToDelete.map((r) => r.report.report_data.report_date);

    expect(borrados).toEqual(['2021/10']);
  });

  it('no se le aplica la ventana de los activos (no se le borra su año)', () => {
    const person = buildPerson('inactivo', {
      publisher_baptized: {
        active: { value: false, updatedAt: stamp },
        history: closedHistory('2023-06-30'),
      },
    } as never);

    const plan = computeRetentionPlan(
      [person],
      [buildReport('inactivo', '2023/05')],
      [],
      TODAY
    );

    expect(plan.reportsToDelete).toHaveLength(0);
  });
});

describe('casos en los que no se conserva nada', () => {
  it('persona SACADA: se borra todo', () => {
    const person = buildPerson('sacado', {
      disqualified: { value: true, updatedAt: stamp },
      publisher_baptized: { active: { value: true, updatedAt: stamp }, history: openHistory() },
    } as never);

    const plan = computeRetentionPlan(
      [person],
      [buildReport('sacado', '2026/01'), buildReport('sacado', '2025/10')],
      [],
      TODAY
    );

    expect(plan.reportsToDelete).toHaveLength(2);
  });

  it('NO bautizado que dejó de publicar: se borra todo', () => {
    const person = buildPerson('nobautizado', {
      publisher_unbaptized: {
        active: { value: false, updatedAt: stamp },
        history: closedHistory('2025-06-30'),
      },
    } as never);

    const plan = computeRetentionPlan(
      [person],
      [buildReport('nobautizado', '2025/05')],
      [],
      TODAY
    );

    expect(plan.reportsToDelete).toHaveLength(1);
  });
});

describe('salvaguardas: en la duda, no se toca nada', () => {
  it('sin personas cargadas no se borra nada (dispositivo a medio sincronizar)', () => {
    const plan = computeRetentionPlan([], [buildReport('x', '2020/01')], [], TODAY);

    expect(plan.reportsToDelete).toHaveLength(0);
  });

  it('sin informes cargados no se borra nada', () => {
    const person = buildPerson('activo');
    const plan = computeRetentionPlan([person], [], [], TODAY);

    expect(plan.reportsToDelete).toHaveLength(0);
    expect(plan.attendanceToDelete).toHaveLength(0);
  });

  it('informes de alguien que este dispositivo no tiene: no se decide sobre ellos', () => {
    const person = buildPerson('conocido', {
      publisher_baptized: { active: { value: true, updatedAt: stamp }, history: openHistory() },
    } as never);

    const plan = computeRetentionPlan(
      [person],
      [buildReport('conocido', '2026/01'), buildReport('desconocido', '2019/01')],
      [],
      TODAY
    );

    expect(plan.reportsToDelete).toHaveLength(0);
  });
});

describe('nombramientos (precursorados)', () => {
  const activePerson = () =>
    buildPerson('activo', {
      publisher_baptized: { active: { value: true, updatedAt: stamp }, history: openHistory() },
      enrollments: [
        { id: 'e-viejo', _deleted: false, start_date: '2022-09-01', end_date: '2023-08-31' },
        { id: 'e-reciente', _deleted: false, start_date: '2025-09-01', end_date: '2025-11-30' },
        { id: 'e-abierto', _deleted: false, start_date: '2026-01-01', end_date: null },
      ],
    } as never);

  it('borra los cerrados fuera de la ventana y respeta los recientes', () => {
    const plan = computeRetentionPlan(
      [activePerson()],
      [buildReport('activo', '2026/01')],
      [],
      TODAY
    );

    expect(plan.enrollmentsToDelete.map((e) => e.enrollmentId)).toEqual(['e-viejo']);
  });

  it('un precursorado ABIERTO (de continuo) no se toca nunca', () => {
    const plan = computeRetentionPlan(
      [activePerson()],
      [buildReport('activo', '2026/01')],
      [],
      TODAY
    );

    expect(plan.enrollmentsToDelete.map((e) => e.enrollmentId)).not.toContain(
      'e-abierto'
    );
  });
});

describe('asistencia a las reuniones', () => {
  const attendance = (month: string) =>
    ({ month_date: month, _deleted: { value: false, updatedAt: stamp } }) as never;

  it('se conservan dos años de servicio, como los activos', () => {
    const person = buildPerson('activo', {
      publisher_baptized: { active: { value: true, updatedAt: stamp }, history: openHistory() },
    } as never);

    const plan = computeRetentionPlan(
      [person],
      [buildReport('activo', '2026/01')],
      [attendance('2024/08'), attendance('2024/09'), attendance('2026/01')],
      TODAY
    );

    expect(plan.attendanceToDelete.map((a) => a.month_date)).toEqual(['2024/08']);
  });
});
