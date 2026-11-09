import { describe, expect, it } from 'vitest';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { PersonType } from '@definition/person';
import {
  buildS1CategoryOf,
  collectS1Reports,
  editableAfterMonthSent,
  incomingReportLate,
  lateReportsSentWith,
  lateStateOf,
  normalizeLegacyLate,
  recordOnlyLate,
  S1Data,
  s1Differs,
  s1PendingCounted,
  S1PersonCategory,
  s1Totals,
  unverifiedLateReports,
} from './late_reports';

/**
 * El S-1 y los informes atrasados.
 *
 * Esto es lo que se manda a la sucursal: un fallo aquí no rompe nada, da un
 * número creíble y equivocado. Los casos son los de octubre de 2026, cuando el
 * S-1 de la app dio 38 publicadores y 26 auxiliares donde TsWin daba 34 y 24.
 */

const stamp = '2026-11-08T22:00:00.000Z';

type Late = CongFieldServiceReportType['report_data']['late'];

const report = (
  uid: string,
  month: string,
  opts: {
    late?: Late;
    status?: 'confirmed' | 'received';
    shared?: boolean;
    deleted?: boolean;
    hours?: number;
    studies?: number;
    updatedAt?: string;
  } = {}
): CongFieldServiceReportType =>
  ({
    report_id: `${uid}-${month}`,
    report_data: {
      _deleted: opts.deleted ?? false,
      updatedAt: opts.updatedAt ?? stamp,
      report_date: month,
      person_uid: uid,
      shared_ministry: opts.shared ?? true,
      hours: {
        field_service: opts.hours ?? 0,
        credit: { value: 0, approved: 0 },
      },
      bible_studies: opts.studies ?? 0,
      comments: '',
      late: opts.late ?? { value: false, submitted: '' },
      status: opts.status ?? 'confirmed',
    },
  }) as unknown as CongFieldServiceReportType;

const pending: Late = { value: true, submitted: '' };

// Solo hace falta el uid: qué es cada uno en cada mes lo dice `categoryOf`.
const person = (uid: string) => ({ person_uid: uid }) as unknown as PersonType;

/**
 * Lo que dicen los nombramientos de la congregación real:
 *  - Mírian Hernández: auxiliar solo en octubre de 2026.
 *  - Roberto Hernández: auxiliar en julio y en octubre de 2026.
 *  - Toñi: precursora regular.
 *  - Especial: precursor especial (informa a la sucursal, no entra en el S-1).
 *  - Los demás, publicadores.
 */
const categoryOf = (p: PersonType, month: string): S1PersonCategory => {
  switch (p.person_uid) {
    case 'mirian':
      return month === '2026/10' ? 'AP' : 'publisher';
    case 'roberto':
      return month === '2026/07' || month === '2026/10' ? 'AP' : 'publisher';
    case 'toni':
      return 'FR';
    case 'especial':
      return 'FS';
    default:
      return 'publisher';
  }
};

const persons = [
  'andrus',
  'ingrid',
  'mirian',
  'roberto',
  'toni',
  'especial',
  'sandra',
].map(person);

const count = (result: ReturnType<typeof collectS1Reports>) => ({
  publishers: result.publishers.length,
  APs: result.APs.length,
  FRs: result.FRs.length,
});

