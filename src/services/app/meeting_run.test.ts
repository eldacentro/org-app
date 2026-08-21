import { describe, expect, it } from 'vitest';
import {
  buildMeetingRunView,
  buildMidweekRunParts,
  DRIFT_ABANDONADA,
  minutesToTime,
  readMeetingRun,
  runDrift,
  shiftTime,
  timeToMinutes,
  type MeetingRunRecord,
} from './meeting_run';

/**
 * Seguir la reunión en directo.
 *
 * Lo que se comprueba aquí es lo único que puede salir MAL sin que se note: que
 * la lista de partes sea la de esa semana (y no una con puntos que no existen),
 * y que el desfase que se enseña sea el de verdad. Un botón mal puesto se ve; un
 * «vas 1 minuto tarde» cuando vas cinco, no.
 */

/**
 * Una semana normal, con estudio bíblico de congregación y reunión a las 19:45.
 * Los huecos son los de verdad: cuando una parte no tiene material, el cálculo
 * de horas le da a la siguiente la MISMA hora, y así es como se sabe que no
 * existe. Aquí faltan la tercera y cuarta de «Seamos mejores maestros» y la
 * segunda y tercera de «Nuestra vida cristiana».
 */
const SEMANA_NORMAL = {
  pgm_start: '19:45',
  opening_comments: '19:50',
  tgw_talk: '19:51',
  tgw_gems: '20:01',
  tgw_bible_reading: '20:11',
  ayf_part1: '20:16',
  ayf_part2: '20:20',
  ayf_part3: '20:25',
  ayf_part4: '20:25',
  lc_middle_song: '20:25',
  lc_part1: '20:30',
  lc_part2: '20:45',
  lc_part3: '20:45',
  cbs: '20:45',
  concluding_comments: '21:15',
  pgm_end: '21:18',
};

/** La semana de la visita: no hay estudio bíblico y el discurso va al final. */
const SEMANA_VISITA = {
  pgm_start: '19:45',
  opening_comments: '19:50',
  tgw_talk: '19:51',
  tgw_gems: '20:01',
  tgw_bible_reading: '20:11',
  ayf_part1: '20:16',
  ayf_part2: '20:20',
  ayf_part3: '20:25',
  ayf_part4: '20:25',
  lc_middle_song: '20:25',
  lc_part1: '20:30',
  lc_part2: '20:45',
  lc_part3: '20:45',
  concluding_comments: '20:45',
  co_talk: '20:48',
  pgm_end: '21:18',
};

const instante = (hora: number, minuto: number, segundo = 0) =>
  new Date(2026, 7, 19, hora, minuto, segundo).getTime();

describe('la lista de partes', () => {
  it('sale en el orden del programa', () => {
    const parts = buildMidweekRunParts(SEMANA_NORMAL);

    expect(parts.map((p) => p.key)).toEqual([
      'pgm_start',
      'opening_comments',
      'tgw_talk',
      'tgw_gems',
      'tgw_bible_reading',
      'ayf_part1',
      'ayf_part2',
      'lc_middle_song',
      'lc_part1',
      'cbs',
      'concluding_comments',
    ]);
  });

  it('las partes que esa semana no existen se caen solas', () => {
    const claves = buildMidweekRunParts(SEMANA_NORMAL).map((p) => p.key);

    expect(claves).not.toContain('ayf_part3');
    expect(claves).not.toContain('ayf_part4');
    expect(claves).not.toContain('lc_part2');
    expect(claves).not.toContain('lc_part3');
  });

  it('la duración se deduce de cuándo empieza la siguiente', () => {
    const parts = buildMidweekRunParts(SEMANA_NORMAL);
    const porClave = Object.fromEntries(parts.map((p) => [p.key, p.minutes]));

    expect(porClave.pgm_start).toBe(5); // canción y oración
    expect(porClave.opening_comments).toBe(1);
    expect(porClave.tgw_talk).toBe(10);
    expect(porClave.tgw_bible_reading).toBe(5); // 4 de lectura + 1 de consejo
    expect(porClave.cbs).toBe(30);
    expect(porClave.concluding_comments).toBe(3);
  });

  it('en la semana de la visita el discurso va DESPUÉS de las palabras de conclusión', () => {
    const claves = buildMidweekRunParts(SEMANA_VISITA).map((p) => p.key);

    expect(claves).not.toContain('cbs');
    expect(claves.indexOf('concluding_comments')).toBeLessThan(
      claves.indexOf('co_talk')
    );
    expect(claves.at(-1)).toBe('co_talk');
  });

  it('el final del programa no es una parte', () => {
    expect(buildMidweekRunParts(SEMANA_NORMAL).map((p) => p.key)).not.toContain(
      'pgm_end'
    );
  });

  it('sin horas no hay lista, y no revienta', () => {
    expect(buildMidweekRunParts(undefined)).toEqual([]);
    expect(buildMidweekRunParts({})).toEqual([]);
    expect(buildMidweekRunParts({ pgm_start: '19:45' })).toEqual([]);
  });
});

describe('el reloj', () => {
  it('va y vuelve', () => {
    expect(timeToMinutes('20:11')).toBe(1211);
    expect(minutesToTime(1211)).toBe('20:11');
  });

  it('da la vuelta a medianoche en vez de inventarse las 24:30', () => {
    expect(minutesToTime(1470)).toBe('0:30');
    expect(minutesToTime(-30)).toBe('23:30');
  });

  it('correr una hora unos minutos', () => {
    expect(shiftTime('20:16', 2)).toBe('20:18');
    expect(shiftTime('19:58', 5)).toBe('20:03');
    expect(shiftTime('20:16', -3)).toBe('20:13');
  });

  it('lo que no es una hora se devuelve tal cual', () => {
    expect(shiftTime('', 5)).toBe('');
    expect(shiftTime('mediodía', 5)).toBe('mediodía');
  });
});

