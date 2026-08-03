import { describe, expect, it } from 'vitest';
import { SchedWeekType } from '@definition/schedules';
import { syncFromRemote } from '@services/worker/merge';
import {
  buildOutgoingMonthGaps,
  collectMeetingMonthAssignees,
  countMeetingChangesSincePublish,
  countMeetingMissingParts,
  getMeetingPublishedEntry,
  isMeetingDatePublished,
  isMeetingMonthPublished,
  isMeetingWeekPublished,
  MEETING_DRAFT_FROM,
  meetingMonthNeedsPublishing,
  restampMeetingMonthPublished,
  setMeetingMonthPublished,
} from './meetings_publish';

/**
 * Borrador / publicado en los programas de reunión.
 *
 * Decide si a un hermano le sale su parte en "Mis asignaciones", en el programa
 * semanal y por notificación. Equivocarse por un lado le avisa de algo que
 * nadie ha confirmado; por el otro le esconde algo que sí le toca — y eso no se
 * ve como un fallo, se ve como un programa que desaparece.
 */

const HISTORICO = '2026/08';
const FUTURO = '2026/10';

/** Una semana con lo justo para las pruebas. */
const week = (
  weekOf: string,
  extra: {
    midweek?: Record<string, unknown>;
    weekend?: Record<string, unknown>;
  } = {}
) =>
  ({
    weekOf,
    midweek_meeting: {
      opening_prayer: [
        {
          type: 'main',
          value: '',
          name: '',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      week_type: [
        { type: 'main', value: 1, updatedAt: '2026-09-01T00:00:00Z' },
      ],
      ...(extra.midweek ?? {}),
    },
    weekend_meeting: {
      chairman: [
        {
          type: 'main',
          value: '',
          name: '',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      public_talk_type: [
        {
          type: 'main',
          value: 'visitingSpeaker',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      outgoing_talks: [],
      ...(extra.weekend ?? {}),
    },
  }) as unknown as SchedWeekType;

const publishedMark = (value: boolean, updatedAt: string, type = 'main') => [
  { type, value, updatedAt },
];

describe('el corte: lo que hoy se ve se sigue viendo', () => {
  it('los tres programas arrancan en el mismo mes', () => {
    // Si un día se separan, que sea porque alguien lo decide, no por descuido.
    expect(MEETING_DRAFT_FROM.midweek).toBe(MEETING_DRAFT_FROM.weekend);
    expect(MEETING_DRAFT_FROM.midweek).toBe(MEETING_DRAFT_FROM.outgoing);
  });

  it('agosto de 2026 nunca puede volverse borrador', () => {
    // La regla de oro del encargo: lo que la congregación ya está usando no
    // desaparece al desplegar. Agosto está en marcha —las reuniones son estas
    // semanas—, así que el corte no puede bajar de septiembre por mucho que se
    // quiera apretar la tuerca.
    expect(MEETING_DRAFT_FROM.midweek >= '2026/09').toBe(true);
  });

  it('todo lo anterior al corte se da por publicado, sin marca ninguna', () => {
    expect(meetingMonthNeedsPublishing(HISTORICO, 'midweek')).toBe(false);
    expect(isMeetingWeekPublished(week('2026/08/03'), 'midweek', 'main')).toBe(
      true
    );
    expect(isMeetingWeekPublished(week('2026/08/03'), 'weekend', 'main')).toBe(
      true
    );
    expect(isMeetingWeekPublished(week('2026/08/03'), 'outgoing', 'main')).toBe(
      true
    );
    expect(
      isMeetingMonthPublished(
        [week('2026/08/03')],
        HISTORICO,
        'midweek',
        'main'
      )
    ).toBe(true);
  });

  it('septiembre de 2026 SÍ hay que publicarlo: es lo que se vino a arreglar', () => {
    // El caso real que destapó esto: el responsable hizo septiembre entero y no
    // le dio a publicar, y el programa le salía igual a toda la congregación.
    expect(meetingMonthNeedsPublishing('2026/09', 'midweek')).toBe(true);
    expect(meetingMonthNeedsPublishing('2026/09', 'weekend')).toBe(true);
    expect(meetingMonthNeedsPublishing('2026/09', 'outgoing')).toBe(true);

    // Y sin marca de publicación, no se ve.
    expect(isMeetingWeekPublished(week('2026/09/07'), 'midweek', 'main')).toBe(
      false
    );
  });

  it('desde el corte hay que publicar a mano', () => {
    expect(meetingMonthNeedsPublishing(FUTURO, 'midweek')).toBe(true);
    expect(isMeetingWeekPublished(week('2026/10/05'), 'midweek', 'main')).toBe(
      false
    );
  });

  it('una fecha sin semana guardada no está publicada (pero el histórico sí)', () => {
    expect(isMeetingDatePublished([], '2026/10/05', 'midweek', 'main')).toBe(
      false
    );
    expect(isMeetingDatePublished([], '2026/08/03', 'midweek', 'main')).toBe(
      true
    );
  });

  it('en la duda NO se enseña', () => {
    expect(isMeetingWeekPublished(undefined, 'midweek', 'main')).toBe(false);
    expect(isMeetingWeekPublished(week(''), 'midweek', 'main')).toBe(false);
    expect(isMeetingMonthPublished([], FUTURO, 'midweek', 'main')).toBe(false);
    expect(isMeetingMonthPublished([], 'vete a saber', 'midweek', 'main')).toBe(
      false
    );
  });
});

describe('publicar un mes', () => {
  const octubre = [
    week('2026/10/05'),
    week('2026/10/12'),
    week('2026/11/02'), // otro mes: no se toca
  ];

  it('marca todas las semanas del mes y ninguna más', () => {
    const toSave = setMeetingMonthPublished(
      octubre,
      FUTURO,
      'midweek',
      true,
      'main',
      '2026-10-01T10:00:00Z'
    );

    expect(toSave.map((record) => record.weekOf)).toEqual([
      '2026/10/05',
      '2026/10/12',
    ]);
    expect(
      getMeetingPublishedEntry(toSave[0], 'midweek', 'main')
    ).toStrictEqual({
      type: 'main',
      value: true,
      updatedAt: '2026-10-01T10:00:00Z',
    });
  });

  it('no muta lo que recibe', () => {
    setMeetingMonthPublished(octubre, FUTURO, 'midweek', true, 'main');

    expect(octubre[0].midweek_meeting.published).toBeUndefined();
  });

  it('un mes a medias NO cuenta como publicado', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
      }),
      week('2026/10/12'),
    ];

    expect(isMeetingMonthPublished(semanas, FUTURO, 'midweek', 'main')).toBe(
      false
    );
    // ...pero la semana que sí se publicó se ve.
    expect(isMeetingWeekPublished(semanas[0], 'midweek', 'main')).toBe(true);
    expect(isMeetingWeekPublished(semanas[1], 'midweek', 'main')).toBe(false);
  });

  it('publicar solo devuelve lo que CAMBIA', () => {
    // Guardar un registro idéntico despierta la sincronización de toda la
    // congregación para nada (CLAUDE.md).
    const yaPublicado = [
      week('2026/10/05', {
        midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
      }),
    ];

    expect(
      setMeetingMonthPublished(yaPublicado, FUTURO, 'midweek', true, 'main')
    ).toEqual([]);

    expect(
      setMeetingMonthPublished(yaPublicado, FUTURO, 'midweek', false, 'main')
    ).toHaveLength(1);
  });

  it('retirar deja la marca en falso, no la borra', () => {
    const yaPublicado = [
      week('2026/10/05', {
        midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
      }),
    ];

    const [retirada] = setMeetingMonthPublished(
      yaPublicado,
      FUTURO,
      'midweek',
      false,
      'main',
      '2026-10-02T10:00:00Z'
    );

    // Borrarla dejaría que la copia vieja del servidor la resucitara.
    expect(getMeetingPublishedEntry(retirada, 'midweek', 'main')).toStrictEqual(
      {
        type: 'main',
        value: false,
        updatedAt: '2026-10-02T10:00:00Z',
      }
    );
    expect(isMeetingWeekPublished(retirada, 'midweek', 'main')).toBe(false);
  });

  it('cada programa se publica por su cuenta', () => {
    const [semana] = setMeetingMonthPublished(
      [week('2026/10/05')],
      FUTURO,
      'weekend',
      true,
      'main'
    );

    expect(isMeetingWeekPublished(semana, 'weekend', 'main')).toBe(true);
    expect(isMeetingWeekPublished(semana, 'midweek', 'main')).toBe(false);
    expect(isMeetingWeekPublished(semana, 'outgoing', 'main')).toBe(false);
  });

  it('los discursos salientes no se publican con el fin de semana', () => {
    const [semana] = setMeetingMonthPublished(
      [week('2026/10/05')],
      FUTURO,
      'outgoing',
      true,
      'main'
    );

    expect(isMeetingWeekPublished(semana, 'outgoing', 'main')).toBe(true);
    expect(isMeetingWeekPublished(semana, 'weekend', 'main')).toBe(false);
  });

  it('cada vista de datos publica lo suyo, y no hereda de la otra', () => {
    const [semana] = setMeetingMonthPublished(
      [week('2026/10/05')],
      FUTURO,
      'midweek',
      true,
      'main'
    );

    expect(isMeetingWeekPublished(semana, 'midweek', 'main')).toBe(true);
    expect(isMeetingWeekPublished(semana, 'midweek', 'grupo')).toBe(false);

    const [conGrupo] = setMeetingMonthPublished(
      [semana],
      FUTURO,
      'midweek',
      true,
      'grupo'
    );

    expect(conGrupo.midweek_meeting.published).toHaveLength(2);
    expect(isMeetingWeekPublished(conGrupo, 'midweek', 'main')).toBe(true);
  });
});

describe('la marca sobrevive a la sincronización', () => {
  // El motivo de que la marca sea {type, value, updatedAt} y no un booleano
  // suelto: los primitivos los gana SIEMPRE el servidor, y un "publicado" que
  // se revierte solo deja a la congregación sin ver un mes que ya estaba fuera.
  it('lo publicado aquí no lo pisa una copia vieja del servidor', () => {
    const local = week('2026/10/05', {
      midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
    });

    const remoto = week('2026/10/05', {
      midweek: { published: publishedMark(false, '2026-09-30T10:00:00Z') },
    });

    const fusionado = syncFromRemote(structuredClone(local), remoto);

    expect(isMeetingWeekPublished(fusionado, 'midweek', 'main')).toBe(true);
  });

  it('lo publicado en otro dispositivo llega hasta aquí', () => {
    const local = week('2026/10/05');

    const remoto = week('2026/10/05', {
      midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
    });

    const fusionado = syncFromRemote(structuredClone(local), remoto);

    expect(isMeetingWeekPublished(fusionado, 'midweek', 'main')).toBe(true);
  });

  it('lo retirado más tarde gana a lo publicado antes', () => {
    const local = week('2026/10/05', {
      midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
    });

    const remoto = week('2026/10/05', {
      midweek: { published: publishedMark(false, '2026-10-02T10:00:00Z') },
    });

    const fusionado = syncFromRemote(structuredClone(local), remoto);

    expect(isMeetingWeekPublished(fusionado, 'midweek', 'main')).toBe(false);
  });
});

describe('avisar de lo que se ha cambiado desde que se publicó', () => {
  const publicadoEl = '2026-10-01T10:00:00Z';

  it('cuenta lo tocado después, y no la propia marca', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(1);
  });

  it('lo anterior a la publicación no es un cambio', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-09-20T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });

  it('una semana sin publicar no tiene nada que avisar', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });

  it('un cambio en los salientes no es un cambio del fin de semana', () => {
    const semanas = [
      week('2026/10/05', {
        weekend: {
          published: publishedMark(true, publicadoEl),
          outgoing_talks: [
            {
              id: 'talk-1',
              type: 'main',
              value: 'uid-9',
              _deleted: false,
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'weekend', 'main')
    ).toBe(0);
  });

  it('lo de otra vista de datos no cuenta', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'grupo',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });
});

describe('volver a publicar un mes que ya lo estaba', () => {
  it('pone la fecha al día y así el aviso de cambios se puede cerrar', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, '2026-10-01T10:00:00Z'),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(1);

    const reselladas = restampMeetingMonthPublished(
      semanas,
      FUTURO,
      'midweek',
      'main',
      '2026-10-04T10:00:00Z'
    );

    expect(
      countMeetingChangesSincePublish(reselladas, FUTURO, 'midweek', 'main')
    ).toBe(0);
    expect(isMeetingWeekPublished(reselladas[0], 'midweek', 'main')).toBe(true);
  });

  it('una semana sin publicar no se toca', () => {
    expect(
      restampMeetingMonthPublished(
        [week('2026/10/05')],
        FUTURO,
        'midweek',
        'main'
      )
    ).toEqual([]);
  });
});

