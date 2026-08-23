import { describe, expect, it } from 'vitest';
import { SchedWeekType } from '@definition/schedules';
import { syncFromRemote } from '@services/worker/merge';
import {
  outgoingTalkDate,
  reunionPorDelante,
  weekdayFromApi,
} from './meeting_month';
import {
  buildOutgoingMonthGaps,
  collectMeetingMonthAssignees,
  collectMeetingChangesSincePublish,
  countMeetingChangesSincePublish,
  countMeetingMissingParts,
  getMeetingPublishedEntry,
  isMeetingDatePublished,
  isMeetingMonthPublished,
  isMeetingWeekPublished,
  MEETING_DRAFT_FROM,
  meetingMonthNeedsPublishing,
  buildMeetingWeekMissingParts,
  isMeetingWeekUntouched,
  meetingWeeksOfMonth,
  restampMeetingMonthPublished,
  restampMeetingWeeksPublished,
  setMeetingWeeksPublished,
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

  it('confirmar la hojita NO es un cambio del programa', () => {
    // Marcar que un hermano ha confirmado su S-89 sella `updatedAt` como
    // cualquier otra edición —tiene que hacerlo, o la marca no ganaría la fusión
    // y no llegaría a los demás dispositivos—, así que salía «has hecho 3
    // cambios desde entonces» solo por ir poniendo tics. Pero eso no cambia nada
    // de lo que el resto de la congregación tiene delante: solo nos importa a
    // quienes repartimos las asignaciones.
    const cuandoSeConfirmo = '2026-10-03T10:00:00Z';

    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: cuandoSeConfirmo,
              confirmed: true,
              confirmedAt: cuandoSeConfirmo,
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });

  it('mandar la hojita tampoco es un cambio del programa', () => {
    // Lo mismo que confirmar, y más veces: una tarde repartiendo son quince
    // marcas seguidas. Si contaran, el aviso diría «has hecho quince cambios»
    // de un mes que nadie ha tocado, y a la tercera vez deja de leerse.
    const cuandoSeMando = '2026-10-03T10:00:00Z';

    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: cuandoSeMando,
              sent: true,
              sentAt: cuandoSeMando,
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });

  it('confirmar después de mandar sigue sin contar', () => {
    // Las dos marcas conviven en la misma asignación: primero se manda, y
    // luego contesta el hermano. El sello viejo (`sentAt`) ya no coincide con
    // `updatedAt`, pero el nuevo sí — y por eso se miran los dos. Con uno solo,
    // la segunda marca de cada hojita volvía a contar como cambio.
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-04T09:00:00Z',
              sent: true,
              sentAt: '2026-10-03T10:00:00Z',
              confirmed: true,
              confirmedAt: '2026-10-04T09:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(0);
  });

  it('pero editar después de mandar sí cuenta', () => {
    // Cambiar de persona después de haber mandado la hojita es justo lo que
    // hay que republicar: al de antes le llegó una hojita que ya no es suya.
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-2',
              name: 'Luis',
              updatedAt: '2026-10-04T09:00:00Z',
              sent: true,
              sentAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(1);
  });

  it('pero editar DESPUÉS de confirmar sí cuenta', () => {
    // En cuanto se toca cualquier otra cosa, `updatedAt` avanza y deja de
    // coincidir con la fecha de la hojita: ese cambio sí hay que publicarlo.
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              updatedAt: '2026-10-04T09:00:00Z',
              confirmed: true,
              confirmedAt: '2026-10-03T10:00:00Z',
            },
          ],
        },
      }),
    ];

    expect(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    ).toBe(1);
  });

  it('la lista dice QUÉ cambió, y coincide con la cuenta', () => {
    // El aviso dice «has hecho N cambios» y al desplegarlo tienen que salir
    // esos N y no otros. Por eso la cuenta es la longitud de esta misma lista:
    // duplicar la regla en dos sitios es como empiezan a separarse.
    const semanas = [
      week('2026/10/05', {
        midweek: {
          published: publishedMark(true, publicadoEl),
          opening_prayer: [
            {
              type: 'main',
              value: 'uid-1',
              name: 'Ana',
              by: 'Carlos',
              updatedAt: '2026-10-03T10:00:00Z',
            },
          ],
          // Una confirmación de hojita en la misma semana NO debe aparecer.
          chairman_A: [
            {
              type: 'main',
              value: 'uid-2',
              name: 'Luis',
              updatedAt: '2026-10-04T10:00:00Z',
              confirmed: true,
              confirmedAt: '2026-10-04T10:00:00Z',
            },
          ],
        },
      }),
    ];

    const lista = collectMeetingChangesSincePublish(
      semanas,
      FUTURO,
      'midweek',
      'main'
    );

    expect(lista).toHaveLength(
      countMeetingChangesSincePublish(semanas, FUTURO, 'midweek', 'main')
    );
    expect(lista).toHaveLength(1);
    expect(lista[0].name).toBe('Ana');
    expect(lista[0].by).toBe('Carlos');
    expect(lista[0].weekOf).toBe('2026/10/05');
    expect(lista[0].parte.length).toBeGreaterThan(0);
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
  it('recoge a los asignados, una vez por PARTE', () => {
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

    // Ana sale DOS veces porque lleva dos partes esa semana, y eso es lo que
    // hay que decir: el aviso de ausencias nombra la parte concreta, así que
    // agrupar por persona escondería la mitad de los choques. Lo que no se
    // repite es la misma persona en la misma parte (sala principal y aula
    // auxiliar son la misma parte).
    expect(asignados).toStrictEqual([
      {
        weekOf: '2026/10/05',
        uid: 'uid-1',
        name: 'Ana',
        parte: 'Oración de apertura',
      },
      {
        weekOf: '2026/10/05',
        uid: 'uid-1',
        name: 'Ana',
        parte: 'Oración de conclusión',
      },
      {
        weekOf: '2026/10/05',
        uid: 'uid-2',
        name: 'Luis',
        parte: 'Tesoros de la Biblia',
      },
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
    ).toStrictEqual([
      {
        weekOf: '2026/10/05',
        uid: 'uid-9',
        name: 'Pedro',
        parte: 'Discurso saliente',
      },
    ]);

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

describe('el mes de una semana lo decide quien llama, no siempre el lunes', () => {
  /**
   * El caso real: la semana del 31 de agosto de 2026 tiene su reunión de entre
   * semana el 2 de septiembre, y el selector del editor la archiva bajo
   * SEPTIEMBRE. Publicar iba por el lunes, así que esa semana no entraba en
   * «Publicar septiembre» — y peor: la reunión del 1 de octubre es de la semana
   * del 28 de septiembre, así que «Publicar octubre» la dejaba en borrador y la
   * congregación no veía la primera reunión del mes.
   */
  const porFechaDeReunion = (weekOf: string) =>
    ({
      '2026/08/31': '2026/09',
      '2026/09/28': '2026/10',
    })[weekOf] ?? weekOf.slice(0, 7);

  const semanas = [
    week('2026/08/31'), // reunión el 2 de septiembre
    week('2026/09/07'),
    week('2026/09/28'), // reunión el 1 de octubre
    week('2026/10/05'),
  ];

  it('sin decir nada, sigue mandando el lunes (nada cambia)', () => {
    expect(
      meetingWeeksOfMonth(semanas, '2026/09').map((w) => w.weekOf)
    ).toEqual(['2026/09/07', '2026/09/28']);
  });

  it('con la regla del editor, cada semana cae donde se la ve', () => {
    expect(
      meetingWeeksOfMonth(semanas, '2026/09', porFechaDeReunion).map(
        (w) => w.weekOf
      )
    ).toEqual(['2026/08/31', '2026/09/07']);

    expect(
      meetingWeeksOfMonth(semanas, '2026/10', porFechaDeReunion).map(
        (w) => w.weekOf
      )
    ).toEqual(['2026/09/28', '2026/10/05']);
  });

  it('publicar octubre marca la semana que el responsable ve bajo octubre', () => {
    // Es el fallo mudo que esto viene a cerrar: sin la regla, esa semana se
    // quedaba en borrador y nadie veía la primera reunión del mes.
    const toSave = setMeetingMonthPublished(
      semanas,
      '2026/10',
      'midweek',
      true,
      'main',
      '2026-10-01T10:00:00Z',
      porFechaDeReunion
    );

    expect(toSave.map((w) => w.weekOf)).toEqual(['2026/09/28', '2026/10/05']);
  });

  it('ninguna semana se queda sin mes ni cae en dos', () => {
    const meses = ['2026/08', '2026/09', '2026/10'];

    const veces = semanas.map(
      (semana) =>
        meses.filter(
          (mes) =>
            meetingWeeksOfMonth([semana], mes, porFechaDeReunion).length > 0
        ).length
    );

    expect(veces).toEqual([1, 1, 1, 1]);
  });
});

describe('publicar por semanas, que es como está el dato', () => {
  const octubre = [
    week('2026/10/05'),
    week('2026/10/12'),
    week('2026/08/03'), // histórico: no se toca
  ];

  it('marca solo las semanas pedidas', () => {
    const toSave = setMeetingWeeksPublished(
      octubre,
      ['2026/10/12'],
      'midweek',
      true,
      'main',
      '2026-10-01T10:00:00Z'
    );

    expect(toSave.map((w) => w.weekOf)).toEqual(['2026/10/12']);
    expect(
      getMeetingPublishedEntry(toSave[0], 'midweek', 'main')
    ).toStrictEqual({
      type: 'main',
      value: true,
      updatedAt: '2026-10-01T10:00:00Z',
    });
  });

  it('una semana del histórico se salta: ya se da por publicada', () => {
    // Escribirle una marca sería tocar un registro para nada, y aquí eso
    // despierta la sincronización de toda la congregación.
    expect(
      setMeetingWeeksPublished(octubre, ['2026/08/03'], 'midweek', true, 'main')
    ).toEqual([]);
  });

  it('no vuelve a guardar lo que ya está como debe', () => {
    const yaPublicada = [
      week('2026/10/05', {
        midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
      }),
    ];

    expect(
      setMeetingWeeksPublished(
        yaPublicada,
        ['2026/10/05'],
        'midweek',
        true,
        'main'
      )
    ).toEqual([]);

    expect(
      setMeetingWeeksPublished(
        yaPublicada,
        ['2026/10/05'],
        'midweek',
        false,
        'main'
      )
    ).toHaveLength(1);
  });

  it('no muta lo que recibe', () => {
    setMeetingWeeksPublished(octubre, ['2026/10/05'], 'midweek', true, 'main');

    expect(octubre[0].midweek_meeting.published).toBeUndefined();
  });

  it('volver a sellar solo toca las que ya están publicadas', () => {
    const mezcla = [
      week('2026/10/05', {
        midweek: { published: publishedMark(true, '2026-10-01T10:00:00Z') },
      }),
      week('2026/10/12'),
    ];

    const toSave = restampMeetingWeeksPublished(
      mezcla,
      ['2026/10/05', '2026/10/12'],
      'midweek',
      'main',
      '2026-10-09T10:00:00Z'
    );

    expect(toSave.map((w) => w.weekOf)).toEqual(['2026/10/05']);
    expect(
      getMeetingPublishedEntry(toSave[0], 'midweek', 'main')?.updatedAt
    ).toBe('2026-10-09T10:00:00Z');
  });
});

describe('qué le falta a una semana, con nombre', () => {
  it('dice las partes vacías, no un número', () => {
    // «Faltan 3 partes» no dice ni en qué semana ni cuál. Esto sí.
    const faltan = buildMeetingWeekMissingParts(
      week('2026/10/05'),
      'midweek',
      'main'
    );

    expect(faltan).toContain('Presidente');
    expect(faltan).toContain('Oración de apertura');
    expect(faltan).toContain('Lectura de la Biblia');
  });

  it('una semana entera no tiene nada que decir', () => {
    const completa = week('2026/10/05', {
      midweek: {
        chairman: { main_hall: [{ type: 'main', value: 'uid-1' }] },
        opening_prayer: [{ type: 'main', value: 'uid-2' }],
        tgw_talk: [{ type: 'main', value: 'uid-3' }],
        tgw_gems: [{ type: 'main', value: 'uid-4' }],
        tgw_bible_reading: { main_hall: [{ type: 'main', value: 'uid-5' }] },
        lc_cbs: {
          conductor: [{ type: 'main', value: 'uid-6' }],
          reader: [{ type: 'main', value: 'uid-7' }],
        },
        closing_prayer: [{ type: 'main', value: 'uid-8' }],
        week_type: [{ type: 'main', value: 1 }],
      },
    });

    expect(buildMeetingWeekMissingParts(completa, 'midweek', 'main')).toEqual(
      []
    );
  });

  it('una semana cancelada o de asamblea no reclama nada', () => {
    const cancelada = week('2026/10/05', {
      midweek: { canceled: [{ type: 'main', value: true }] },
    });

    const asamblea = week('2026/10/05', {
      midweek: { week_type: [{ type: 'main', value: 5 }] },
    });

    expect(buildMeetingWeekMissingParts(cancelada, 'midweek', 'main')).toEqual(
      []
    );
    expect(buildMeetingWeekMissingParts(asamblea, 'midweek', 'main')).toEqual(
      []
    );
  });

  it('sin semana guardada no se inventa nada', () => {
    expect(buildMeetingWeekMissingParts(undefined, 'midweek', 'main')).toEqual(
      []
    );
  });
});

describe('lo que la congregación resuelve sin apuntarlo no «falta»', () => {
  const finDeSemanaVacio = week('2026/10/05', {
    weekend: {
      chairman: [{ type: 'main', value: '' }],
      opening_prayer: [{ type: 'main', value: '' }],
      speaker: { part_1: [{ type: 'main', value: '' }] },
      wt_study: {
        conductor: [{ type: 'main', value: '' }],
        reader: [{ type: 'main', value: '' }],
      },
      week_type: [{ type: 'main', value: 1 }],
    },
  });

  it('con un conductor de La Atalaya fijo en Ajustes, esa parte no se reclama', () => {
    // El autocompletado NO pone conductor a propósito: casi siempre es el mismo
    // hermano y sale de Ajustes. Sin saberlo, el aviso decía «Falta Conductor de
    // La Atalaya» en TODAS las semanas — y un aviso que sale siempre deja de
    // leerse, llevándose por delante los que sí importan.
    expect(
      buildMeetingWeekMissingParts(finDeSemanaVacio, 'weekend', 'main')
    ).toContain('Conductor de La Atalaya');

    expect(
      buildMeetingWeekMissingParts(finDeSemanaVacio, 'weekend', 'main', {
        wtConductorPorDefecto: true,
      })
    ).not.toContain('Conductor de La Atalaya');
  });

  it('con la oración del fin de semana automática, tampoco', () => {
    // Con ese ajuste puesto, la casilla ni se enseña en pantalla: la lleva quien
    // preside y no se apunta.
    expect(
      buildMeetingWeekMissingParts(finDeSemanaVacio, 'weekend', 'main', {
        oracionFinDeSemanaAutomatica: true,
      })
    ).not.toContain('Oración');
  });

  it('«sin empezar» se mide contra lo que de verdad se pide', () => {
    // Si no, una semana con las tres partes exigibles vacías no contaría como
    // sin empezar solo porque hay dos que no se piden.
    expect(
      isMeetingWeekUntouched(finDeSemanaVacio, 'weekend', 'main', {
        wtConductorPorDefecto: true,
        oracionFinDeSemanaAutomatica: true,
      })
    ).toBe(true);
  });

  it('lo de entre semana no cambia: ahí no hay nada que salga de Ajustes', () => {
    const antes = buildMeetingWeekMissingParts(
      week('2026/10/05'),
      'midweek',
      'main'
    );

    const despues = buildMeetingWeekMissingParts(
      week('2026/10/05'),
      'midweek',
      'main',
      { wtConductorPorDefecto: true, oracionFinDeSemanaAutomatica: true }
    );

    expect(despues).toEqual(antes);
  });
});

/**
 * El día en que un hermano sale a hablar fuera.
 *
 * Esta cuenta se hacía en dos sitios con dos escalas distintas y una de las dos
 * estaba mal, así que a una congregación con la reunión el domingo el historial
 * le ponía el sábado. Las pruebas fijan la escala: la del desplegable del
 * editor, 0 = lunes.
 */
describe('outgoingTalkDate', () => {
  // 2026/11/09 es lunes.
  const lunes = '2026/11/09';

  it('lee el número como lo escribe el desplegable: 6 es domingo', () => {
    expect(outgoingTalkDate(lunes, 6)).toBe('2026/11/15');
  });

  it('5 es sábado', () => {
    expect(outgoingTalkDate(lunes, 5)).toBe('2026/11/14');
  });

  it('el 7 heredado se lee como domingo, no como el lunes siguiente', () => {
    // Los registros viejos guardaron el número crudo de la búsqueda de
    // congregaciones, en escala 1-7. Un 7 solo pudo ser domingo; leerlo como
    // 0-6 daría el lunes de la semana SIGUIENTE, que no es un día de reunión.
    expect(outgoingTalkDate(lunes, 7)).toBe('2026/11/15');
  });

  it('sin día apuntado no se inventa ninguno', () => {
    expect(outgoingTalkDate(lunes, undefined)).toBe('');
    expect(outgoingTalkDate(lunes, null)).toBe('');
    expect(outgoingTalkDate(lunes, '')).toBe('');
  });

  it('el 0 se trata como «sin poner», no como lunes', () => {
    // Ninguna congregación tiene la reunión del fin de semana un lunes, y 0 es
    // el valor con el que nacen varios registros.
    expect(outgoingTalkDate(lunes, 0)).toBe('');
  });

  it('un número imposible tampoco inventa fecha', () => {
    expect(outgoingTalkDate(lunes, 8)).toBe('');
    expect(outgoingTalkDate(lunes, -1)).toBe('');
    expect(outgoingTalkDate(lunes, 3.5)).toBe('');
  });

  it('sin semana no hay fecha', () => {
    expect(outgoingTalkDate('', 6)).toBe('');
  });
});

/**
 * Las dos escalas de día de la semana que conviven en la aplicación.
 *
 * Esta conversión estaba escrita a mano en un sitio y OLVIDADA en otro, y de
 * ahí salieron los registros con un 7 que el desplegable no sabe pintar.
 */
describe('weekdayFromApi', () => {
  it('1 (lunes fuera) es 0 (lunes aquí)', () => {
    expect(weekdayFromApi(1)).toBe(0);
  });

  it('7 (domingo fuera) es 6 (domingo aquí)', () => {
    expect(weekdayFromApi(7)).toBe(6);
  });

  it('el domingo también llega como 0, y también es 6', () => {
    expect(weekdayFromApi(0)).toBe(6);
  });

  it('6 (sábado fuera) es 5 (sábado aquí)', () => {
    expect(weekdayFromApi(6)).toBe(5);
  });

  it('sin número no se inventa día', () => {
    expect(weekdayFromApi(undefined)).toBeUndefined();
    expect(weekdayFromApi(null)).toBeUndefined();
    expect(weekdayFromApi(8)).toBeUndefined();
    expect(weekdayFromApi(-1)).toBeUndefined();
  });

  it('lo convertido lo entiende el lector de fechas', () => {
    // Las dos mitades de la misma historia: lo que se guarda y lo que se lee.
    // 2026/11/09 es lunes; el domingo de esa semana es el 15.
    expect(outgoingTalkDate('2026/11/09', weekdayFromApi(7))).toBe('2026/11/15');
  });
});

/**
 * El aviso de ausencias mira el MES entero, y a mitad de mes eso arrastra
 * reuniones ya celebradas. Salía «hay una asignación en un día que esa persona
 * está fuera — 9 ago» siendo 23 de agosto. Nadie puede arreglar eso, y un aviso
 * que no se puede atender enseña a no mirar los avisos.
 */
describe('reunionPorDelante', () => {
  const hoy = '2026/08/23';

  it('descarta la reunión que ya se celebró', () => {
    expect(reunionPorDelante('2026/08/09', hoy)).toBe(false);
    expect(reunionPorDelante('2026/08/22', hoy)).toBe(false);
  });

  it('mantiene la de hoy: todavía se puede recolocar', () => {
    expect(reunionPorDelante('2026/08/23', hoy)).toBe(true);
  });

  it('mantiene las que quedan del mes', () => {
    expect(reunionPorDelante('2026/08/26', hoy)).toBe(true);
    expect(reunionPorDelante('2026/08/30', hoy)).toBe(true);
    expect(reunionPorDelante('2026/09/02', hoy)).toBe(true);
  });

  it('entiende el guion y la fecha con hora, que es como llegan de sitios distintos', () => {
    expect(reunionPorDelante('2026-08-09', hoy)).toBe(false);
    expect(reunionPorDelante('2026-08-30', hoy)).toBe(true);
    expect(reunionPorDelante('2026/08/30', new Date(2026, 7, 23))).toBe(true);
  });

  it('ante una fecha ilegible avisa igual', () => {
    // Callar un choque real por no saber leer la fecha es el peor de los dos
    // fallos: el aviso de más se ve y se descarta, el de menos no se ve.
    expect(reunionPorDelante('', hoy)).toBe(true);
    expect(reunionPorDelante('yo qué sé', hoy)).toBe(true);
  });

  it('cruza el año sin comparar mal', () => {
    expect(reunionPorDelante('2027/01/03', '2026/12/28')).toBe(true);
    expect(reunionPorDelante('2026/12/20', '2027/01/03')).toBe(false);
  });
});
