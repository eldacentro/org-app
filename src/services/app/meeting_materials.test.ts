import { describe, expect, it } from 'vitest';
import { SourceWeekType } from '@definition/sources';
import {
  agruparPorBimestre,
  bimestreDeMes,
  origenDeSemana,
  primerMesDelBimestre,
  semanasSinMaterial,
  semanaTieneMaterial,
} from './meeting_materials';

/**
 * Materiales de reunión.
 *
 * Lo que importa aquí es no MENTIR sobre lo que hay: decir que un bimestre
 * está importado cuando su registro está vacío, o dar por bueno un origen que
 * no consta, manda a alguien a la reunión sin material.
 */

const semana = (
  weekOf: string,
  extra: Partial<SourceWeekType> = {}
): SourceWeekType =>
  ({
    weekOf,
    midweek_meeting: { weekly_bible_reading: { S: 'Génesis 1-3' } },
    ...extra,
  }) as unknown as SourceWeekType;

const vacia = (weekOf: string) =>
  ({
    weekOf,
    midweek_meeting: { weekly_bible_reading: { S: '' } },
  }) as unknown as SourceWeekType;

describe('los bimestres de la Guía de actividades', () => {
  it('enero y febrero son el mismo cuaderno', () => {
    expect(bimestreDeMes(1)).toBe(1);
    expect(bimestreDeMes(2)).toBe(1);
    expect(bimestreDeMes(3)).toBe(2);
    expect(bimestreDeMes(12)).toBe(6);
  });

  it('el cuaderno se nombra por su primer mes, que es impar', () => {
    expect(primerMesDelBimestre(1)).toBe(1);
    expect(primerMesDelBimestre(2)).toBe(1);
    expect(primerMesDelBimestre(8)).toBe(7);
  });
});

describe('un registro vacío no es material', () => {
  it('una semana sembrada sin importar nada no cuenta', () => {
    // La tabla se siembra al crear el programa de una semana. Si esto
    // contara, la página diría que el cuaderno está y no está.
    expect(semanaTieneMaterial(vacia('2026/01/05'))).toBe(false);
    expect(semanaTieneMaterial(undefined)).toBe(false);
  });

  it('con lectura de la Biblia sí cuenta', () => {
    expect(semanaTieneMaterial(semana('2026/01/05'))).toBe(true);
  });

  it('solo con el estudio de La Atalaya también', () => {
    const soloFinDeSemana = {
      weekOf: '2026/01/05',
      weekend_meeting: { w_study: { S: 'Un tema' } },
    } as unknown as SourceWeekType;

    expect(semanaTieneMaterial(soloFinDeSemana)).toBe(true);
  });
});

describe('de dónde salió cada semana', () => {
  it('lo guardado explícitamente manda', () => {
    expect(
      origenDeSemana(
        semana('2026/01/05', {
          import_source: { type: 'jw', updatedAt: '2026-01-01T00:00:00Z' },
        })
      )
    ).toBe('jw');
  });

  it('sin dato explícito, el identificador de semana delata al .jwpub', () => {
    expect(origenDeSemana(semana('2026/01/05', { mwb_week_docid: 123 }))).toBe(
      'jwpub'
    );
  });

  it('y sin ninguna de las dos cosas, se dice que no se sabe', () => {
    // Preferible a inventarse "jw.org": lo importado antes de esto no lo dice.
    expect(origenDeSemana(semana('2026/01/05'))).toBe('desconocido');
  });

  it('lo explícito gana al identificador antiguo', () => {
    // Reimportar desde jw.org encima de un .jwpub conserva el identificador,
    // así que sin esta preferencia la página seguiría diciendo ".jwpub".
    expect(
      origenDeSemana(
        semana('2026/01/05', {
          mwb_week_docid: 123,
          import_source: { type: 'jw', updatedAt: '2026-02-01T00:00:00Z' },
        })
      )
    ).toBe('jw');
  });
});

describe('agrupado por cuaderno', () => {
  const sources = [
    semana('2026/01/05', { mwb_week_docid: 1 }),
    semana('2026/02/02', { mwb_week_docid: 2 }),
    semana('2026/03/02', {
      import_source: { type: 'jw', updatedAt: '2026-02-20T10:00:00Z' },
    }),
    vacia('2026/05/04'),
  ];

  it('enero y febrero caen juntos y marzo aparte', () => {
    const grupos = agruparPorBimestre(sources);

    expect(grupos.map((g) => g.id)).toEqual(['2026-2', '2026-1']);
    expect(grupos.find((g) => g.id === '2026-1')!.semanas).toEqual([
      '2026/01/05',
      '2026/02/02',
    ]);
  });

  it('un bimestre sin material no aparece', () => {
    expect(agruparPorBimestre(sources).some((g) => g.id === '2026-3')).toBe(
      false
    );
  });

  it('dice el origen y si el enlace lleva a la semana exacta', () => {
    const grupos = agruparPorBimestre(sources);

    const eneFeb = grupos.find((g) => g.id === '2026-1')!;
    expect(eneFeb.origen).toBe('jwpub');
    expect(eneFeb.semanaExacta).toBe(true);
    expect(eneFeb.primerMes).toBe(1);

    const marAbr = grupos.find((g) => g.id === '2026-2')!;
    expect(marAbr.origen).toBe('jw');
    expect(marAbr.semanaExacta).toBe(false);
    expect(marAbr.importadoEl).toBe('2026-02-20T10:00:00Z');
  });

  it('con orígenes mezclados manda el de la mayoría', () => {
    const mezcla = [
      semana('2026/01/05', { mwb_week_docid: 1 }),
      semana('2026/01/12', { mwb_week_docid: 2 }),
      semana('2026/01/19', {
        import_source: { type: 'jw', updatedAt: '2026-01-01T00:00:00Z' },
      }),
    ];

    expect(agruparPorBimestre(mezcla)[0].origen).toBe('jwpub');
  });

  it('lo más reciente va primero', () => {
    const grupos = agruparPorBimestre([
      semana('2025/11/03'),
      semana('2026/03/02'),
      semana('2026/01/05'),
    ]);

    expect(grupos.map((g) => g.id)).toEqual(['2026-2', '2026-1', '2025-6']);
  });

  it('una lista vacía no rompe nada', () => {
    expect(agruparPorBimestre([])).toEqual([]);
    expect(agruparPorBimestre(undefined as never)).toEqual([]);
  });
});

describe('qué falta', () => {
  it('avisa de las semanas previstas que no tienen material', () => {
    const sources = [semana('2026/01/05'), vacia('2026/01/12')];

    expect(
      semanasSinMaterial(sources, ['2026/01/05', '2026/01/12', '2026/01/19'])
    ).toEqual(['2026/01/12', '2026/01/19']);
  });

  it('sin semanas previstas no hay nada que avisar', () => {
    expect(semanasSinMaterial([semana('2026/01/05')], [])).toEqual([]);
  });
});
