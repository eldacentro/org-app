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
