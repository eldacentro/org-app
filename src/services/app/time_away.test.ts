import { describe, expect, it } from 'vitest';
import { TimeAwayType } from '@definition/person';
import {
  buildTimeAwayEntries,
  getTimeAwayDayCount,
  getTimeAwayDuration,
  OPEN_STALE_DAYS,
  PersonTimeAway,
} from './time_away';

/**
 * La vista unificada de ausencias.
 *
 * Todo aquí depende de "hoy", que es exactamente lo que se rompe solo con el
 * paso del tiempo: una clasificación que hoy funciona y en marzo cuenta un día
 * de más no la ve nadie hasta que alguien programa mal una reunión. Por eso la
 * fecha de referencia se pasa siempre a mano.
 */

const HOY = '2026/07/27';

const periodo = (
  id: string,
  start_date: string,
  end_date: string | null,
  extra: Partial<TimeAwayType> = {}
) =>
  ({
    id,
    _deleted: false,
    updatedAt: '',
    start_date,
    end_date,
    comments: '',
    ...extra,
  }) as TimeAwayType;

const persona = (uid: string, timeAway: TimeAwayType[]): PersonTimeAway => ({
  person_uid: uid,
  timeAway,
});

describe('cuánto dura una ausencia', () => {
  it('sin fecha de vuelta es indefinida', () => {
    expect(getTimeAwayDuration('2026/07/20', null)).toBe('open');
    expect(getTimeAwayDuration('2026/07/20', undefined)).toBe('open');
    expect(getTimeAwayDuration('2026/07/20', '')).toBe('open');
  });

  it('con la vuelta el mismo día es un solo día', () => {
    expect(getTimeAwayDuration('2026/07/20', '2026/07/20')).toBe('single');
    // El mismo día escrito de otra forma sigue siendo el mismo día.
    expect(getTimeAwayDuration('2026/07/20', '2026-07-20')).toBe('single');
  });

  it('con la vuelta otro día es un periodo', () => {
    expect(getTimeAwayDuration('2026/07/20', '2026/07/21')).toBe('until');
  });
});

describe('cuenta de días', () => {
  it('cuenta los dos extremos: del 3 al 5 son tres días', () => {
    expect(getTimeAwayDayCount('2026/08/03', '2026/08/05')).toBe(3);
  });

  it('un solo día es un día', () => {
    expect(getTimeAwayDayCount('2026/08/03', '2026/08/03')).toBe(1);
  });

  it('cuenta bien cruzando de mes y de año', () => {
    expect(getTimeAwayDayCount('2026/08/30', '2026/09/02')).toBe(4);
    expect(getTimeAwayDayCount('2026/12/30', '2027/01/02')).toBe(4);
  });

  it('sin vuelta no hay cuenta que dar', () => {
    expect(getTimeAwayDayCount('2026/08/03', null)).toBeNull();
  });

  it('con las fechas al revés tampoco: eso es un error, no una cuenta', () => {
    expect(getTimeAwayDayCount('2026/08/10', '2026/08/03')).toBeNull();
  });
});

describe('clasificación de una ausencia', () => {
  it('está de ausencia AHORA si hoy cae dentro del periodo', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/20', '2026/08/05')])],
      HOY
    );

    expect(entry.status).toBe('ongoing');
    expect(entry.days).toBe(9); // días que faltan para volver
  });

  it('cuenta los extremos: el primer y el último día sigue fuera', () => {
    const primerDia = buildTimeAwayEntries(
      [persona('p1', [periodo('a', HOY, '2026/08/05')])],
      HOY
    );
    const ultimoDia = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/01', HOY)])],
      HOY
    );

    expect(primerDia[0].status).toBe('ongoing');
    expect(ultimoDia[0].status).toBe('ongoing');
    expect(ultimoDia[0].days).toBe(0);
  });

  it('es PRÓXIMA si aún no ha empezado, con los días que faltan', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/08/01', '2026/08/10')])],
      HOY
    );

    expect(entry.status).toBe('upcoming');
    expect(entry.days).toBe(5);
  });

  it('es PASADA en cuanto la fecha de vuelta queda atrás', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/01', '2026/07/26')])],
      HOY
    );

    expect(entry.status).toBe('past');
    expect(entry.days).toBeNull();
  });

  it('sin fecha de vuelta sigue de ausencia, sin cuenta atrás', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/20', null)])],
      HOY
    );

    expect(entry.status).toBe('ongoing');
    expect(entry.days).toBeNull();
    expect(entry.end_date).toBe('');
  });
});

describe('ausencias abiertas que nadie cerró', () => {
  it('marca la que lleva abierta más de lo razonable', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/01/10', null)])],
      HOY
    );

    expect(entry.openStale).toBe(true);
  });

  it('NO marca una ausencia abierta recién empezada', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/20', null)])],
      HOY
    );

    expect(entry.openStale).toBe(false);
  });

  it('el umbral se cuenta desde el inicio, no desde hoy', () => {
    // Justo en el límite todavía no se marca; un día más allá, sí.
    const enElLimite = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/05/28', null)])], // 60 días
      HOY
    );
    const pasado = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/05/27', null)])], // 61 días
      HOY
    );

    expect(OPEN_STALE_DAYS).toBe(60);
    expect(enElLimite[0].openStale).toBe(false);
    expect(pasado[0].openStale).toBe(true);
  });

  it('una ausencia CERRADA y antigua nunca se marca', () => {
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/01/10', '2026/07/20')])],
      HOY
    );

    expect(entry.openStale).toBe(false);
  });
});

