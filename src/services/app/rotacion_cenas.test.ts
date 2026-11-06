import { describe, expect, it } from 'vitest';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { SchedWeekType } from '@definition/schedules';
import { Week } from '@definition/week_type';
import { SpeakerDinnerRotationType } from '@definition/speaker_invitation';
import { calcularTurnosCena, grupoPorSemana } from './rotacion_cenas';

const grupo = (id: string, sort_index: number) =>
  ({
    group_id: id,
    group_data: { _deleted: false, sort_index, name: '', members: [] },
  }) as FieldServiceGroupType;

const GRUPOS = [grupo('g1', 0), grupo('g2', 1), grupo('g3', 2)];

const ROTACION: SpeakerDinnerRotationType = {
  fechaInicio: '2026-11-01T00:00:00.000Z',
  grupoInicio: 'g1',
  gruposParticipantes: ['g1', 'g2', 'g3'],
  updatedAt: '',
};

const inv = (weekOf: string, cena?: boolean | null) => ({
  weekOf,
  respuesta:
    cena === null || cena === undefined
      ? undefined
      : {
          asistira: true,
          cena,
          comensales: cena ? 3 : 0,
          comentario: '',
          respondidoEl: '',
        },
});

const turnos = (invitaciones: ReturnType<typeof inv>[], rotacion = ROTACION) =>
  grupoPorSemana({ invitaciones, rotacion, grupos: GRUPOS });

/**
 * Lo que distingue esta rotación de la de Limpieza: el turno lo gasta la CENA,
 * no el calendario. Si el orador no se queda, ese grupo sigue teniendo turno.
 */
describe('la rotación de cenas del orador', () => {
  it('va pasando de grupo cuando sí se cena', () => {
    const t = turnos([
      inv('2026/11/01', true),
      inv('2026/11/08', true),
      inv('2026/11/15', true),
      inv('2026/11/22', true),
    ]);

    expect(t.get('2026/11/01')).toBe('g1');
    expect(t.get('2026/11/08')).toBe('g2');
    expect(t.get('2026/11/15')).toBe('g3');
    expect(t.get('2026/11/22')).toBe('g1');
  });

  // Es el caso que se pidió: «si el discursante no se queda a cenar, que el
  // siguiente le toque al mismo grupo y así hasta que lo tenga».
  it('NO salta de grupo si el orador no se queda', () => {
    const t = turnos([
      inv('2026/11/01', false),
      inv('2026/11/08', false),
      inv('2026/11/15', true),
      inv('2026/11/22', true),
    ]);

    expect(t.get('2026/11/01')).toBe('g1');
    expect(t.get('2026/11/08')).toBe('g1');
    expect(t.get('2026/11/15')).toBe('g1');
    expect(t.get('2026/11/22')).toBe('g2');
  });

  it('una semana sin contestar todavía no gasta turno', () => {
    const t = turnos([inv('2026/11/01', null), inv('2026/11/08', true)]);

    expect(t.get('2026/11/01')).toBe('g1');
    expect(t.get('2026/11/08')).toBe('g1');
  });

  it('empieza por el grupo que se diga, no siempre por el primero', () => {
    const t = turnos([inv('2026/11/01', true), inv('2026/11/08', true)], {
      ...ROTACION,
      grupoInicio: 'g3',
    });

    expect(t.get('2026/11/01')).toBe('g3');
    expect(t.get('2026/11/08')).toBe('g1');
  });

  it('un cambio a mano manda, y es ese el turno que se gasta', () => {
    const t = turnos(
      [inv('2026/11/01', true), inv('2026/11/08', true)],
      { ...ROTACION, overrides: { '2026/11/01': 'g3' } }
    );

    expect(t.get('2026/11/01')).toBe('g3');
    // Después del 3 viene el 1, no el 2: la rotación sigue desde donde se dejó
    // de verdad, no desde donde habría estado si nadie hubiera tocado nada.
    expect(t.get('2026/11/08')).toBe('g1');
  });

  it('lo anterior a la fecha de inicio no cuenta', () => {
    const t = turnos([inv('2026/10/01', true), inv('2026/11/01', true)]);

    expect(t.has('2026/10/01')).toBe(false);
    expect(t.get('2026/11/01')).toBe('g1');
  });

  it('sin rotación puesta, sin grupos o sin invitaciones, no inventa nada', () => {
    expect(grupoPorSemana({ invitaciones: [], rotacion: null, grupos: GRUPOS }).size).toBe(0);
    expect(turnos([]).size).toBe(0);
    expect(
      grupoPorSemana({
        invitaciones: [inv('2026/11/01', true)],
        rotacion: ROTACION,
        grupos: [],
      }).size
    ).toBe(0);
  });

  // En la semana de la visita del superintendente el discurso lo da él: no hay
  // orador visitante ni cena. Si gastara turno, un grupo perdería el suyo por
  // una semana en la que no había nada que acoger.
  it('la semana de la visita del superintendente no cuenta ni gasta turno', () => {
    const programas = [
      {
        weekOf: '2026/11/08',
        weekend_meeting: { week_type: [{ type: 'main', value: Week.CO_VISIT }] },
      },
    ] as unknown as SchedWeekType[];

    const t = grupoPorSemana({
      invitaciones: [
        inv('2026/11/01', true),
        inv('2026/11/08', true),
        inv('2026/11/15', true),
      ],
      rotacion: ROTACION,
      grupos: GRUPOS,
      schedules: programas,
    });

    expect(t.get('2026/11/01')).toBe('g1');
    expect(t.has('2026/11/08')).toBe(false);
    // El turno sigue donde estaba: después del 1 va el 2, no el 3.
    expect(t.get('2026/11/15')).toBe('g2');
  });

  it('un grupo borrado sale de la rotación', () => {
    const conBorrado = [
      GRUPOS[0],
      { ...GRUPOS[1], group_data: { ...GRUPOS[1].group_data, _deleted: true } },
      GRUPOS[2],
    ] as FieldServiceGroupType[];

    const t = grupoPorSemana({
      invitaciones: [inv('2026/11/01', true), inv('2026/11/08', true)],
      rotacion: ROTACION,
      grupos: conBorrado,
    });

    expect(t.get('2026/11/01')).toBe('g1');
    expect(t.get('2026/11/08')).toBe('g3');
  });
});

