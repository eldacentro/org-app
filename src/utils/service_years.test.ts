import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@services/i18n/translation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTranslation: ({ params }: { params?: { month?: string; year?: string } }) =>
    `${params?.month} ${params?.year}`,
}));

const { buildServiceYearsList } = await import('./date');

/**
 * Meses que se ofrecen para elegir en el informe.
 *
 * El año de servicio va del 1 de septiembre al 31 de agosto. Ofrecer un mes
 * que aún no ha ocurrido no rompe nada, pero deja mirando un informe que no
 * existe y preguntándose si falta algo.
 */

const at = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

afterEach(() => vi.useRealTimers());

const currentMonths = () => {
  const list = buildServiceYearsList(2);
  return list.at(-1).months.map((m) => m.value);
};

describe('no se ofrecen meses del futuro', () => {
  it('en julio, el último mes elegible es julio (no agosto)', () => {
    at('2026-07-15T12:00:00Z');
    const months = currentMonths();

    expect(months.at(-1)).toBe('2026/07');
    expect(months).not.toContain('2026/08');
  });

  it('en septiembre solo se ofrece septiembre: el año acaba de empezar', () => {
    at('2026-09-10T12:00:00Z');

    expect(currentMonths()).toEqual(['2026/09']);
  });

  it('en octubre, septiembre y octubre', () => {
    at('2026-10-05T12:00:00Z');

    expect(currentMonths()).toEqual(['2026/09', '2026/10']);
  });

  it('en enero se ofrecen los cinco meses transcurridos', () => {
    at('2027-01-20T12:00:00Z');

    expect(currentMonths()).toEqual([
      '2026/09',
      '2026/10',
      '2026/11',
      '2026/12',
      '2027/01',
    ]);
  });

  it('en agosto se ofrece el año de servicio entero', () => {
    at('2026-08-31T12:00:00Z');

    expect(currentMonths()).toHaveLength(12);
    expect(currentMonths().at(-1)).toBe('2026/08');
  });
});

describe('cuántos años se ofrecen', () => {
  it('al publicador, dos: el año en curso y el anterior', () => {
    at('2026-07-15T12:00:00Z');

    expect(buildServiceYearsList(2)).toHaveLength(2);
  });

  it('al secretario, los que pida', () => {
    at('2026-07-15T12:00:00Z');

    expect(buildServiceYearsList(4)).toHaveLength(4);
  });
});

const { lastDayOfReportMonth } = await import('./date');

/**
 * Fecha con la que se cierra el periodo de publicador al dar de baja a alguien
 * en el S-1. Equivocarse aquí por un día cambia de mes: el mismo informe que
 * declara a esa persona como publicador activo la borraría de ese mes justo
 * después de enviarlo.
 */
describe('cierre del periodo al causar baja', () => {
  const monthOf = (iso: string) => iso.slice(0, 7);

  it('junio se cierra el 30 de junio, no el 31 de mayo', () => {
    expect(monthOf(lastDayOfReportMonth('2026/06'))).toBe('2026-06');
    expect(new Date(lastDayOfReportMonth('2026/06')).getDate()).toBe(30);
  });

  it('enero se cierra el 31 de enero (y no salta al año anterior)', () => {
    expect(monthOf(lastDayOfReportMonth('2026/01'))).toBe('2026-01');
    expect(new Date(lastDayOfReportMonth('2026/01')).getDate()).toBe(31);
  });

  it('diciembre se cierra el 31 de diciembre', () => {
    expect(monthOf(lastDayOfReportMonth('2026/12'))).toBe('2026-12');
    expect(new Date(lastDayOfReportMonth('2026/12')).getDate()).toBe(31);
  });

  it('febrero de un año bisiesto se cierra el 29', () => {
    expect(new Date(lastDayOfReportMonth('2028/02')).getDate()).toBe(29);
  });

  it('febrero de un año normal se cierra el 28', () => {
    expect(new Date(lastDayOfReportMonth('2026/02')).getDate()).toBe(28);
  });
});