describe('qué es cada informe', () => {
  it('normal, atrasado pendiente, atrasado enviado y solo para la tarjeta', () => {
    expect(lateStateOf(report('a', '2026/10'))).toBe('on_time');
    expect(lateStateOf(report('a', '2026/09', { late: pending }))).toBe(
      'pending'
    );
    expect(
      lateStateOf(
        report('a', '2026/09', { late: { value: true, submitted: '2026/10' } })
      )
    ).toBe('sent');
    expect(
      lateStateOf(report('a', '2026/09', { late: recordOnlyLate('2026/09') }))
    ).toBe('record_only');
  });

  it('el de la tarjeta lleva su propio mes, para que una app vieja no reviente', () => {
    // La versión anterior pinta `submitted` como fecha con `formatDate`, que
    // lanza con cualquier texto que no sea un mes: su editor de la tarjeta
    // reventaba. Con su propio mes la lee como «ya enviado» y no la suma.
    expect(recordOnlyLate('2026/08')).toEqual({
      value: true,
      submitted: '2026/08',
      record_only: true,
    });
  });

  it('una hora en vez de un mes NO es un envío: es un atrasado pendiente', () => {
    // Así los guardaba, del 1 de agosto al 9 de noviembre de 2026, el informe
    // que mandaba el propio publicador con su mes ya enviado.
    const hora = { value: true, submitted: '2026-10-07T09:12:00.000Z' };

    expect(lateStateOf(report('a', '2026/09', { late: hora }))).toBe('pending');
    // Verificado también: leerlo como «ya contó» lo perdería en silencio si se
    // verifica desde la app nueva.
    expect(
      lateStateOf(report('a', '2026/09', { late: hora, status: 'confirmed' }))
    ).toBe('pending');
    expect(normalizeLegacyLate(hora)).toEqual({ value: true, submitted: '' });
  });

  it('normalizar no toca ninguna marca buena', () => {
    for (const late of [
      { value: false, submitted: '' },
      pending,
      { value: true, submitted: '2026/10' },
      recordOnlyLate('2026/08'),
    ]) {
      expect(normalizeLegacyLate(late)).toEqual(late);
    }
  });

  it('con el mes enviado se sigue editando el pendiente y el de la tarjeta, nada más', () => {
    expect(
      editableAfterMonthSent(report('a', '2026/09', { late: pending }))
    ).toBe(true);
    expect(
      editableAfterMonthSent(
        report('a', '2026/09', { late: recordOnlyLate('2026/09') })
      )
    ).toBe(true);
    expect(
      editableAfterMonthSent(
        report('a', '2026/09', { late: { value: true, submitted: '2026/10' } })
      )
    ).toBe(false);
    expect(editableAfterMonthSent(report('a', '2026/09'))).toBe(false);
    expect(editableAfterMonthSent(undefined)).toBe(false);
  });
});

describe('el S-1 de octubre de 2026', () => {
  // Lo que había en la app el 8 de noviembre por la noche.
  const informes = [
    // Andrus e Ingrid llegaron de otra congregación. El secretario copió su
    // tarjeta, y agosto y septiembre —meses ya enviados— solo se podían
    // escribir marcando «atrasado».
    report('andrus', '2026/08', { late: pending }),
    report('andrus', '2026/09', { late: pending }),
    report('andrus', '2026/10'),
    report('ingrid', '2026/08', { late: pending }),
    report('ingrid', '2026/09', { late: pending }),
    report('ingrid', '2026/10'),
    // Mírian y Roberto, igual, con agosto.
    report('mirian', '2026/08', { late: pending }),
    report('mirian', '2026/10', { hours: 15 }),
    report('roberto', '2026/08', { late: pending }),
    report('roberto', '2026/10', { hours: 19 }),
    report('toni', '2026/10', { hours: 50, studies: 3 }),
    report('especial', '2026/10', { hours: 70 }),
  ];

  it('cada atrasado cuenta en el grupo que tenía EN SU MES, no en el del S-1', () => {
    const result = collectS1Reports({
      month: '2026/10',
      reports: informes,
      persons,
      categoryOf,
    });

    // Mírian y Roberto eran publicadores en agosto. Antes sus informes de
    // agosto contaban como de auxiliar porque lo eran en OCTUBRE: 4
    // auxiliares donde había 2.
    expect(count(result)).toEqual({ publishers: 8, APs: 2, FRs: 1 });
    expect(result.late.map((entry) => entry.report.report_id)).toEqual([
      'andrus-2026/08',
      'ingrid-2026/08',
      'mirian-2026/08',
      'roberto-2026/08',
      'andrus-2026/09',
      'ingrid-2026/09',
    ]);
    expect(
      result.late.find((entry) => entry.person.person_uid === 'mirian')
        ?.category
    ).toBe('publishers');
  });

  it('apartados como «solo para su tarjeta», el S-1 cuadra con TsWin', () => {
    const apartados = informes.map((record) =>
      record.report_data.late.value
        ? report(
            record.report_data.person_uid,
            record.report_data.report_date,
            { late: recordOnlyLate(record.report_data.report_date) }
          )
        : record
    );

    const result = collectS1Reports({
      month: '2026/10',
      reports: apartados,
      persons,
      categoryOf,
    });

    // Solo los informes de octubre: los que dio TsWin.
    expect(count(result)).toEqual({ publishers: 2, APs: 2, FRs: 1 });
    expect(result.late).toEqual([]);

    // Y lo que se manda de cada grupo: el precursor especial no suma horas.
    expect(s1Totals(result)).toEqual({
      publishers: { report_count: 2, bible_studies: 0 },
      APs: { report_count: 2, hours: 34, bible_studies: 0 },
      FRs: { report_count: 1, hours: 50, bible_studies: 3 },
    });
  });

  it('el precursor especial no entra: informa directamente a la sucursal', () => {
    const result = collectS1Reports({
      month: '2026/10',
      reports: [report('especial', '2026/10')],
      persons,
      categoryOf,
    });

    expect(count(result)).toEqual({ publishers: 0, APs: 0, FRs: 0 });
  });
});