describe('cuánto tarde va la reunión', () => {
  // La lectura de la Biblia: tenía que ir de 20:11 a 20:16.
  const lectura = { key: 'tgw_bible_reading', start: '20:11', minutes: 5 };

  it('empezada a su hora y sin pasarse, no hay desfase', () => {
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(20, 11),
      now: instante(20, 13),
    });

    expect(drift).toBe(0);
  });

  it('si empieza tarde, arrastra ese retraso aunque todavía no se haya pasado', () => {
    // Empieza a las 20:12 y lleva dos minutos: aún le queda, pero va a terminar
    // a las 20:17 en vez de a las 20:16.
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(20, 12),
      now: instante(20, 14),
    });

    expect(drift).toBe(1);
  });

  it('si el que habla se pasa, cuenta lo que lleva de verdad', () => {
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(20, 12),
      now: instante(20, 19),
    });

    expect(drift).toBe(3);
  });

  it('ir por delante se dice en negativo', () => {
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(20, 8),
      now: instante(20, 9),
    });

    expect(drift).toBe(-3);
  });

  it('nunca se supone que va a terminar antes de tiempo', () => {
    // Lleva diez segundos. Suponer que acaba ya y anunciar que la reunión va
    // cinco minutos por delante sería mentir, y encima animaría a alargarse.
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(20, 11),
      now: instante(20, 11, 10),
    });

    expect(drift).toBe(0);
  });

  it('una reunión que se quedó abierta se pasa del límite de abandono', () => {
    // Pasó de verdad al probarlo: se dejó abierta, se cambió la hora de la
    // reunión en Ajustes y la barra anunciaba «va 331 minutos por delante»,
    // corriendo las horas de todo el programa. Por encima de este límite la
    // pantalla da la reunión por terminada en vez de creerse el número.
    const drift = runDrift({
      part: lectura,
      partStartedAt: instante(14, 0),
      now: instante(14, 2),
    });

    expect(Math.abs(drift)).toBeGreaterThan(DRIFT_ABANDONADA);
  });

  it('sin parte no hay desfase', () => {
    expect(
      runDrift({
        part: undefined,
        partStartedAt: instante(20, 11),
        now: instante(20, 12),
      })
    ).toBe(0);
  });
});

describe('cómo se pinta el programa', () => {
  const parts = buildMidweekRunParts(SEMANA_NORMAL);

  const run: MeetingRunRecord = {
    weekOf: '2026/08/17',
    dataView: 'main',
    startedAt: instante(19, 45),
    partStartedAt: instante(20, 2),
    index: 3, // «Busquemos perlas escondidas»
    actual: {},
    drift: 2,
  };

  const view = buildMeetingRunView({ run, parts, formatTime: (t) => t });

  it('lo de antes queda hecho, lo de ahora en curso, lo demás por venir', () => {
    expect(view.status.tgw_talk).toBe('done');
    expect(view.status.tgw_gems).toBe('current');
    expect(view.status.tgw_bible_reading).toBe('upcoming');
    expect(view.status.cbs).toBe('upcoming');
  });

  it('las partes que quedan enseñan la hora corrida', () => {
    expect(view.shifted.tgw_bible_reading).toBe('20:13'); // 20:11 + 2
    expect(view.shifted.cbs).toBe('20:47'); // 20:45 + 2
  });

  it('la que está sonando y las ya hechas NO se corren', () => {
    // Correrle la hora a algo que ya ha pasado sería reescribir la historia, y
    // a la que suena ahora le quitaría la única hora que importa: la suya.
    expect(view.shifted.tgw_gems).toBeUndefined();
    expect(view.shifted.tgw_talk).toBeUndefined();
  });

  it('sin desfase no se corre ninguna hora', () => {
    const enHora = buildMeetingRunView({
      run: { ...run, drift: 0 },
      parts,
      formatTime: (t) => t,
    });

    expect(enHora.shifted).toEqual({});
  });

  it('terminada la reunión, el programa vuelve a verse como siempre', () => {
    // Y no con todos los relojitos apagados: la página se sigue mirando el
    // resto de la semana y parecería desactivada. Lo que pasó lo cuenta el
    // resumen de abajo, no el programa.
    const terminada = buildMeetingRunView({
      run: { ...run, finishedAt: instante(21, 20) },
      parts,
      formatTime: (t) => t,
    });

    expect(terminada.finished).toBe(true);
    expect(terminada.status).toEqual({});
    expect(terminada.shifted).toEqual({});
  });

  it('el formato de la hora lo pone quien llama', () => {
    // De 24 a 12 horas es una preferencia de la cuenta, y este cálculo no mira
    // ajustes: si lo hiciera, restar horas dejaría de ser fiable.
    const doce = buildMeetingRunView({
      run,
      parts,
      formatTime: (t) => `${t} PM`,
    });

    expect(doce.shifted.cbs).toBe('20:47 PM');
  });
});

describe('lo que se guarda', () => {
  it('sin almacenamiento no se rompe nada, simplemente no hay reunión guardada', () => {
    expect(readMeetingRun('2026/08/17', 'main')).toBeNull();
  });
});
