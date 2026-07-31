import { describe, expect, it } from 'vitest';
import { SourceWeekType } from '@definition/sources';
import {
  agruparMaterial,
  bimestreDeMes,
  origenDeSemana,
  primerMesDelBimestre,
  semanasSinMaterial,
  tieneMaterial,
} from './meeting_materials';

/**
 * Materiales de reunión.
 *
 * Lo que importa aquí es no MENTIR sobre lo que hay. Son dos publicaciones que
 * se importan por separado, así que decir "enero-febrero está importado" sin
 * mirar de qué reunión manda a alguien al domingo sin material porque solo se
 * bajó la Guía.
 */

const conGuia = (weekOf: string, extra: Partial<SourceWeekType> = {}) =>
  ({
    weekOf,
    midweek_meeting: { weekly_bible_reading: { S: 'Génesis 1-3' } },
    ...extra,
  }) as unknown as SourceWeekType;

const conAtalaya = (weekOf: string, extra: Partial<SourceWeekType> = {}) =>
  ({
    weekOf,
    weekend_meeting: { w_study: { S: 'Confiemos en Jehová' } },
    ...extra,
  }) as unknown as SourceWeekType;

const vacia = (weekOf: string) =>
  ({
    weekOf,
    midweek_meeting: { weekly_bible_reading: { S: '' } },
    weekend_meeting: { w_study: { S: '' } },
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

describe('cada reunión tiene su material, por separado', () => {
  it('la Guía no da por buena La Atalaya', () => {
    // Este es el fallo que se quiere evitar: bajar solo la Guía y que la app
    // diga que la semana está completa.
    const semana = conGuia('2026/01/05');

    expect(tieneMaterial(semana, 'midweek')).toBe(true);
    expect(tieneMaterial(semana, 'weekend')).toBe(false);
  });

  it('y La Atalaya tampoco da por buena la Guía', () => {
    const semana = conAtalaya('2026/01/05');

    expect(tieneMaterial(semana, 'midweek')).toBe(false);
    expect(tieneMaterial(semana, 'weekend')).toBe(true);
  });

  it('un registro sembrado y vacío no es material', () => {
    expect(tieneMaterial(vacia('2026/01/05'), 'midweek')).toBe(false);
    expect(tieneMaterial(vacia('2026/01/05'), 'weekend')).toBe(false);
    expect(tieneMaterial(undefined, 'midweek')).toBe(false);
  });
});

describe('de dónde salió cada reunión', () => {
  it('lo guardado explícitamente manda, y es por reunión', () => {
    const semana = conGuia('2026/01/05', {
      import_source: {
        midweek: { type: 'jwpub', updatedAt: '2026-01-01T00:00:00Z' },
        weekend: { type: 'jw', updatedAt: '2026-01-02T00:00:00Z' },
      },
    });

    expect(origenDeSemana(semana, 'midweek')).toBe('jwpub');
    expect(origenDeSemana(semana, 'weekend')).toBe('jw');
  });

  it('sin dato explícito, el identificador delata al .jwpub', () => {
    expect(
      origenDeSemana(conGuia('2026/01/05', { mwb_week_docid: 123 }), 'midweek')
    ).toBe('jwpub');

    expect(
      origenDeSemana(
        conAtalaya('2026/01/05', { w_study_docid: 456 }),
        'weekend'
      )
    ).toBe('jwpub');
  });

  it('el identificador de una reunión no dice nada de la otra', () => {
    const semana = conGuia('2026/01/05', { mwb_week_docid: 123 });

    expect(origenDeSemana(semana, 'weekend')).toBe('desconocido');
  });

  it('sin ninguna de las dos cosas, se dice que no se sabe', () => {
    expect(origenDeSemana(conGuia('2026/01/05'), 'midweek')).toBe(
      'desconocido'
    );
  });

  it('el identificador manda sobre el sello de la última importación', () => {
    // Este es EL caso que se veía en la app. La importación automática desde
    // jw.org corre cada semana y vuelve a sellar como 'jw' semanas que se
    // habían subido con un .jwpub, pero no puede quitarles el identificador.
    // Haciendo caso al sello, la fila decía "Desde jw.org" y a la vez "abre la
    // semana exacta", que solo puede darlo el .jwpub: se contradecía sola.
    expect(
      origenDeSemana(
        conGuia('2026/01/05', {
          mwb_week_docid: 123,
          import_source: {
            midweek: { type: 'jw', updatedAt: '2026-02-01T00:00:00Z' },
          },
        }),
        'midweek'
      )
    ).toBe('jwpub');
  });

  it('sin identificador, el sello decide', () => {
    // Lo que viene de jw.org nunca trae identificador, así que aquí el sello
    // es la única fuente — y sigue haciendo falta.
    expect(
      origenDeSemana(
        conGuia('2026/01/05', {
          import_source: {
            midweek: { type: 'jw', updatedAt: '2026-02-01T00:00:00Z' },
          },
        }),
        'midweek'
      )
    ).toBe('jw');
  });

  it('el identificador de una reunión no contagia a la otra', () => {
    // La Guía y La Atalaya se importan por separado: tener el identificador de
    // entre semana no dice nada del fin de semana.
    const semana = conGuia('2026/01/05', {
      mwb_week_docid: 123,
      import_source: {
        weekend: { type: 'jw', updatedAt: '2026-02-01T00:00:00Z' },
      },
    });

    expect(origenDeSemana(semana, 'midweek')).toBe('jwpub');
    expect(origenDeSemana(semana, 'weekend')).toBe('jw');
  });

  it('la forma antigua (un origen por semana) se sigue entendiendo', () => {
    // Se guardó así durante unas horas; no se descarta.
    const antigua = conGuia('2026/01/05', {
      import_source: {
        type: 'jwpub',
        updatedAt: '2026-01-01T00:00:00Z',
      } as never,
    });

    expect(origenDeSemana(antigua, 'midweek')).toBe('jwpub');
    expect(origenDeSemana(antigua, 'weekend')).toBe('jwpub');
  });
});

describe('agrupado por cuaderno', () => {
  const sources = [
    conGuia('2026/01/05', { mwb_week_docid: 1 }),
    conGuia('2026/02/02', { mwb_week_docid: 2 }),
    conAtalaya('2026/01/05', {
      w_study_docid: 9,
      import_source: {
        weekend: { type: 'jwpub', updatedAt: '2026-01-10T10:00:00Z' },
      },
    }),
    conGuia('2026/03/02', {
      import_source: {
        midweek: { type: 'jw', updatedAt: '2026-02-20T10:00:00Z' },
      },
    }),
    vacia('2026/05/04'),
  ];

  const guia = (src = sources) => agruparMaterial(src, 'midweek', 'bimestre');
  const atalaya = (src = sources) => agruparMaterial(src, 'weekend', 'mes');

  it('la Guía es BIMESTRAL: enero y febrero caen juntos y marzo aparte', () => {
    expect(guia().map((g) => g.id)).toEqual(['2026-2', '2026-1']);
  });

  it('La Atalaya es MENSUAL: cada mes va por su cuenta', () => {
    // Éste es el fondo del asunto. La Guía es un cuaderno por bimestre; La
    // Atalaya, un número por mes. Meter las dos en bloques de bimestre —como
    // se hacía— inventaba una "Atalaya de enero-febrero", que no existe.
    const meses = atalaya([
      conAtalaya('2026/01/05'),
      conAtalaya('2026/02/02'),
      conAtalaya('2026/02/09'),
    ]).map((g) => g.id);

    expect(meses).toEqual(['2026-2', '2026-1']);
  });

  it('un periodo sin nada no aparece', () => {
    expect(guia().some((g) => g.id === '2026-3')).toBe(false);
  });

  it('un periodo de una publicación no arrastra a la otra', () => {
    // Marzo tiene Guía pero no Atalaya: la Guía lo enseña y La Atalaya no.
    expect(guia().some((g) => g.id === '2026-2')).toBe(true);
    expect(atalaya().some((g) => g.id === '2026-3')).toBe(false);
  });

  it('dice las semanas concretas que cubre', () => {
    // Con las fechas delante no hay que interpretar el rótulo: es lo que
    // deshace la confusión entre el mes de portada y el mes de estudio.
    const eneFeb = guia().find((g) => g.id === '2026-1')!;

    expect(eneFeb.estado.semanas).toEqual(['2026/01/05', '2026/02/02']);
    expect(eneFeb.estado.origen).toBe('jwpub');
    expect(eneFeb.estado.semanaExacta).toBe(true);
  });

  it('el periodo sabe qué meses abarca', () => {
    const bimestre = guia().find((g) => g.id === '2026-1')!;
    expect([bimestre.primerMes, bimestre.ultimoMes]).toEqual([1, 2]);

    const mes = atalaya([conAtalaya('2026/03/02')])[0];
    expect([mes.primerMes, mes.ultimoMes]).toEqual([3, 3]);
  });

  it('con orígenes mezclados manda el de la mayoría', () => {
    const mezcla = [
      conGuia('2026/01/05', { mwb_week_docid: 1 }),
      conGuia('2026/01/12', { mwb_week_docid: 2 }),
      conGuia('2026/01/19', {
        import_source: {
          midweek: { type: 'jw', updatedAt: '2026-01-01T00:00:00Z' },
        },
      }),
    ];

    expect(guia(mezcla)[0].estado.origen).toBe('jwpub');
  });

  it('lo más reciente va primero', () => {
    expect(
      guia([
        conGuia('2025/11/03'),
        conGuia('2026/03/02'),
        conGuia('2026/01/05'),
      ]).map((g) => g.id)
    ).toEqual(['2026-2', '2026-1', '2025-6']);
  });

  it('una lista vacía no rompe nada', () => {
    expect(guia([])).toEqual([]);
    expect(agruparMaterial(undefined as never, 'midweek', 'bimestre')).toEqual(
      []
    );
  });
});

describe('qué falta', () => {
  it('avisa por reunión, no en bloque', () => {
    const sources = [conGuia('2026/01/05'), conAtalaya('2026/01/12')];
    const previstas = ['2026/01/05', '2026/01/12'];

    expect(semanasSinMaterial(sources, previstas, 'midweek')).toEqual([
      '2026/01/12',
    ]);
    expect(semanasSinMaterial(sources, previstas, 'weekend')).toEqual([
      '2026/01/05',
    ]);
  });

  it('sin semanas previstas no hay nada que avisar', () => {
    expect(semanasSinMaterial([conGuia('2026/01/05')], [], 'midweek')).toEqual(
      []
    );
  });
});

/**
 * El número de portada y el mes de estudio son cosas distintas.
 *
 * Comprobado con un archivo real (`w_S_202609.jwpub`, La Atalaya de septiembre
 * de 2026): su propio manifiesto dice "Artículos de estudio: 2 de noviembre a
 * 6 de diciembre". Dos meses de diferencia.
 */
describe('el número de portada, cuando consta', () => {
  const deSeptiembre = (weekOf: string) =>
    ({
      weekOf,
      weekend_meeting: { w_study: { S: 'Un artículo' } },
      import_source: {
        weekend: {
          type: 'jwpub',
          updatedAt: '2026-10-01T00:00:00Z',
          issue: {
            simbolo: 'w26.09',
            titulo: 'La Atalaya, septiembre de 2026',
            mesDePortada: '2026/09',
          },
        },
      },
    }) as unknown as SourceWeekType;

  it('el bloque de NOVIEMBRE dice que su material es el de septiembre', () => {
    const noviembre = agruparMaterial(
      [deSeptiembre('2026/11/02'), deSeptiembre('2026/11/09')],
      'weekend',
      'mes'
    )[0];

    expect(noviembre.primerMes).toBe(11);
    expect(noviembre.estado.numeros).toEqual([
      { simbolo: 'w26.09', titulo: 'La Atalaya, septiembre de 2026' },
    ]);
  });

  it('un mes a caballo de dos números los enseña los dos', () => {
    const deOctubre = {
      ...deSeptiembre('2026/12/07'),
      import_source: {
        weekend: {
          type: 'jwpub',
          updatedAt: '2026-11-01T00:00:00Z',
          issue: { simbolo: 'w26.10', titulo: 'La Atalaya, octubre de 2026' },
        },
      },
    } as unknown as SourceWeekType;

    const diciembre = agruparMaterial(
      [deSeptiembre('2026/12/01'), deOctubre],
      'weekend',
      'mes'
    )[0];

    expect(diciembre.estado.numeros.map((n) => n.simbolo)).toEqual([
      'w26.09',
      'w26.10',
    ]);
  });

  it('sin número —lo importado desde jw.org— la lista queda vacía y no rompe', () => {
    const mes = agruparMaterial(
      [conAtalaya('2026/11/02')],
      'weekend',
      'mes'
    )[0];

    expect(mes.estado.numeros).toEqual([]);
  });
});
