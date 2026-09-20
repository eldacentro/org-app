import { describe, expect, it } from 'vitest';
import type { PersonType } from '@definition/person';
import {
  addAPEnrollments,
  buildAPEnrollmentPeriods,
  removeAPEnrollments,
} from './ap_enrollment';

const persona = (
  enrollments: PersonType['person_data']['enrollments'] = []
): PersonType =>
  ({
    person_uid: 'p1',
    person_data: { enrollments },
  }) as PersonType;

const inscripcion = (
  id: string,
  start_date: string,
  end_date: string,
  extra: Partial<PersonType['person_data']['enrollments'][number]> = {}
) => ({
  id,
  enrollment: 'AP' as const,
  _deleted: false,
  start_date,
  end_date,
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...extra,
});

describe('inscripciones de precursor auxiliar de una solicitud', () => {
  const OCTUBRE = buildAPEnrollmentPeriods(['2026/10']);

  it('añade la que falta', () => {
    const resultado = addAPEnrollments(persona(), OCTUBRE);

    expect(resultado.person_data.enrollments).toHaveLength(1);
    expect(resultado.person_data.enrollments[0]).toMatchObject({
      enrollment: 'AP',
      _deleted: false,
      start_date: '2026/10/01',
      end_date: '2026/10/31',
    });
  });

  it('no duplica la que ya está, y devuelve la misma persona', () => {
    const ficha = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);

    expect(addAPEnrollments(ficha, OCTUBRE)).toBe(ficha);
  });

  it('retira con lápida, sin sacarla de la lista', () => {
    const ficha = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);

    const resultado = removeAPEnrollments(ficha, OCTUBRE);

    expect(resultado.person_data.enrollments).toHaveLength(1);
    expect(resultado.person_data.enrollments[0]._deleted).toBe(true);
    expect(resultado.person_data.enrollments[0].updatedAt).not.toBe(
      '2026-09-01T10:00:00.000Z'
    );
  });

  it('no toca una inscripción de otras fechas ni de otro tipo', () => {
    const ficha = persona([
      inscripcion('e1', '2026/11/01', '2026/11/30'),
      inscripcion('e2', '2026/10/01', '2026/10/31', { enrollment: 'FR' }),
    ]);

    expect(removeAPEnrollments(ficha, OCTUBRE)).toBe(ficha);
  });

  it('no modifica la ficha que recibe', () => {
    const ficha = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);
    const copia = structuredClone(ficha);

    addAPEnrollments(ficha, buildAPEnrollmentPeriods(['2026/12']));
    removeAPEnrollments(ficha, OCTUBRE);

    expect(ficha).toEqual(copia);
  });

  it('meses seguidos son UNA inscripción, no dos', () => {
    const resultado = addAPEnrollments(
      persona(),
      buildAPEnrollmentPeriods(['2026/10', '2026/11'])
    );

    expect(resultado.person_data.enrollments).toHaveLength(1);
    expect(resultado.person_data.enrollments[0]).toMatchObject({
      start_date: '2026/10/01',
      end_date: '2026/11/30',
    });
  });
});