/**
 * Que a ningún superintendente se le avise de una cena que no es suya: solo
 * cuenta la invitación vigente de cada semana, y una cena no se da por suya
 * hasta que las semanas anteriores están resueltas.
 */
describe('la cena que se le enseña al superintendente', () => {
  const calcular = (
    invitaciones: Parameters<typeof calcularTurnosCena>[0]['invitaciones'],
    hoy?: string,
    rotacion = ROTACION,
    grupos = GRUPOS
  ) => calcularTurnosCena({ invitaciones, rotacion, grupos, hoy });

  it('no está decidida mientras una semana anterior siga sin contestar', () => {
    const t = calcular([inv('2026/11/01'), inv('2026/11/08', true)], '2026/10/26');

    expect(t.find((x) => x.weekOf === '2026/11/08')).toMatchObject({
      grupo: 'g1',
      gasta: true,
      decidido: false,
    });
  });

  it('se decide cuando la anterior contesta, y entonces es del grupo correcto', () => {
    const t = calcular(
      [inv('2026/11/01', true), inv('2026/11/08', true)],
      '2026/10/26'
    );

    expect(t.find((x) => x.weekOf === '2026/11/08')).toMatchObject({
      grupo: 'g2',
      decidido: true,
    });
  });

  it('una semana ya pasada sin contestar no bloquea las siguientes', () => {
    const t = calcular([inv('2026/11/01'), inv('2026/11/08', true)], '2026/11/09');

    expect(t.find((x) => x.weekOf === '2026/11/08')).toMatchObject({
      grupo: 'g1',
      decidido: true,
    });
  });

  it('si se cambió el orador, cuenta solo la invitación más reciente', () => {
    const vieja = {
      ...inv('2026/11/01', true),
      expiresAt: new Date('2027-02-01'),
    };
    const nueva = { ...inv('2026/11/01', false), expiresAt: new Date('2027-03-01') };

    const t = calcular([vieja, nueva, inv('2026/11/08', true)]);

    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ weekOf: '2026/11/01', gasta: false });
    // La semana no gastó turno: la siguiente sigue siendo del primer grupo.
    expect(t[1]).toMatchObject({ weekOf: '2026/11/08', grupo: 'g1' });
  });

  it('una invitación anulada no cuenta', () => {
    const t = calcular([{ ...inv('2026/11/01', true), revoked: true }]);

    expect(t).toHaveLength(0);
  });

  it('una respuesta apuntada tarde recoloca las semanas siguientes', () => {
    // Nada se queda congelado: si la semana 1 se anota después como «cena», la
    // semana 2 pasa al grupo siguiente, que es lo correcto.
    const antes = calcular(
      [inv('2026/11/01'), inv('2026/11/08', true)],
      '2026/11/09'
    );
    const despues = calcular(
      [inv('2026/11/01', true), inv('2026/11/08', true)],
      '2026/11/09'
    );

    expect(antes[1].grupo).toBe('g1');
    expect(despues[1].grupo).toBe('g2');
  });
});
