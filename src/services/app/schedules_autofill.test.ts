import { beforeEach, describe, expect, it } from 'vitest';
import { store } from '@states/index';
import { personsState } from '@states/persons';
import { settingsState } from '@states/settings';
import { settingSchema } from '@services/dexie/schema';
import { AssignmentCode } from '@definition/assignment';
import { AssignmentHistoryType } from '@definition/schedules';
import { PersonType } from '@definition/person';
import { schedulesSelectRandomPerson } from './schedules';

/**
 * A quién elige el autocompletado, y por qué.
 *
 * No prueba que «funcione»: prueba la única propiedad que hace que sirva para
 * algo, que es que REPARTA. Un autocompletado que siempre saca a los mismos
 * hermanos no ahorra trabajo — lo esconde, y quien lleva la reunión acaba
 * corrigiéndolo a mano sin saber por qué.
 *
 * Todo lo de aquí salió de un caso real: «me da siempre a los mismos aunque
 * hay más añadidos».
 */

const stamp = '2026-01-01T00:00:00Z';

const persona = (
  uid: string,
  assignments: AssignmentCode[],
  opts: { ausencias?: { start: string; end?: string | null }[] } = {}
) =>
  ({
    person_uid: uid,
    _deleted: { value: false, updatedAt: stamp },
    person_data: {
      person_firstname: { value: uid, updatedAt: stamp },
      person_lastname: { value: uid, updatedAt: stamp },
      person_display_name: { value: uid, updatedAt: stamp },
      male: { value: true, updatedAt: stamp },
      female: { value: false, updatedAt: stamp },
      archived: { value: false, updatedAt: stamp },
      disqualified: { value: false, updatedAt: stamp },
      privileges: [],
      enrollments: [],
      timeAway: (opts.ausencias ?? []).map((a, i) => ({
        id: `${uid}-away-${i}`,
        _deleted: false,
        updatedAt: stamp,
        start_date: a.start,
        end_date: a.end ?? null,
      })),
      assignments: [{ type: 'main', updatedAt: stamp, values: assignments }],
      publisher_baptized: {
        active: { value: true, updatedAt: stamp },
        history: [],
      },
      publisher_unbaptized: {
        active: { value: false, updatedAt: stamp },
        history: [],
      },
      midweek_meeting_student: {
        active: { value: false, updatedAt: stamp },
        history: [],
      },
    },
  }) as unknown as PersonType;

/** Una línea del historial: a fulano le tocó tal cosa tal semana. */
const llevo = (
  uid: string,
  weekOf: string,
  code: AssignmentCode
): AssignmentHistoryType =>
  ({
    id: `${uid}-${weekOf}-${code}`,
    weekOf,
    assignment: {
      code,
      person: uid,
      dataView: 'main',
      title: '',
    },
  }) as AssignmentHistoryType;

/** El historial va de más reciente a más antiguo, como lo construye la app. */
const ordenar = (historial: AssignmentHistoryType[]) =>
  [...historial].sort((a, b) => b.weekOf.localeCompare(a.weekOf));

const PRESIDENCIA = AssignmentCode.MM_Chairman;
const ORACION = AssignmentCode.MM_Prayer;

const sembrar = (personas: PersonType[]) => {
  const settings = structuredClone(settingSchema);
  store.set(settingsState, settings);
  store.set(personsState, personas);
};

