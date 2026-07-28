import { describe, expect, it } from 'vitest';
import {
  buildExhibitorMonthsStatus,
  EXHIBITORS_DRAFT_FROM,
  isExhibitorMonthPublished,
  monthNeedsPublishing,
  monthOfDate,
  setExhibitorMonthPublished,
} from './exhibitors_publish';

/**
 * Publicación de los meses de exhibidores.
 *
 * Lo que decide esto es si a un hermano le sale un turno en "Mis
 * asignaciones", en el programa semanal y por notificación. Equivocarse por un
 * lado le avisa de algo que nadie ha confirmado; por el otro le esconde un
 * turno que sí le toca.
 */

const settings = (publishedMonths?: string[]) => ({ publishedMonths });

describe('el corte con el histórico', () => {
  it('todo lo anterior al corte se da por publicado', () => {
    // Sin esto, al desplegar el cambio la congregación entera dejaría de ver
    // de golpe los turnos que ya están en marcha.
    expect(isExhibitorMonthPublished(settings(), '2026/07')).toBe(true);
    expect(isExhibitorMonthPublished(settings(), '2026/08')).toBe(true);
    expect(isExhibitorMonthPublished(settings(), '2025/01')).toBe(true);
  });

  it('desde el corte hay que publicar a mano', () => {
    expect(isExhibitorMonthPublished(settings(), EXHIBITORS_DRAFT_FROM)).toBe(
      false
    );
    expect(isExhibitorMonthPublished(settings(), '2026/09')).toBe(false);
    expect(isExhibitorMonthPublished(settings(), '2027/03')).toBe(false);
  });

  it('sabe cuáles son históricos y cuáles hay que publicar', () => {
    expect(monthNeedsPublishing('2026/08')).toBe(false);
    expect(monthNeedsPublishing('2026/09')).toBe(true);
  });
});

describe('publicar y retirar', () => {
  it('un mes publicado sí se ve', () => {
    expect(isExhibitorMonthPublished(settings(['2026/09']), '2026/09')).toBe(
      true
    );
  });

  it('publicar uno no publica los demás', () => {
    const s = settings(['2026/09']);

    expect(isExhibitorMonthPublished(s, '2026/10')).toBe(false);
  });

  it('se puede retirar lo publicado', () => {
    const after = setExhibitorMonthPublished(['2026/09'], '2026/09', false);

    expect(after).toEqual([]);
    expect(isExhibitorMonthPublished(settings(after), '2026/09')).toBe(false);
  });

  it('publicar dos veces no lo duplica', () => {
    let list = setExhibitorMonthPublished([], '2026/09', true);
    list = setExhibitorMonthPublished(list, '2026/09', true);

    expect(list).toEqual(['2026/09']);
  });

  it('la lista queda ordenada', () => {
    let list = setExhibitorMonthPublished([], '2026/11', true);
    list = setExhibitorMonthPublished(list, '2026/09', true);
    list = setExhibitorMonthPublished(list, '2026/10', true);

    expect(list).toEqual(['2026/09', '2026/10', '2026/11']);
  });

  it('no muta la lista que recibe', () => {
    const original = ['2026/09'];
    const after = setExhibitorMonthPublished(original, '2026/10', true);

    expect(original).toEqual(['2026/09']);
    expect(after).toEqual(['2026/09', '2026/10']);
  });
});

describe('formatos de fecha', () => {
  it('acepta una fecha completa y se queda con el mes', () => {
    expect(monthOfDate('2026/09/14')).toBe('2026/09');
    expect(isExhibitorMonthPublished(settings(['2026/09']), '2026/09/14')).toBe(
      true
    );
  });

  it('acepta el guion además de la barra', () => {
    expect(monthOfDate('2026-09')).toBe('2026/09');
  });

  it('un valor ilegible no publica nada', () => {
    // En la duda, NO se enseña: es preferible que un turno no aparezca a que
    // aparezca uno que nadie ha confirmado.
    expect(monthOfDate('vete a saber')).toBe('');
    expect(isExhibitorMonthPublished(settings(), 'vete a saber')).toBe(false);
    expect(isExhibitorMonthPublished(settings(), '')).toBe(false);
  });

  it('un mes ilegible no toca la lista', () => {
    expect(setExhibitorMonthPublished(['2026/09'], 'xxx', true)).toEqual([
      '2026/09',
    ]);
  });
});

describe('sin ajustes cargados', () => {
  it('no revienta y no publica el futuro', () => {
    expect(isExhibitorMonthPublished(null, '2026/09')).toBe(false);
    expect(isExhibitorMonthPublished(undefined, '2026/09')).toBe(false);
  });

  it('pero el histórico se sigue viendo', () => {
    expect(isExhibitorMonthPublished(null, '2026/07')).toBe(true);
  });
});

describe('estado para el diálogo de publicación', () => {
  it('marca cuál es histórico y cuál está publicado', () => {
    const status = buildExhibitorMonthsStatus(settings(['2026/09']), [
      '2026/08',
      '2026/09',
      '2026/10',
    ]);

    expect(status).toEqual([
      { month: '2026/08', published: true, isHistoric: true },
      { month: '2026/09', published: true, isHistoric: false },
      { month: '2026/10', published: false, isHistoric: false },
    ]);
  });
});
