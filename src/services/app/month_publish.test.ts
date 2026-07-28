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
  deptMonthNeedsPublishing,
  isDeptMonthPublished,
  isDeptWeekPublished,
  setDeptMonthPublished,
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

describe('departamentos: se publica por MES, pero los datos son por semana', () => {
  const sept = [
    { weekOf: '2026/09/07' },
    { weekOf: '2026/09/14' },
  ] as Parameters<typeof isDeptMonthPublished>[0];

  it('lo anterior al corte se da por publicado', () => {
    expect(isDeptWeekPublished({ weekOf: '2026/07/27' })).toBe(true);
    expect(deptMonthNeedsPublishing('2026/07')).toBe(false);
    expect(isDeptMonthPublished([], '2026/07')).toBe(true);
  });

  it('agosto ya hay que publicarlo (el corte se adelantó)', () => {
    // Una semana de agosto sin marca es un borrador, aunque esté guardada.
    expect(isDeptWeekPublished({ weekOf: '2026/08/03' })).toBe(false);
    expect(
      isDeptWeekPublished({ weekOf: '2026/08/03', published: true })
    ).toBe(true);
    expect(deptMonthNeedsPublishing('2026/08')).toBe(true);
  });

  it('desde el corte hace falta la marca en cada semana', () => {
    expect(deptMonthNeedsPublishing(DEPTS_DRAFT_FROM)).toBe(true);
    expect(isDeptWeekPublished({ weekOf: '2026/09/07' })).toBe(false);
    expect(isDeptWeekPublished({ weekOf: '2026/09/07', published: true })).toBe(
      true
    );
    expect(isDeptWeekPublished({ weekOf: '2026/09/07', published: false })).toBe(
      false
    );
  });

  it('publicar el mes marca TODAS sus semanas', () => {
    const toSave = setDeptMonthPublished(
      sept as never,
      '2026/09',
      true
    );

    expect(toSave.map((w) => w.weekOf)).toEqual(['2026/09/07', '2026/09/14']);
    expect(toSave.every((w) => w.published === true)).toBe(true);
  });

  it('no toca las semanas de otro mes', () => {
    const mezcla = [
      { weekOf: '2026/09/07' },
      { weekOf: '2026/10/05' },
    ] as never;

    expect(
      setDeptMonthPublished(mezcla, '2026/09', true).map((w) => w.weekOf)
    ).toEqual(['2026/09/07']);
  });

  it('no vuelve a guardar lo que ya está como debe', () => {
    // Guardar un registro idéntico despierta la sincronización de toda la
    // congregación para nada.
    const yaPublicadas = [
      { weekOf: '2026/09/07', published: true },
    ] as never;

    expect(setDeptMonthPublished(yaPublicadas, '2026/09', true)).toEqual([]);
  });

  it('con una semana sin publicar, el mes NO está publicado', () => {
    // Así el botón sigue ofreciendo publicar y se puede terminar el mes.
    const aMedias = [
      { weekOf: '2026/09/07', published: true },
      { weekOf: '2026/09/14' },
    ] as Parameters<typeof isDeptMonthPublished>[0];

    expect(isDeptMonthPublished(aMedias, '2026/09')).toBe(false);
  });

  it('un mes sin ninguna semana guardada no está publicado', () => {
    expect(isDeptMonthPublished([], '2026/09')).toBe(false);
  });

  it('sin registro de semana no hay nada publicado', () => {
    expect(isDeptWeekPublished(undefined)).toBe(false);
    expect(isDeptWeekPublished(null)).toBe(false);
  });
});