describe('a quién elige el autocompletado', () => {
  beforeEach(() => {
    store.set(personsState, []);
  });

  it('reparte: con cuatro hermanos y cuatro semanas, cada uno lleva la parte una vez', () => {
    const uids = ['ana', 'bea', 'ceci', 'dani'];
    sembrar(uids.map((u) => persona(u, [PRESIDENCIA])));

    const historial: AssignmentHistoryType[] = [];
    const elegidos: string[] = [];

    const semanas = ['2026/08/03', '2026/08/10', '2026/08/17', '2026/08/24'];

    for (const week of semanas) {
      const elegido = schedulesSelectRandomPerson({
        type: PRESIDENCIA,
        week,
        history: ordenar(historial),
      });

      expect(elegido).toBeDefined();

      elegidos.push(elegido.person_uid);
      historial.push(llevo(elegido.person_uid, week, PRESIDENCIA));
    }

    // Nadie repite antes de que le haya tocado a todo el mundo.
    expect(new Set(elegidos).size).toBe(4);
  });

  /**
   * El caso que lo destapó, tal cual lo contó Carlos: «no porque Carlos Saca
   * tuvo la presidencia el miércoles pasado entonces no va a tener la lectura
   * de La Atalaya el domingo».
   */
  it('llevar OTRA asignación hace poco no descalifica para esta', () => {
    sembrar([
      // ana lleva sin presidir desde enero: le toca a ella.
      persona('ana', [PRESIDENCIA, ORACION]),
      persona('bea', [PRESIDENCIA, ORACION]),
    ]);

    const historial = ordenar([
      // ana presidió hace mucho; bea, hace nada.
      llevo('ana', '2026/01/05', PRESIDENCIA),
      llevo('bea', '2026/07/27', PRESIDENCIA),
      // y ana llevó una oración la semana pasada, que no tiene nada que ver.
      llevo('ana', '2026/07/27', ORACION),
    ]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/03',
      history: historial,
    });

    expect(elegido?.person_uid).toBe('ana');
  });

  it('la misma asignación dos semanas seguidas, no', () => {
    sembrar([persona('ana', [PRESIDENCIA]), persona('bea', [PRESIDENCIA])]);

    const historial = ordenar([
      llevo('ana', '2026/01/05', PRESIDENCIA),
      llevo('bea', '2026/07/27', PRESIDENCIA),
    ]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/03',
      history: historial,
    });

    expect(elegido?.person_uid).not.toBe('bea');
  });

  it('quien está de ausencia esa semana no sale elegido', () => {
    sembrar([
      persona('ana', [PRESIDENCIA], {
        ausencias: [{ start: '2026/08/01', end: '2026/08/31' }],
      }),
      persona('bea', [PRESIDENCIA]),
    ]);

    const historial = ordenar([
      // A ana le tocaría por la rueda —hace más que no preside—, pero no está.
      llevo('ana', '2026/01/05', PRESIDENCIA),
      llevo('bea', '2026/03/02', PRESIDENCIA),
    ]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/10',
      history: historial,
    });

    expect(elegido?.person_uid).toBe('bea');
  });

  it('pero si TODOS están de ausencia, el hueco se rellena igual', () => {
    // Un hueco vacío en el programa es peor que una repetición: quien lo lee
    // no sabe si es que falta por decidir o es que nadie puede.
    sembrar([
      persona('ana', [PRESIDENCIA], {
        ausencias: [{ start: '2026/08/01', end: '2026/08/31' }],
      }),
      persona('bea', [PRESIDENCIA], {
        ausencias: [{ start: '2026/08/01', end: '2026/08/31' }],
      }),
    ]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/10',
      history: [],
    });

    expect(elegido).toBeDefined();
  });

  it('sin historial no revienta y elige a alguien', () => {
    sembrar([persona('ana', [PRESIDENCIA]), persona('bea', [PRESIDENCIA])]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/03',
      history: [],
    });

    expect(elegido).toBeDefined();
  });

  /**
   * La congregación de verdad, que es donde falla.
   *
   * Con cuatro hermanos y un historial escaso, el motor viejo acierta: le
   * sobran reglas para encontrar a alguien «sin nada últimamente». Pero en una
   * congregación normal TODOS llevan algo cada mes, esas reglas no encuentran a
   * nadie, y decide la penúltima — que se queda con el PRIMERO de la lista que
   * cumpla. Ahí deja de repartir.
   *
   * Ocho hermanos, dieciséis semanas: si reparte, a cada uno le toca dos veces.
   */
  it('con la congregación llena y todos ocupados, sigue repartiendo', () => {
    const uids = ['ana', 'bea', 'ceci', 'dani', 'eva', 'fina', 'gema', 'hilda'];
    sembrar(uids.map((u) => persona(u, [PRESIDENCIA, ORACION])));

    const historial: AssignmentHistoryType[] = [];
    const veces: Record<string, number> = Object.fromEntries(
      uids.map((u) => [u, 0])
    );

    let semana = new Date('2026-01-05T00:00:00');

    for (let i = 0; i < 16; i++) {
      const week = `${semana.getFullYear()}/${String(semana.getMonth() + 1).padStart(2, '0')}/${String(semana.getDate()).padStart(2, '0')}`;

      const elegido = schedulesSelectRandomPerson({
        type: PRESIDENCIA,
        week,
        history: ordenar(historial),
      });

      expect(elegido).toBeDefined();

      veces[elegido.person_uid]++;
      historial.push(llevo(elegido.person_uid, week, PRESIDENCIA));

      // Y todos llevan ADEMÁS una oración cada semana, como en la vida real.
      for (const u of uids) historial.push(llevo(u, week, ORACION));

      semana = new Date(semana.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const cuentas = Object.values(veces);
    const menos = Math.min(...cuentas);
    const mas = Math.max(...cuentas);

    // Reparto perfecto sería 2 y 2. Se admite uno de diferencia por los
    // descartes; más que eso ya no es repartir.
    expect(mas - menos).toBeLessThanOrEqual(1);
    expect(menos).toBeGreaterThan(0);
  });

  /**
   * El miedo de quien lo va a usar mañana: «que vaya a poner a gente
   * repetida».
   *
   * El autocompletado va parte por parte y le pasa a cada llamada el MISMO
   * historial, al que va añadiendo lo que acaba de decidir. Aquí se imita ese
   * bucle: cuatro partes de una misma semana, cuatro hermanos distintos.
   */
  it('en una misma semana nadie sale dos veces', () => {
    const uids = ['ana', 'bea', 'ceci', 'dani'];
    sembrar(uids.map((u) => persona(u, [PRESIDENCIA, ORACION])));

    const week = '2026/08/03';
    const historial: AssignmentHistoryType[] = [];
    const elegidos: string[] = [];

    // Cuatro partes seguidas de la misma semana, como hace el autocompletado.
    for (const tipo of [PRESIDENCIA, ORACION, PRESIDENCIA, ORACION]) {
      const elegido = schedulesSelectRandomPerson({
        type: tipo,
        week,
        history: ordenar(historial),
      });

      expect(elegido).toBeDefined();

      elegidos.push(elegido.person_uid);
      historial.push(llevo(elegido.person_uid, week, tipo));
    }

    expect(new Set(elegidos).size).toBe(4);
  });

  it('sin nadie que pueda llevarla, devuelve nada en vez de reventar', () => {
    sembrar([persona('ana', [ORACION])]);

    const elegido = schedulesSelectRandomPerson({
      type: PRESIDENCIA,
      week: '2026/08/03',
      history: [],
    });

    expect(elegido).toBeUndefined();
  });
});

