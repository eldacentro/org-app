import { describe, expect, it } from 'vitest';
import { PersonType, StatusHistoryType } from '@definition/person';
import {
  findOpenPeriod,
  openPeriod,
  toggleBaptizedPublisher,
} from './spiritual_status';

/**
 * Abrir y cerrar periodos de publicador.
 *
 * Los historiales se tocaban desde ocho sitios y cada uno hacía su propio
 * `push`. El resultado en la congregación fueron cinco personas con periodos
 * solapados —Antonio Bernabéu llegó a tener tres— y eso hizo mucho más difícil
 * de ver el fallo de la regla de activo/inactivo. Aquí se fija el
 * comportamiento para que no vuelva.
 */

const periodo = (
  start: string,
  end: string | null = null,
  deleted = false
): StatusHistoryType =>
  ({
    id: `${start}-${end ?? 'abierto'}`,
    _deleted: deleted,
    updatedAt: '2026-07-01T00:00:00.000Z',
    start_date: start,
    end_date: end,
  }) as unknown as StatusHistoryType;

describe('encontrar el periodo abierto', () => {
  it('ignora los que están marcados como borrados', () => {
    const history = [
      periodo('2020-01-01T00:00:00.000Z', null, true),
      periodo('2024-01-01T00:00:00.000Z'),
    ];

    // Sin esto se cerraba el periodo borrado y el de verdad seguía abierto.
    expect(findOpenPeriod(history).start_date).toBe('2024-01-01T00:00:00.000Z');
  });

  it('no encuentra nada si todos están cerrados', () => {
    const history = [periodo('2020-01-01', '2021-01-01')];

    expect(findOpenPeriod(history)).toBeUndefined();
  });

  it('aguanta un historial vacío o ausente', () => {
    expect(findOpenPeriod([])).toBeUndefined();
    expect(findOpenPeriod(undefined)).toBeUndefined();
  });
});

describe('abrir un periodo', () => {
  it('no abre otro si ya hay uno abierto', () => {
    const history = [periodo('2024-01-01T00:00:00.000Z')];

    openPeriod(history);

    expect(history).toHaveLength(1);
  });

  it('sí abre uno si el que había estaba borrado', () => {
    const history = [periodo('2024-01-01T00:00:00.000Z', null, true)];

    openPeriod(history, '2026-07-01T00:00:00.000Z');

    expect(history).toHaveLength(2);
    expect(findOpenPeriod(history).start_date).toBe('2026-07-01T00:00:00.000Z');
  });

  it('nunca empieza antes de que acabe el anterior', () => {
    // El caso de Antonio Bernabéu: cerrado el día 11, reabierto el 16, y el
    // nuevo periodo empezaba el día 1 — solapado con el que ya estaba cerrado.
    const history = [
      periodo('2023-11-01T00:00:00.000Z', '2026-07-11T23:55:05.199Z'),
    ];

    openPeriod(history, '2026-06-30T22:00:00.000Z');

    expect(history).toHaveLength(2);
    expect(findOpenPeriod(history).start_date).toBe('2026-07-11T23:55:05.199Z');
  });

  it('respeta la fecha pedida cuando sí es posterior al cierre anterior', () => {
    const history = [
      periodo('2023-11-01T00:00:00.000Z', '2025-05-31T22:00:00.000Z'),
    ];

    openPeriod(history, '2026-06-30T22:00:00.000Z');

    expect(findOpenPeriod(history).start_date).toBe('2026-06-30T22:00:00.000Z');
  });

  it('compara bien aunque las fechas vengan en formatos distintos', () => {
    // En la congregación conviven '2023/11/01' y '2026-07-11T23:55:05.199Z'.
    // Comparándolas como texto, '2026/05/01' sale MAYOR que '2026-07-11'.
    const history = [periodo('2023/11/01', '2026-07-11T23:55:05.199Z')];

    openPeriod(history, '2026/07/01');

    expect(findOpenPeriod(history).start_date).toBe('2026-07-11T23:55:05.199Z');
  });

  it('el primer periodo de todos sale con la fecha pedida', () => {
    const history: StatusHistoryType[] = [];

    openPeriod(history, '2026-04-30T22:00:00.000Z');

    expect(history).toHaveLength(1);
    expect(history[0].start_date).toBe('2026-04-30T22:00:00.000Z');
    expect(history[0].end_date).toBeNull();
    expect(history[0]._deleted).toBe(false);
  });

  it('un cierre con fecha ilegible no bloquea la apertura', () => {
    const history = [periodo('2023-11-01T00:00:00.000Z', 'vete a saber')];

    openPeriod(history, '2026-07-01T00:00:00.000Z');

    expect(findOpenPeriod(history).start_date).toBe('2026-07-01T00:00:00.000Z');
  });
});

const buildPerson = (history: StatusHistoryType[]): PersonType =>
  ({
    person_uid: 'p1',
    person_data: {
      first_report: { value: null, updatedAt: '2026-07-01T00:00:00.000Z' },
      midweek_meeting_student: {
        active: { value: false, updatedAt: '2026-07-01T00:00:00.000Z' },
        history: [],
      },
      publisher_baptized: {
        active: { value: true, updatedAt: '2026-07-01T00:00:00.000Z' },
        history,
      },
      publisher_unbaptized: {
        active: { value: false, updatedAt: '2026-07-01T00:00:00.000Z' },
        history: [],
      },
    },
  }) as unknown as PersonType;

describe('la casilla «Es publicador actualmente», de punta a punta', () => {
  it('apagarla y volver a encenderla no deja dos periodos pisándose', () => {
    // La secuencia exacta que dejó a Antonio Bernabéu con tres periodos
    // solapados. Se cierra el periodo hoy y se reabre hoy mismo: antes el
    // nuevo empezaba el día 1 del mes, o sea ANTES del cierre que se acababa
    // de escribir.
    const person = buildPerson([periodo('2023-11-01T00:00:00.000Z')]);

    toggleBaptizedPublisher(person, false, false);
    toggleBaptizedPublisher(person, true, false);

    const history = person.person_data.publisher_baptized.history.filter(
      (record) => !record._deleted
    );

    expect(history).toHaveLength(2);

    const [anterior, nuevo] = history;

    expect(anterior.end_date).not.toBeNull();
    expect(nuevo.end_date).toBeNull();
    expect(new Date(nuevo.start_date).getTime()).toBeGreaterThanOrEqual(
      new Date(anterior.end_date).getTime()
    );
  });

  it('encenderla dos veces seguidas no duplica el periodo', () => {
    const person = buildPerson([]);

    toggleBaptizedPublisher(person, true, false);
    toggleBaptizedPublisher(person, true, false);

    expect(
      person.person_data.publisher_baptized.history.filter((r) => !r._deleted)
    ).toHaveLength(1);
  });
});

describe('marcar la casilla de publicador deja fecha', () => {
  it('encender «Publicador bautizado» abre el periodo, no solo la casilla', () => {
    // Sin esto la persona quedaba señalada como publicadora sin una sola
    // fecha, y entonces no había forma de saber si llevaba seis meses sin
    // informar. Es como acabaron Rogelio Beltrán e Israel Angioli.
    const person = buildPerson([]);
    person.person_data.publisher_baptized.active.value = false;

    toggleBaptizedPublisher(person, true, false);

    const abierto = findOpenPeriod(
      person.person_data.publisher_baptized.history
    );

    expect(abierto).toBeDefined();
    expect(abierto.start_date).toBeTruthy();
    expect(person.person_data.first_report.value).toBeTruthy();
  });
});
