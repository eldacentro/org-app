import { describe, expect, it } from 'vitest';
import {
  buildMeetingRunView,
  buildMidweekRunParts,
  DRIFT_ABANDONADA,
  minutesToTime,
  readMeetingRun,
  runDesfase,
  runDrift,
  RUN_STALE_MS,
  writeMeetingRun,
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
    const porClave = Object.fromEntries(
      parts.map((p) => [p.key, p.seconds / 60])
    );

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

describe('la canción y la oración, cada una por su lado', () => {
  it('el hueco se parte en dos pasos que comparten relojito', () => {
    // «Canción 77 y oración» es un solo hueco de 5 minutos en el programa. Como
    // jw.org dice que la canción dura 2:20, se puede saber cuándo toca pasar a
    // la oración sin que nadie pulse nada.
    const parts = buildMidweekRunParts(SEMANA_NORMAL, {
      cancionInicialSegundos: 140,
    });

    const cancion = parts[0];
    const oracion = parts[1];

    expect(cancion.key).toBe('pgm_start_song');
    expect(oracion.key).toBe('pgm_start_prayer');

    expect(cancion.badgeKey).toBe('pgm_start');
    expect(oracion.badgeKey).toBe('pgm_start');

    expect(cancion.seconds).toBe(140);
    expect(oracion.seconds).toBe(160); // los 5 minutos menos la canción
  });

  it('la oración empieza donde termina la canción', () => {
    const [cancion, oracion] = buildMidweekRunParts(SEMANA_NORMAL, {
      cancionInicialSegundos: 140,
    });

    expect(oracion.startMinutes - cancion.startMinutes).toBeCloseTo(140 / 60);
  });

  it('si la canción se come el hueco entero, NO se parte', () => {
    // Partirlo daría un paso de diez segundos que solo sirve para tener que
    // pulsar otra vez.
    const parts = buildMidweekRunParts(SEMANA_NORMAL, {
      cancionInicialSegundos: 280,
    });

    expect(parts[0].key).toBe('pgm_start');
  });

  it('sin saber lo que dura, se queda como estaba', () => {
    expect(buildMidweekRunParts(SEMANA_NORMAL)[0].key).toBe('pgm_start');
    expect(
      buildMidweekRunParts(SEMANA_NORMAL, { cancionInicialSegundos: 0 })[0].key
    ).toBe('pgm_start');
  });

  it('el relojito del hueco sigue «en curso» en los DOS pasos', () => {
    // Iterando pasos sin más, el segundo pisaba al primero y el hueco se
    // apagaba a mitad de la canción.
    const parts = buildMidweekRunParts(SEMANA_NORMAL, {
      cancionInicialSegundos: 140,
    });

    const base: MeetingRunRecord = {
      weekOf: '2026/08/17',
      dataView: 'main',
      startedAt: instante(19, 45),
      partStartedAt: instante(19, 45),
      index: 0,
      actual: {},
      drift: 0,
    };

    const enCancion = buildMeetingRunView({
      run: base,
      parts,
      formatTime: (t) => t,
    });
    const enOracion = buildMeetingRunView({
      run: { ...base, index: 1 },
      parts,
      formatTime: (t) => t,
    });

    expect(enCancion.status.pgm_start).toBe('current');
    expect(enOracion.status.pgm_start).toBe('current');
  });
});

describe('qué hay que presentar y qué no', () => {
  const porClave = Object.fromEntries(
    buildMidweekRunParts(SEMANA_NORMAL).map((p) => [p.key, p.presented])
  );

  it('las asignaciones se presentan', () => {
    expect(porClave.tgw_talk).toBe(true);
    expect(porClave.tgw_bible_reading).toBe(true);
    expect(porClave.ayf_part1).toBe(true);
    expect(porClave.cbs).toBe(true);
  });

  it('las canciones y las palabras del presidente, no', () => {
    // Pedir dos toques ahí sería estorbar: no hay a nadie a quien anunciar.
    expect(porClave.pgm_start).toBe(false);
    expect(porClave.lc_middle_song).toBe(false);
    expect(porClave.opening_comments).toBe(false);
    expect(porClave.concluding_comments).toBe(false);
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
  const lectura = {
    key: 'tgw_bible_reading',
    badgeKey: 'tgw_bible_reading',
    slotStart: '20:11',
    startMinutes: 20 * 60 + 11,
    seconds: 5 * 60,
    presented: true,
    autoAdvance: false,
  };

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

describe('arrancar lejos de la hora de la reunión', () => {
  /**
   * Probar la aplicación un viernes por la tarde una reunión que fue el jueves,
   * o retomarla horas después. Sin esto, la barra anunciaba «va 331 minutos por
   * delante» y no había forma de verla funcionar fuera de la hora exacta.
   */
  const run: MeetingRunRecord = {
    weekOf: '2026/08/17',
    dataView: 'main',
    startedAt: instante(17, 30),
    partStartedAt: instante(17, 30),
    index: 0,
    actual: {},
    drift: -135,
    offset: -135,
  };

  it('lo que ya estaba desplazado al empezar no cuenta como desfase', () => {
    expect(runDesfase(run)).toBe(0);
  });

  it('lo que se alargue A PARTIR de ahí sí cuenta', () => {
    expect(runDesfase({ ...run, drift: -131 })).toBe(4);
  });

  it('en el caso normal no hay desplazamiento y el desfase es el de siempre', () => {
    expect(runDesfase({ ...run, drift: 3, offset: 0 })).toBe(3);
    expect(runDesfase({ ...run, drift: 3, offset: undefined })).toBe(3);
  });

  it('las horas de las partes se corren con el desplazamiento COMPLETO', () => {
    // Los dos números son distintos a propósito: al hermano se le dice que la
    // reunión va en hora, pero los relojitos tienen que decir cuándo va a pasar
    // cada cosa DE VERDAD, no la hora del programa impreso.
    const parts = buildMidweekRunParts(SEMANA_NORMAL);
    const view = buildMeetingRunView({ run, parts, formatTime: (t) => t });

    expect(view.drift).toBe(0);
    expect(view.shifted.tgw_talk).toBe('17:36'); // 19:51 menos 135 minutos
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

describe('una reunión que se quedó abierta', () => {
  /**
   * Un almacenamiento de mentira, porque esto corre en Node.
   *
   * Merece la pena montarlo: lo que se comprueba aquí es que NO se pierdan las
   * notas, y eso solo se ve llamando a la función de verdad.
   */
  const montarAlmacen = () => {
    const datos = new Map<string, string>();

    globalThis.localStorage = {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
      clear: () => datos.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    return datos;
  };

  const abierta: MeetingRunRecord = {
    weekOf: '2026/08/17',
    dataView: 'main',
    startedAt: instante(19, 45),
    partStartedAt: instante(20, 30),
    index: 4,
    actual: { tgw_talk: 610 },
    drift: 2,
    notes: { tgw_talk: 'Muy bien preparado' },
  };

  it('se da por terminada, y NO se tira con las notas dentro', () => {
    // Lo primero que hice fue borrarla, y eso se llevaba por delante las notas y
    // los tiempos de quien no llegó a pulsar en la última parte — que es el caso
    // más probable: la reunión acaba, se guarda el móvil, y al abrirlo al día
    // siguiente no había nada. Lo único que había que evitar era enseñar un
    // desfase absurdo, y para eso basta con cerrarla.
    montarAlmacen();
    writeMeetingRun(abierta);

    const leida = readMeetingRun(
      abierta.weekOf,
      abierta.dataView,
      abierta.startedAt + RUN_STALE_MS + 1000
    );

    expect(leida?.notes).toEqual({ tgw_talk: 'Muy bien preparado' });
    expect(leida?.actual).toEqual({ tgw_talk: 610 });
    expect(leida?.finishedAt).toBe(abierta.partStartedAt);
  });

  it('y queda cerrada en el almacenamiento, no solo en la respuesta', () => {
    // Si solo se cerrara al vuelo, la siguiente lectura volvería a encontrarse
    // una reunión abierta y a recalcular un desfase de horas.
    const datos = montarAlmacen();
    writeMeetingRun(abierta);

    readMeetingRun(
      abierta.weekOf,
      abierta.dataView,
      abierta.startedAt + RUN_STALE_MS + 1000
    );

    const guardada = JSON.parse(
      datos.get('meetingRun:2026/08/17:main') as string
    );

    expect(guardada.finishedAt).toBe(abierta.partStartedAt);
  });

  it('recién empezada no se toca', () => {
    montarAlmacen();
    writeMeetingRun(abierta);

    const leida = readMeetingRun(
      abierta.weekOf,
      abierta.dataView,
      abierta.startedAt + 60_000
    );

    expect(leida?.finishedAt).toBeUndefined();
  });
});

describe('lo que se guarda', () => {
  it('sin almacenamiento no se rompe nada, simplemente no hay reunión guardada', () => {
    // Un navegador con el almacenamiento capado, o en modo privado. No es un
    // error que enseñar: es que no hay reunión guardada.
    const previo = globalThis.localStorage;

    delete (globalThis as { localStorage?: Storage }).localStorage;

    expect(readMeetingRun('2026/08/17', 'main')).toBeNull();
    expect(() =>
      writeMeetingRun({
        weekOf: '2026/08/17',
        dataView: 'main',
        startedAt: 0,
        partStartedAt: 0,
        index: 0,
        actual: {},
        drift: 0,
      })
    ).not.toThrow();

    globalThis.localStorage = previo;
  });
});