describe('qué le falta al mes', () => {
  const persona = (value: string) => [
    { type: 'main', value, name: '', updatedAt: '2026-10-01T00:00:00Z' },
  ];

  const semanaCompleta = (weekOf: string) =>
    week(weekOf, {
      midweek: {
        chairman: { main_hall: persona('uid-1') },
        opening_prayer: persona('uid-2'),
        tgw_talk: persona('uid-3'),
        tgw_gems: persona('uid-4'),
        tgw_bible_reading: { main_hall: persona('uid-5') },
        lc_cbs: { conductor: persona('uid-6'), reader: persona('uid-7') },
        closing_prayer: persona('uid-8'),
      },
    });

  it('un mes terminado no tiene nada que avisar', () => {
    expect(
      countMeetingMissingParts(
        [semanaCompleta('2026/10/05')],
        FUTURO,
        'midweek',
        'main'
      )
    ).toBe(0);
  });

  it('cuenta las partes principales sin nadie', () => {
    const semana = semanaCompleta('2026/10/05');
    semana.midweek_meeting.tgw_talk[0].value = '';
    semana.midweek_meeting.lc_cbs.reader[0].value = '';

    expect(countMeetingMissingParts([semana], FUTURO, 'midweek', 'main')).toBe(
      2
    );
  });

  it('una semana cancelada no reclama a nadie', () => {
    const semana = week('2026/10/05', {
      midweek: {
        canceled: [{ type: 'main', value: true, updatedAt: '' }],
      },
    });

    expect(countMeetingMissingParts([semana], FUTURO, 'midweek', 'main')).toBe(
      0
    );
  });

  it('una semana de asamblea tampoco', () => {
    const semana = week('2026/10/05', {
      midweek: {
        week_type: [{ type: 'main', value: 3, updatedAt: '' }],
      },
    });

    expect(countMeetingMissingParts([semana], FUTURO, 'midweek', 'main')).toBe(
      0
    );
  });

  it('los discursos salientes no cuentan puestos vacíos: no aplica', () => {
    expect(
      countMeetingMissingParts([week('2026/10/05')], FUTURO, 'outgoing', 'main')
    ).toBe(0);
  });
});