describe('datos mal metidos', () => {
  it('un periodo invertido sale como TERMINADO, no como futuro', () => {
    // Con las dos fechas en el futuro y del revés, antes salía "empieza en 36
    // días" sobre un rango imposible: mandaba a buscar el problema al sitio
    // equivocado.
    const [entry] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/09/01', '2026/08/15')])],
      HOY
    );

    expect(entry.status).toBe('past');
    expect(entry.days).toBeNull();
  });

  it('la fecha de referencia se normaliza como las demás', () => {
    // Con guiones y sin normalizar, '-' ordena antes que '/' y TODAS las
    // ausencias pasaban a futuras.
    const conBarras = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/20', '2026/08/05')])],
      '2026/07/27'
    );
    const conGuiones = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026/07/20', '2026/08/05')])],
      '2026-07-27'
    );

    expect(conGuiones).toEqual(conBarras);
    expect(conGuiones[0].status).toBe('ongoing');
  });

  it('una fecha de referencia ilegible no inventa nada', () => {
    expect(
      buildTimeAwayEntries(
        [persona('p1', [periodo('a', '2026/07/20', '2026/08/05')])],
        'ayer'
      )
    ).toEqual([]);
  });
});

describe('qué se deja fuera', () => {
  it('los periodos borrados no aparecen', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [
          periodo('a', '2026/07/20', '2026/08/05', { _deleted: true }),
        ]),
      ],
      HOY
    );

    expect(entries).toHaveLength(0);
  });

  it('las filas a medio rellenar (sin fecha de inicio) no aparecen', () => {
    const entries = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '', null)])],
      HOY
    );

    expect(entries).toHaveLength(0);
  });

  it('las terminadas hace mucho salen de la lista', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [periodo('vieja', '2025/01/01', '2025/01/10')]),
        persona('p2', [periodo('reciente', '2026/07/01', '2026/07/20')]),
      ],
      HOY
    );

    expect(entries.map((e) => e.key)).toEqual(['p2:reciente']);
  });

  it('una persona sin periodos no rompe nada', () => {
    expect(buildTimeAwayEntries([persona('p1', [])], HOY)).toEqual([]);
    expect(buildTimeAwayEntries([persona('p1', undefined)], HOY)).toEqual([]);
  });
});

describe('formatos de fecha', () => {
  it('acepta guiones e ISO con hora, como el resto de la app', () => {
    const [conGuiones] = buildTimeAwayEntries(
      [persona('p1', [periodo('a', '2026-07-20', '2026-08-05')])],
      HOY
    );
    const [conHora] = buildTimeAwayEntries(
      [persona('p2', [periodo('a', '2026-07-20T00:00:00.000Z', null)])],
      HOY
    );

    expect(conGuiones.status).toBe('ongoing');
    expect(conGuiones.start_date).toBe('2026/07/20');
    expect(conHora.status).toBe('ongoing');
  });
});

describe('orden de la lista', () => {
  it('primero las de ahora, luego las próximas, luego las terminadas', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [periodo('pasada', '2026/07/01', '2026/07/20')]),
        persona('p2', [periodo('proxima', '2026/08/01', '2026/08/10')]),
        persona('p3', [periodo('ahora', '2026/07/20', '2026/08/05')]),
      ],
      HOY
    );

    expect(entries.map((e) => e.status)).toEqual([
      'ongoing',
      'upcoming',
      'past',
    ]);
  });

  it('entre las de ahora, primero quien vuelve antes; las abiertas al final', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [periodo('abierta', '2026/07/10', null)]),
        persona('p2', [periodo('vuelve_tarde', '2026/07/10', '2026/09/01')]),
        persona('p3', [periodo('vuelve_pronto', '2026/07/10', '2026/07/29')]),
      ],
      HOY
    );

    expect(entries.map((e) => e.key)).toEqual([
      'p3:vuelve_pronto',
      'p2:vuelve_tarde',
      'p1:abierta',
    ]);
  });

  it('entre las próximas, primero la que empieza antes', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [periodo('tarde', '2026/09/01', '2026/09/10')]),
        persona('p2', [periodo('pronto', '2026/08/01', '2026/08/10')]),
      ],
      HOY
    );

    expect(entries.map((e) => e.key)).toEqual(['p2:pronto', 'p1:tarde']);
  });

  it('entre las terminadas, la más reciente primero', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [periodo('antigua', '2026/06/01', '2026/06/10')]),
        persona('p2', [periodo('reciente', '2026/07/01', '2026/07/20')]),
      ],
      HOY
    );

    expect(entries.map((e) => e.key)).toEqual(['p2:reciente', 'p1:antigua']);
  });
});

describe('varias ausencias de la misma persona', () => {
  it('cada periodo es una entrada propia, con su clave única', () => {
    const entries = buildTimeAwayEntries(
      [
        persona('p1', [
          periodo('a', '2026/07/20', '2026/08/05'),
          periodo('b', '2026/09/01', '2026/09/10'),
        ]),
      ],
      HOY
    );

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.key)).toEqual(['p1:a', 'p1:b']);
    expect(entries.map((e) => e.status)).toEqual(['ongoing', 'upcoming']);
  });
});
