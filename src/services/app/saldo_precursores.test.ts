import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PersonType } from '@definition/person';
import type { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { mesesDelAñoDeServicio, saldoDePrecursores } from './saldo_precursores';

/**
 * Saldo de precursores (Registros de publicadores).
 *
 * El fallo que esto fija: el saldo se calculaba siempre con el año de servicio
 * EN CURSO. Desde el 1 de septiembre de 2026 eso es 2027, que no tenía
 * informes, y elegir 2026 en las pestañas no cambiaba nada.
 */

const persona = (uid: string) => ({ person_uid: uid }) as unknown as PersonType;

const informe = (
  uid: string,
  mes: string,
  horas: number,
  credito = 0,
  borrado = false
) =>
  ({
    report_id: `${uid}-${mes}`,
    report_data: {
      _deleted: borrado,
      updatedAt: '',
      report_date: mes,
      person_uid: uid,
      shared_ministry: true,
      hours: { field_service: horas, credit: { value: credito, approved: 0 } },
    },
  }) as unknown as CongFieldServiceReportType;

/** Precursor regular entre dos meses, ambos incluidos ('' = sigue). */
const precursorEntre =
  (tramos: Record<string, [string, string]>) =>
  (person: PersonType, mes: string) => {
    const tramo = tramos[person.person_uid];

    if (!tramo) return false;

    const [desde, hasta] = tramo;

    return mes >= desde && (hasta === '' || mes <= hasta);
  };

const nombre = (person: PersonType) => person.person_uid;

afterEach(() => {
  vi.useRealTimers();
});

describe('los meses de un año de servicio', () => {
  it('«2026» va de septiembre de 2025 a agosto de 2026', () => {
    const meses = mesesDelAñoDeServicio('2026');

    expect(meses).toHaveLength(12);
    expect(meses[0]).toBe('2025/09');
    expect(meses[3]).toBe('2025/12');
    expect(meses[4]).toBe('2026/01');
    expect(meses[11]).toBe('2026/08');
  });

  it('un año que no es un año no da meses', () => {
    expect(mesesDelAñoDeServicio('')).toEqual([]);
    expect(mesesDelAñoDeServicio('abc')).toEqual([]);
  });
});

describe('el año lo decide quien mira, no la fecha de hoy', () => {
  it('en septiembre de 2026 se puede analizar 2026 entero', () => {
    // Hoy ya es el año 2027, que todavía no tiene ningún informe.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T10:00:00Z'));

    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [informe('ana', '2025/09', 55), informe('ana', '2026/08', 48)],
      year: '2026',
      estabaDePrecursor: precursorEntre({ ana: ['2020/01', ''] }),
      nombre,
    });

    expect(saldo).toEqual([
      {
        person_uid: 'ana',
        name: 'ana',
        horas: 103,
        credito: 0,
        total: 103,
        balance: 3,
      },
    ]);
  });

  it('y 2027, recién empezado, sale a cero sin inventarse nada', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [informe('ana', '2026/08', 48)],
      year: '2027',
      estabaDePrecursor: precursorEntre({ ana: ['2020/01', ''] }),
      nombre,
    });

    expect(saldo).toEqual([
      {
        person_uid: 'ana',
        name: 'ana',
        horas: 0,
        credito: 0,
        total: 0,
        balance: 0,
      },
    ]);
  });
});

describe('quién sale en el saldo', () => {
  it('quien era precursor de antes y lo dejó durante el año SÍ sale', () => {
    // Precursor desde 2019, lo deja en febrero de 2026. La comprobación «por
    // año» de la app lo dejaba fuera de 2026 entero.
    const saldo = saldoDePrecursores({
      persons: [persona('luis')],
      reports: [
        informe('luis', '2025/10', 40),
        informe('luis', '2026/02', 50),
        // Ya no es precursor: estas horas no cuentan contra la meta.
        informe('luis', '2026/05', 10),
      ],
      year: '2026',
      estabaDePrecursor: precursorEntre({ luis: ['2019/09', '2026/02'] }),
      nombre,
    });

    expect(saldo).toEqual([
      {
        person_uid: 'luis',
        name: 'luis',
        horas: 90,
        credito: 0,
        total: 90,
        balance: -10,
      },
    ]);
  });

  it('quien empezó a mitad de año cuenta desde que empezó', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('eva')],
      reports: [informe('eva', '2025/11', 5), informe('eva', '2026/03', 60)],
      year: '2026',
      estabaDePrecursor: precursorEntre({ eva: ['2026/03', ''] }),
      nombre,
    });

    expect(saldo).toEqual([
      {
        person_uid: 'eva',
        name: 'eva',
        horas: 60,
        credito: 0,
        total: 60,
        balance: 10,
      },
    ]);
  });

  it('quien no fue precursor ningún mes no sale', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('pedro')],
      reports: [informe('pedro', '2026/01', 70)],
      year: '2026',
      estabaDePrecursor: () => false,
      nombre,
    });

    expect(saldo).toEqual([]);
  });
});

describe('qué horas cuentan', () => {
  const siempre = precursorEntre({ ana: ['2000/01', ''] });

  it('los informes de fuera del año no cuentan', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [
        informe('ana', '2025/08', 10),
        informe('ana', '2026/09', 10),
        informe('ana', '2026/01', 52),
      ],
      year: '2026',
      estabaDePrecursor: siempre,
      nombre,
    });

    expect(saldo[0].balance).toBe(2);
  });

  it('un informe borrado no cuenta', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [
        informe('ana', '2026/01', 52),
        informe('ana', '2026/02', 10, 0, true),
      ],
      year: '2026',
      estabaDePrecursor: siempre,
      nombre,
    });

    expect(saldo[0].balance).toBe(2);
  });

  it('el crédito lleva el tope del mes: con 60 de predicación no suma', () => {
    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [informe('ana', '2026/01', 60, 8)],
      year: '2026',
      estabaDePrecursor: siempre,
      nombre,
    });

    expect(saldo[0].balance).toBe(10);
    // Y las columnas lo dicen tal cual: 60 de predicación, 0 de crédito
    // contado, 60 en total. Lo apuntado (8) no aparece porque no contó.
    expect(saldo[0]).toMatchObject({ horas: 60, credito: 0, total: 60 });
  });

  it('predicación y crédito se ven aparte, y la suma cuadra con el total', () => {
    // 40 + 20 → cuentan 15 de crédito (hasta 55); 30 + 10 → cuentan los 10.
    const saldo = saldoDePrecursores({
      persons: [persona('ana')],
      reports: [
        informe('ana', '2026/01', 40, 20),
        informe('ana', '2026/02', 30, 10),
      ],
      year: '2026',
      estabaDePrecursor: siempre,
      nombre,
    });

    expect(saldo[0]).toMatchObject({
      horas: 70,
      credito: 25,
      total: 95,
      balance: -5,
    });
    expect(saldo[0].horas + saldo[0].credito).toBe(saldo[0].total);
  });
});

it('los que van por debajo de la meta salen primero', () => {
  const todos = precursorEntre({
    ana: ['2000/01', ''],
    luis: ['2000/01', ''],
    eva: ['2000/01', ''],
  });

  const saldo = saldoDePrecursores({
    persons: [persona('ana'), persona('luis'), persona('eva')],
    reports: [
      informe('ana', '2026/01', 55),
      informe('luis', '2026/01', 30),
      informe('eva', '2026/01', 50),
    ],
    year: '2026',
    estabaDePrecursor: todos,
    nombre,
  });

  expect(saldo.map((s) => s.person_uid)).toEqual(['luis', 'eva', 'ana']);
});