describe('lo que nunca entra en un S-1', () => {
  const s1 = (month: string, reports: CongFieldServiceReportType[]) =>
    count(collectS1Reports({ month, reports, persons, categoryOf }));

  it('un atrasado de un mes POSTERIOR no se lo lleva un S-1 anterior', () => {
    expect(
      s1('2026/09', [report('sandra', '2026/10', { late: pending })])
    ).toEqual({ publishers: 0, APs: 0, FRs: 0 });
  });

  it('un atrasado que ya salió con otro S-1 no vuelve a sumarse', () => {
    const enviado = report('sandra', '2026/08', {
      late: { value: true, submitted: '2026/09' },
    });

    expect(s1('2026/10', [enviado])).toEqual({
      publishers: 0,
      APs: 0,
      FRs: 0,
    });
    // Ni siquiera al regenerar el de su propio mes: ya salió con septiembre.
    expect(s1('2026/08', [enviado])).toEqual({
      publishers: 0,
      APs: 0,
      FRs: 0,
    });
  });

  it('el de la tarjeta, tampoco en el S-1 de su propio mes', () => {
    expect(
      s1('2026/08', [
        report('andrus', '2026/08', { late: recordOnlyLate('2026/08') }),
      ])
    ).toEqual({ publishers: 0, APs: 0, FRs: 0 });
  });

  it('ni sin verificar, ni sin participación, ni borrado, ni sin persona', () => {
    expect(
      s1('2026/10', [
        report('sandra', '2026/10', { status: 'received' }),
        report('andrus', '2026/10', { shared: false }),
        report('ingrid', '2026/10', { deleted: true }),
        report('nadie', '2026/10'),
      ])
    ).toEqual({ publishers: 0, APs: 0, FRs: 0 });
  });

  it('el atrasado sin participación tampoco (un atrasado vacío inflaba el S-1)', () => {
    expect(
      s1('2026/10', [
        report('sandra', '2026/09', { late: pending, shared: false }),
      ])
    ).toEqual({ publishers: 0, APs: 0, FRs: 0 });
  });
});

describe('al enviar el S-1', () => {
  it('se marcan como enviados EXACTAMENTE los atrasados que sumó', () => {
    const reports = [
      report('andrus', '2026/09', { late: pending }), // sumado
      report('ingrid', '2026/09', { late: pending, shared: false }), // no
      report('sandra', '2026/09', { late: pending, status: 'received' }), // no
      report('especial', '2026/09', { late: pending }), // no: FS
      report('toni', '2026/11', { late: pending }), // no: mes posterior
      report('mirian', '2026/10'), // a tiempo: no es atrasado
    ];

    const result = collectS1Reports({
      month: '2026/10',
      reports,
      persons,
      categoryOf,
    });

    // Antes se marcaban todos los pendientes hasta ese mes, y los que no se
    // habían sumado ya no salían nunca.
    expect(s1PendingCounted(result).map((r) => r.report_id)).toEqual([
      'andrus-2026/09',
    ]);
  });

  it('los que «sumó» después de enviado son solo de meses anteriores', () => {
    const reports = [
      report('a', '2026/08', { late: { value: true, submitted: '2026/10' } }),
      report('b', '2026/10', { late: { value: true, submitted: '2026/10' } }),
      report('c', '2026/08', { late: { value: true, submitted: '2026/09' } }),
      report('d', '2026/09', { late: pending }),
      report('e', '2026/09', { late: recordOnlyLate('2026/09') }),
    ];

    expect(
      lateReportsSentWith('2026/10', reports).map((r) => r.report_id)
    ).toEqual(['a-2026/08']);
  });
});

describe('atrasados sin verificar', () => {
  it('se ven en el S-1 aunque todavía no se sumen', () => {
    const reports = [
      report('a', '2026/09', { late: pending, status: 'received' }),
      report('b', '2026/09', { late: pending }), // verificado: ya se suma
      report('c', '2026/10', { status: 'received' }), // de este mes
      report('d', '2026/09', {
        late: pending,
        status: 'received',
        shared: false,
      }),
    ];

    expect(
      unverifiedLateReports('2026/10', reports).map((r) => r.report_id)
    ).toEqual(['a-2026/09']);
  });
});