describe('qué le falta a un mes de discursos salientes', () => {
  const salida = (extra: Record<string, unknown> = {}) => ({
    id: 'talk-1',
    type: 'main',
    _deleted: false,
    updatedAt: '2026-10-01T00:00:00Z',
    value: 'uid-9',
    public_talk: 42,
    congregation: { name: 'Elda Norte' },
    ...extra,
  });

  it('una salida completa no falta nada', () => {
    const semanas = [
      week('2026/10/05', { weekend: { outgoing_talks: [salida()] } }),
    ];

    expect(buildOutgoingMonthGaps(semanas, FUTURO, 'main')).toStrictEqual({
      total: 1,
      withoutSpeaker: 0,
      withoutTalk: 0,
      withoutCongregation: 0,
    });
  });

  it('cuenta sin orador, sin discurso y sin congregación (que es sin fecha)', () => {
    const semanas = [
      week('2026/10/05', {
        weekend: {
          outgoing_talks: [
            salida({ id: 'a', value: '' }),
            salida({ id: 'b', public_talk: null }),
            salida({ id: 'c', congregation: { name: '' } }),
          ],
        },
      }),
    ];

    expect(buildOutgoingMonthGaps(semanas, FUTURO, 'main')).toStrictEqual({
      total: 3,
      withoutSpeaker: 1,
      withoutTalk: 1,
      withoutCongregation: 1,
    });
  });

  it('una salida borrada no cuenta', () => {
    const semanas = [
      week('2026/10/05', {
        weekend: { outgoing_talks: [salida({ _deleted: true })] },
      }),
    ];

    expect(buildOutgoingMonthGaps(semanas, FUTURO, 'main').total).toBe(0);
  });
});

