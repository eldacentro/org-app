import { describe, expect, it } from 'vitest';
import { buildAPEnrollmentPeriods } from './ap_enrollment';

describe('buildAPEnrollmentPeriods', () => {
  it('un solo mes cubre ese mes entero', () => {
    expect(buildAPEnrollmentPeriods(['2026/08'])).toEqual([
      { start_date: '2026/08/01', end_date: '2026/08/31' },
    ]);
  });

  it('cierra en el día 30 cuando el mes tiene 30', () => {
    expect(buildAPEnrollmentPeriods(['2026/09'])).toEqual([
      { start_date: '2026/09/01', end_date: '2026/09/30' },
    ]);
  });

  it('febrero de año bisiesto cierra el 29', () => {
    expect(buildAPEnrollmentPeriods(['2028/02'])).toEqual([
      { start_date: '2028/02/01', end_date: '2028/02/29' },
    ]);
  });

  it('febrero de año normal cierra el 28', () => {
    expect(buildAPEnrollmentPeriods(['2026/02'])).toEqual([
      { start_date: '2026/02/01', end_date: '2026/02/28' },
    ]);
  });

  it('meses consecutivos se agrupan en un solo periodo', () => {
    expect(buildAPEnrollmentPeriods(['2026/09', '2026/10', '2026/11'])).toEqual(
      [{ start_date: '2026/09/01', end_date: '2026/11/30' }]
    );
  });

  it('agrupa a través del cambio de año', () => {
    expect(buildAPEnrollmentPeriods(['2026/12', '2027/01'])).toEqual([
      { start_date: '2026/12/01', end_date: '2027/01/31' },
    ]);
  });

  it('meses sueltos dan periodos separados', () => {
    expect(buildAPEnrollmentPeriods(['2026/08', '2026/11'])).toEqual([
      { start_date: '2026/08/01', end_date: '2026/08/31' },
      { start_date: '2026/11/01', end_date: '2026/11/30' },
    ]);
  });

  it('no depende del orden en que lleguen los meses', () => {
    expect(buildAPEnrollmentPeriods(['2026/11', '2026/09', '2026/10'])).toEqual(
      [{ start_date: '2026/09/01', end_date: '2026/11/30' }]
    );
  });

  it('descarta duplicados en vez de partir el periodo', () => {
    expect(buildAPEnrollmentPeriods(['2026/09', '2026/09', '2026/10'])).toEqual(
      [{ start_date: '2026/09/01', end_date: '2026/10/31' }]
    );
  });

  it('sin meses no hay inscripción que crear', () => {
    expect(buildAPEnrollmentPeriods([])).toEqual([]);
    expect(buildAPEnrollmentPeriods(undefined)).toEqual([]);
  });
});
