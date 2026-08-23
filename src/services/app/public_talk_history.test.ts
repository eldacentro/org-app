import { describe, expect, it } from 'vitest';
import { SourceWeekType } from '@definition/sources';
import {
  mesesEntreSemanas,
  publicTalkLastGiven,
  publicTalkNextScheduled,
  publicTalkRepeatNotice,
  publicTalkUpcomingNotice,
} from './public_talk_history';

/**
 * Avisar de que un discurso se repite.
 *
 * Lo que se comprueba aquí es que la fecha y los meses sean los de verdad: un
 * aviso que diga «hace 4 meses» cuando fueron catorce se cree, y el discurso se
 * cambia para nada — o peor, se deja pasar uno que sí se repite.
 */

const semana = (weekOf: string, talk?: number): SourceWeekType =>
  ({
    weekOf,
    weekend_meeting: {
      public_talk: [
        { type: 'main', value: talk ?? '', updatedAt: '' },
        // Un grupo de idioma lleva su propio discurso ese mismo fin de semana.
        { type: 'grupo', value: 999, updatedAt: '' },
      ],
    },
  }) as unknown as SourceWeekType;

const FUENTES = [
  semana('2025/09/01', 12),
  semana('2026/04/13', 55),
  semana('2026/06/08'),
  semana('2026/07/06', 55),
  semana('2026/08/17'),
];

describe('los meses que han pasado', () => {
  it('se cuentan por meses de calendario', () => {
    expect(mesesEntreSemanas('2026/04/13', '2026/08/17')).toBe(4);
    expect(mesesEntreSemanas('2026/07/06', '2026/08/17')).toBe(1);
  });

  it('un mes no cumplido no cuenta', () => {
    // Del 20 de julio al 17 de agosto no ha pasado un mes, aunque cambie el
    // número del mes. Dividir días entre 30 daba «1» aquí.
    expect(mesesEntreSemanas('2026/07/20', '2026/08/17')).toBe(0);
    expect(mesesEntreSemanas('2026/07/17', '2026/08/17')).toBe(1);
  });

  it('cruza el año sin despeinarse', () => {
    expect(mesesEntreSemanas('2025/09/01', '2026/08/17')).toBe(11);
  });

  it('una fecha rota vale cero, no NaN', () => {
    expect(mesesEntreSemanas('', '2026/08/17')).toBe(0);
    expect(mesesEntreSemanas('el martes', '2026/08/17')).toBe(0);
  });
});

describe('cuándo se dio por última vez', () => {
  it('la más reciente de las anteriores, no la primera', () => {
    expect(
      publicTalkLastGiven({
        sources: FUENTES,
        talkNumber: 55,
        dataView: 'main',
        week: '2026/08/17',
      })
    ).toBe('2026/07/06');
  });

  it('no se cuenta la semana que se está armando ni las de después', () => {
    // Si contara la propia semana, el discurso que acabas de poner se avisaría
    // a sí mismo.
    expect(
      publicTalkLastGiven({
        sources: [...FUENTES, semana('2026/09/07', 55)],
        talkNumber: 55,
        dataView: 'main',
        week: '2026/07/06',
      })
    ).toBe('2026/04/13');
  });

  it('el discurso de OTRO grupo de idioma no cuenta', () => {
    expect(
      publicTalkLastGiven({
        sources: FUENTES,
        talkNumber: 999,
        dataView: 'main',
        week: '2026/08/17',
      })
    ).toBeNull();
  });

  it('sin discurso, o sin repetición, no hay nada', () => {
    expect(
      publicTalkLastGiven({
        sources: FUENTES,
        talkNumber: 0,
        dataView: 'main',
        week: '2026/08/17',
      })
    ).toBeNull();

    expect(
      publicTalkLastGiven({
        sources: FUENTES,
        talkNumber: 77,
        dataView: 'main',
        week: '2026/08/17',
      })
    ).toBeNull();
  });
});

describe('si hay que avisar', () => {
  const avisar = (mesesAviso: number, week = '2026/08/17') =>
    publicTalkRepeatNotice({
      sources: FUENTES,
      talkNumber: 55,
      dataView: 'main',
      week,
      mesesAviso,
    });

  it('se dio hace 1 mes y el aviso es a 12: avisa', () => {
    expect(avisar(12)).toEqual({ weekOf: '2026/07/06', meses: 1 });
  });

  it('justo en el límite NO avisa', () => {
    // Con el aviso a 1 mes, uno que se dio hace exactamente 1 ya ha cumplido lo
    // que la congregación pidió.
    expect(avisar(1)).toBeNull();
  });

  it('con el aviso apagado no dice nada', () => {
    expect(avisar(0)).toBeNull();
    expect(avisar(-3)).toBeNull();
  });

  it('sin repeticiones dentro del plazo, callado', () => {
    expect(
      publicTalkRepeatNotice({
        sources: FUENTES,
        talkNumber: 12,
        dataView: 'main',
        week: '2026/08/17',
        mesesAviso: 6,
      })
    ).toBeNull();
  });
});

/**
 * Se programa noviembre antes que septiembre —pasa constantemente, porque el
 * orador de noviembre confirma antes—, y al llegar a septiembre el aviso de «ya
 * se dio» no dice nada: mirando hacia atrás no hay nada. El choque está delante.
 */
describe('publicTalkNextScheduled', () => {
  const fuentes = (pares: [string, number][]) =>
    pares.map(([weekOf, talk]) => semana(weekOf, talk));

  it('encuentra el que está puesto más adelante', () => {
    const sources = fuentes([
      ['2026/09/14', 0],
      ['2026/11/16', 38],
    ]);

    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
      })
    ).toBe('2026/11/16');
  });

  it('coge el más CERCANO de los que vienen', () => {
    const sources = fuentes([
      ['2027/03/15', 38],
      ['2026/11/16', 38],
    ]);

    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
      })
    ).toBe('2026/11/16');
  });

  it('no mira hacia atrás: para eso está el otro', () => {
    const sources = fuentes([['2026/04/13', 38]]);

    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
      })
    ).toBeNull();
  });

  it('la propia semana no cuenta como «más adelante»', () => {
    // Si no, elegir un discurso se avisaría a sí mismo.
    const sources = fuentes([['2026/09/14', 38]]);

    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
      })
    ).toBeNull();
  });

  it('sin discurso o sin semana no dice nada', () => {
    const sources = fuentes([['2026/11/16', 38]]);

    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 0,
        dataView: 'main',
        week: '2026/09/14',
      })
    ).toBeNull();
    expect(
      publicTalkNextScheduled({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '',
      })
    ).toBeNull();
  });
});

describe('publicTalkUpcomingNotice', () => {
  const sources = [semana('2026/11/16', 38)];

  it('avisa si cae dentro del plazo de la congregación', () => {
    expect(
      publicTalkUpcomingNotice({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
        mesesAviso: 12,
      })
    ).toEqual({ weekOf: '2026/11/16', meses: 2 });
  });

  it('calla si está más lejos que el plazo', () => {
    expect(
      publicTalkUpcomingNotice({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
        mesesAviso: 1,
      })
    ).toBeNull();
  });

  it('con el aviso apagado no dice nada', () => {
    expect(
      publicTalkUpcomingNotice({
        sources,
        talkNumber: 38,
        dataView: 'main',
        week: '2026/09/14',
        mesesAviso: 0,
      })
    ).toBeNull();
  });
});