describe('a quién se ha puesto en el mes (para el aviso de ausencias)', () => {
  it('recoge a los asignados, sin repetir persona y semana', () => {
    const semanas = [
      week('2026/10/05', {
        midweek: {
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
          closing_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
          tgw_talk: [
            {
              type: 'main',
              value: 'uid-2',
              name: 'Luis',
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
        },
      }),
    ];

    const asignados = collectMeetingMonthAssignees(
      semanas,
      FUTURO,
      'midweek',
      'main'
    );

    expect(asignados).toStrictEqual([
      { weekOf: '2026/10/05', uid: 'uid-1', name: 'Ana' },
      { weekOf: '2026/10/05', uid: 'uid-2', name: 'Luis' },
    ]);
  });

  it('no confunde un ajuste de la semana con una persona', () => {
    // `week_type`, `canceled` y `public_talk_type` llevan la misma forma
    // {type, value, updatedAt} que una asignación. Sin cuidado, el aviso de
    // ausencias iría a buscar la ficha de alguien llamado "visitingSpeaker".
    expect(
      collectMeetingMonthAssignees(
        [week('2026/10/05')],
        FUTURO,
        'midweek',
        'main'
      )
    ).toEqual([]);

    expect(
      collectMeetingMonthAssignees(
        [week('2026/10/05')],
        FUTURO,
        'weekend',
        'main'
      )
    ).toEqual([]);
  });

  it('los salientes traen su orador y su nombre guardado', () => {
    const semanas = [
      week('2026/10/05', {
        weekend: {
          outgoing_talks: [
            {
              id: 'talk-1',
              type: 'main',
              value: 'uid-9',
              personName: 'Pedro',
              _deleted: false,
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      collectMeetingMonthAssignees(semanas, FUTURO, 'outgoing', 'main')
    ).toStrictEqual([{ weekOf: '2026/10/05', uid: 'uid-9', name: 'Pedro' }]);

    // Y no salen al mirar el fin de semana, que es otro programa.
    expect(
      collectMeetingMonthAssignees(semanas, FUTURO, 'weekend', 'main')
    ).toEqual([]);
  });

  it('un saliente borrado no cuenta', () => {
    const semanas = [
      week('2026/10/05', {
        weekend: {
          outgoing_talks: [
            {
              id: 'talk-1',
              type: 'main',
              value: 'uid-9',
              _deleted: true,
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      collectMeetingMonthAssignees(semanas, FUTURO, 'outgoing', 'main')
    ).toEqual([]);
  });
});