describe('la carga no se amontona en los mismos', () => {
  /**
   * El caso real que destapó esto, medido en la aplicación con tres meses
   * autocompletados de golpe: entre quince hermanos con EXACTAMENTE la misma
   * elegibilidad, a uno le tocaban siete veces y a otro dos. Ninguna rueda
   * estaba mal: es que cada asignación lleva la suya y nadie miraba la suma.
   *
   * Llevar algo una semana tiene que restar para TODO lo de alrededor, no solo
   * para esa misma asignación.
   */
  it('quien acaba de llevar algo no repite a la semana siguiente', () => {
    const uids = ['ana', 'bea', 'ceci', 'dani'];
    sembrar(uids.map((u) => persona(u, [PRESIDENCIA, ORACION])));

    // Ana presidió esta semana. La que viene le toca descansar, aunque para la
    // oración sea la más atrasada de todas (no la ha llevado nunca).
    const historial = ordenar([llevo('ana', '2026/08/03', PRESIDENCIA)]);

    const elegido = schedulesSelectRandomPerson({
      type: ORACION,
      week: '2026/08/10',
      history: historial,
    });

    expect(elegido.person_uid).not.toBe('ana');
  });

  it('tampoco se le pone algo la semana ANTERIOR a lo que ya tiene', () => {
    // Las asignaciones no se reparten en orden de calendario, sino por tandas:
    // primero la presidencia de todas las semanas, luego las oraciones. Así que
    // al llegar aquí puede haber ya algo puesto MÁS ADELANTE.
    const uids = ['ana', 'bea', 'ceci', 'dani'];
    sembrar(uids.map((u) => persona(u, [PRESIDENCIA, ORACION])));

    const historial = ordenar([llevo('ana', '2026/08/17', PRESIDENCIA)]);

    const elegido = schedulesSelectRandomPerson({
      type: ORACION,
      week: '2026/08/10',
      history: historial,
    });

    expect(elegido.person_uid).not.toBe('ana');
  });

  it('pero un hueco es peor que una repetición: si no queda nadie, se relaja', () => {
    // Con una sola persona posible, el descanso no puede dejar la parte vacía.
    sembrar([persona('ana', [PRESIDENCIA, ORACION])]);

    const historial = ordenar([llevo('ana', '2026/08/03', PRESIDENCIA)]);

    const elegido = schedulesSelectRandomPerson({
      type: ORACION,
      week: '2026/08/10',
      history: historial,
    });

    expect(elegido?.person_uid).toBe('ana');
  });

  it('a igualdad en su rueda, va primero quien lleva más tiempo sin nada', () => {
    // Ninguna de las dos ha llevado nunca la oración, así que su rueda empata.
    // Lo que las separa es lo último que llevaron, sea lo que sea — y sin eso
    // el desempate era el identificador interno, que hacía salir el programa en
    // fila india: los mismos hermanos en el mismo orden en todas las columnas.
    sembrar([
      persona('ana', [PRESIDENCIA, ORACION]),
      persona('bea', [PRESIDENCIA, ORACION]),
    ]);

    const historial = ordenar([
      llevo('ana', '2026/07/06', PRESIDENCIA),
      llevo('bea', '2026/05/04', PRESIDENCIA),
    ]);

    const elegido = schedulesSelectRandomPerson({
      type: ORACION,
      week: '2026/08/10',
      history: historial,
    });

    expect(elegido.person_uid).toBe('bea');
  });
});
