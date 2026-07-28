import { describe, expect, it } from 'vitest';
import {
  isMonthPublished,
  monthNeedsPublishing,
  monthOfDate,
  setMonthPublished,
} from './month_publish';
import { isOutingsMonthPublished, OUTINGS_DRAFT_FROM } from './service_outings_publish';
import {
  DEPTS_DRAFT_FROM,
  deptWeekNeedsPublishing,
  isDeptWeekPublished,
} from './departments_publish';

/**
 * Borrador / publicado.
 *
 * Decide si a un hermano le sale una asignación en "Mis asignaciones", en el
 * programa semanal y por notificación. Equivocarse por un lado le avisa de algo
 * que nadie ha confirmado; por el otro le esconde algo que sí le toca.
 */

const CORTE = '2026/09';

describe('la decisión, que es igual para todos los módulos', () => {
  it('lo anterior al corte se da por publicado', () => {
    // Si no, al desplegar el cambio la congregación entera dejaría de ver de
    // golpe lo que ya está en marcha.
    expect(isMonthPublished([], '2026/07', CORTE)).toBe(true);
    expect(isMonthPublished([], '2026/08', CORTE)).toBe(true);
  });

  it('desde el corte hay que publicar a mano', () => {
    expect(isMonthPublished([], '2026/09', CORTE)).toBe(false);
    expect(isMonthPublished(['2026/09'], '2026/09', CORTE)).toBe(true);
  });

  it('publicar uno no publica los demás', () => {
    expect(isMonthPublished(['2026/09'], '2026/10', CORTE)).toBe(false);
  });

  it('acepta una fecha completa y se queda con el mes', () => {
    expect(monthOfDate('2026/09/14')).toBe('2026/09');
    expect(isMonthPublished(['2026/09'], '2026/09/14', CORTE)).toBe(true);
  });

  it('en la duda NO se enseña', () => {
    // Es preferible que algo no aparezca a que aparezca sin confirmar.
    expect(isMonthPublished([], 'vete a saber', CORTE)).toBe(false);
    expect(isMonthPublished(null, '2026/09', CORTE)).toBe(false);
  });

  it('publicar y retirar, sin duplicados y ordenado', () => {
    let list = setMonthPublished([], '2026/11', true);
    list = setMonthPublished(list, '2026/09', true);
    list = setMonthPublished(list, '2026/09', true);

    expect(list).toEqual(['2026/09', '2026/11']);

    expect(setMonthPublished(list, '2026/09', false)).toEqual(['2026/11']);
  });

  it('no muta la lista que recibe', () => {
    const original = ['2026/09'];
    setMonthPublished(original, '2026/10', true);

    expect(original).toEqual(['2026/09']);
  });

  it('distingue el histórico del que hay que publicar', () => {
    expect(monthNeedsPublishing('2026/08', CORTE)).toBe(false);
    expect(monthNeedsPublishing('2026/09', CORTE)).toBe(true);
  });
});

describe('salidas de predicación', () => {
  it('usa el mismo corte y respeta la lista de los ajustes', () => {
    expect(isOutingsMonthPublished({ publishedMonths: [] }, '2026/08')).toBe(true);
    expect(isOutingsMonthPublished({ publishedMonths: [] }, OUTINGS_DRAFT_FROM)).toBe(
      false
    );
    expect(
      isOutingsMonthPublished({ publishedMonths: ['2026/09'] }, '2026/09/14')
    ).toBe(true);
  });

  it('sin ajustes cargados no publica el futuro, pero sí el histórico', () => {
    expect(isOutingsMonthPublished(null, '2026/09')).toBe(false);
    expect(isOutingsMonthPublished(null, '2026/07')).toBe(true);
  });
});

describe('departamentos, donde la unidad es la SEMANA', () => {
  it('las semanas anteriores al corte se dan por publicadas', () => {
    expect(isDeptWeekPublished({ weekOf: '2026/07/27' })).toBe(true);
    expect(deptWeekNeedsPublishing('2026/08/24')).toBe(false);
  });

  it('desde el corte hace falta la marca', () => {
    expect(isDeptWeekPublished({ weekOf: DEPTS_DRAFT_FROM })).toBe(false);
    expect(isDeptWeekPublished({ weekOf: '2026/09/07' })).toBe(false);
    expect(isDeptWeekPublished({ weekOf: '2026/09/07', published: true })).toBe(
      true
    );
  });

  it('una semana retirada vuelve a ser borrador', () => {
    expect(isDeptWeekPublished({ weekOf: '2026/09/07', published: false })).toBe(
      false
    );
  });

  it('sin registro de semana no hay nada publicado', () => {
    // Tampoco hay asignaciones que enseñar, así que da igual por dónde se mire.
    expect(isDeptWeekPublished(undefined)).toBe(false);
    expect(isDeptWeekPublished(null)).toBe(false);
  });
});
