import { describe, expect, it } from 'vitest';
import type { PersonType } from '@definition/person';
import {
  addAPEnrollments,
  apEnrollmentHours,
  buildAPEnrollmentPeriods,
  removeAPEnrollments,
  setAPEnrollmentHours,
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

describe('las horas del mes de un precursor auxiliar', () => {
  const OCTUBRE = buildAPEnrollmentPeriods(['2026/10']);

  it('las 15 se escriben en la inscripción que crea la aprobación', () => {
    const resultado = addAPEnrollments(persona(), OCTUBRE, 15);

    expect(resultado.person_data.enrollments[0].hours).toBe(15);
  });

  it('las 30 se escriben explícitas, nunca borrando el campo', () => {
    const resultado = addAPEnrollments(persona(), OCTUBRE, 30);

    expect(resultado.person_data.enrollments[0].hours).toBe(30);
  });

  it('cambiar 15 a 30 después de aprobar llega a la inscripción', () => {
    const antes = persona([
      inscripcion('e1', '2026/10/01', '2026/10/31', { hours: 15 }),
    ]);

    const resultado = addAPEnrollments(antes, OCTUBRE, 30);

    expect(resultado).not.toBe(antes);
    // Un 30 explícito, no el campo borrado: la fusión copia lo que hay pero no
    // quita lo que falta, y el 15 reviviría en los demás dispositivos.
    expect(resultado.person_data.enrollments[0].hours).toBe(30);
    expect(resultado.person_data.enrollments).toHaveLength(1);
  });

  it('una inscripción sin el campo NO se reescribe para poner 30', () => {
    const antes = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);

    expect(setAPEnrollmentHours(antes, OCTUBRE, 30)).toBe(antes);
  });

  it('sin cambios devuelve la misma persona', () => {
    const antes = persona([
      inscripcion('e1', '2026/10/01', '2026/10/31', { hours: 15 }),
    ]);

    expect(addAPEnrollments(antes, OCTUBRE, 15)).toBe(antes);
  });

  it('el repaso corrige lo que hay pero NUNCA crea una inscripción', () => {
    const sinNada = persona();

    expect(setAPEnrollmentHours(sinNada, OCTUBRE, 15)).toBe(sinNada);

    const conUna = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);
    const repasada = setAPEnrollmentHours(conUna, OCTUBRE, 15);

    expect(repasada.person_data.enrollments).toHaveLength(1);
    expect(repasada.person_data.enrollments[0].hours).toBe(15);
  });

  it('una inscripción borrada no revive ni se le tocan las horas', () => {
    const conLapida = persona([
      inscripcion('e1', '2026/10/01', '2026/10/31', { _deleted: true }),
    ]);

    expect(setAPEnrollmentHours(conLapida, OCTUBRE, 15)).toBe(conLapida);
  });

  describe('lo que lee el informe', () => {
    it('15 solo si la inscripción de ese mes lo dice', () => {
      const p = persona([
        inscripcion('e1', '2026/10/01', '2026/10/31', { hours: 15 }),
      ]);

      expect(apEnrollmentHours(p, '2026/10')).toBe(15);
    });

    it('30 cuando la inscripción no dice nada', () => {
      const p = persona([inscripcion('e1', '2026/10/01', '2026/10/31')]);

      expect(apEnrollmentHours(p, '2026/10')).toBe(30);
    });

    it('el precursorado auxiliar CONTINUO es siempre de 30', () => {
      const p = persona([
        inscripcion('e1', '2026/09/01', null as unknown as string),
      ]);

      expect(apEnrollmentHours(p, '2026/10')).toBe(30);
      expect(apEnrollmentHours(p, '2027/03')).toBe(30);
    });

    it('un mes que la inscripción no cubre no tiene meta', () => {
      const p = persona([
        inscripcion('e1', '2026/10/01', '2026/10/31', { hours: 15 }),
      ]);

      expect(apEnrollmentHours(p, '2026/11')).toBeUndefined();
      expect(apEnrollmentHours(p, '2026/09')).toBeUndefined();
    });

    it('con dos vigentes a la vez mandan las 30', () => {
      const p = persona([
        inscripcion('e1', '2026/10/01', '2026/10/31', { hours: 15 }),
        inscripcion('e2', '2026/09/01', null as unknown as string),
      ]);

      expect(apEnrollmentHours(p, '2026/10')).toBe(30);
    });
  });
});