describe('el S-1 guardado y los datos de ahora', () => {
  const datos = (cambios: Partial<S1Data> = {}): S1Data => ({
    publishers_active: 82,
    weekend_meeting_average: 84,
    publishers: { report_count: 34, bible_studies: 7 },
    APs: { report_count: 24, hours: 596, bible_studies: 7 },
    FRs: { report_count: 22, hours: 1239, bible_studies: 15 },
    ...cambios,
  });

  it('igual: no avisa', () => {
    expect(s1Differs(datos(), datos())).toBe(false);
  });

  it('cualquier número distinto: hay que regenerar antes de enviar', () => {
    // Apartar un atrasado desde el formulario, verificar uno o corregir la
    // asistencia cambia lo que diría el S-1, pero no el guardado.
    expect(
      s1Differs(
        datos({ publishers: { report_count: 38, bible_studies: 7 } }),
        datos()
      )
    ).toBe(true);
    expect(s1Differs(datos({ weekend_meeting_average: 80 }), datos())).toBe(
      true
    );
    expect(
      s1Differs(
        datos({ APs: { report_count: 24, hours: 590, bible_studies: 7 } }),
        datos()
      )
    ).toBe(true);
  });

  it('sin S-1 guardado no hay nada que comparar', () => {
    expect(s1Differs(undefined, datos())).toBe(false);
  });
});

describe('qué era cada persona en un mes', () => {
  it('especial y misionero antes que auxiliar, y auxiliar antes que regular', () => {
    const tiene = (marcas: string[]) => (_: PersonType, enrollment: string) =>
      marcas.includes(enrollment);

    expect(buildS1CategoryOf(tiene(['FS', 'AP']))(person('x'), '2026/10')).toBe(
      'FS'
    );
    expect(buildS1CategoryOf(tiene(['AP', 'FR']))(person('x'), '2026/10')).toBe(
      'AP'
    );
    expect(buildS1CategoryOf(tiene([]))(person('x'), '2026/10')).toBe(
      'publisher'
    );
  });
});

describe('el informe que manda el propio publicador desde su móvil', () => {
  const ENVIADO = '2026-10-05T18:01:36.063Z';

  it('con su mes sin enviar, no se toca la marca', () => {
    expect(incomingReportLate({ monthSent: false })).toEqual({
      value: false,
      submitted: '',
    });
  });

  it('con su mes ya enviado y nada antes, es un atrasado PENDIENTE', () => {
    // Antes: { value: true, submitted: <hora de llegada> }, que el S-1 leía
    // como ya enviado. El informe no llegaba nunca a la sucursal.
    expect(incomingReportLate({ monthSent: true, sentAt: ENVIADO })).toEqual({
      value: true,
      submitted: '',
    });
  });

  it('si corrige uno que ya entró a tiempo, NO es atrasado: se contaría dos veces', () => {
    expect(
      incomingReportLate({
        monthSent: true,
        sentAt: ENVIADO,
        existing: report('a', '2026/09'),
      })
    ).toEqual({ value: false, submitted: '' });
  });

  it('si el que había no llegó a contar —sin verificar o sin participar—, sí lo es', () => {
    for (const existing of [
      report('a', '2026/09', { status: 'received' }),
      report('a', '2026/09', { shared: false }),
    ]) {
      expect(
        incomingReportLate({ monthSent: true, sentAt: ENVIADO, existing })
      ).toEqual({ value: true, submitted: '' });
    }
  });

  it('retirado ANTES de enviar el S-1: no contó, el reenvío es atrasado', () => {
    expect(
      incomingReportLate({
        monthSent: true,
        sentAt: ENVIADO,
        existing: report('a', '2026/09', {
          deleted: true,
          updatedAt: '2026-10-03T10:00:00.000Z',
        }),
      })
    ).toEqual({ value: true, submitted: '' });
  });

  it('retirado DESPUÉS de enviar el S-1: ya contó, el reenvío no se suma otra vez', () => {
    expect(
      incomingReportLate({
        monthSent: true,
        sentAt: ENVIADO,
        existing: report('a', '2026/09', {
          deleted: true,
          updatedAt: '2026-10-20T10:00:00.000Z',
        }),
      })
    ).toEqual({ value: false, submitted: '' });
  });

  it('una marca que ya decidió alguien se respeta', () => {
    for (const late of [
      pending,
      recordOnlyLate('2026/09'),
      { value: true, submitted: '2026/11' },
    ]) {
      expect(
        incomingReportLate({
          monthSent: true,
          sentAt: ENVIADO,
          existing: report('a', '2026/09', { late }),
        })
      ).toEqual(late);
    }
  });

  it('y la marca vieja con la hora de llegada se deja limpia, como pendiente', () => {
    expect(
      incomingReportLate({
        monthSent: true,
        sentAt: ENVIADO,
        existing: report('a', '2026/09', {
          late: { value: true, submitted: '2026-10-07T09:12:00.000Z' },
          status: 'received',
        }),
      })
    ).toEqual({ value: true, submitted: '' });
  });
});
