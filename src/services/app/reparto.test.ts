import { describe, expect, it } from 'vitest';
import { AssignmentCode } from '@definition/assignment';
import { AssignmentHistoryType } from '@definition/schedules';
import { PersonType } from '@definition/person';
import { construirReparto, tituloDeAsignacion } from './reparto';

/**
 * La rueda tiene que contestar las cuatro preguntas de la hoja de cálculo. Lo
 * que se prueba aquí es justo eso, no que «pinte».
 */

const PRESIDENCIA = AssignmentCode.MM_Chairman;
const ORACION = AssignmentCode.MM_Prayer;

const HOY = new Date('2026-08-03T12:00:00');

const persona = (uid: string) => ({ person_uid: uid }) as PersonType;

const llevo = (
  uid: string,
  weekOf: string,
  code = PRESIDENCIA,
  title = 'Presidente'
): AssignmentHistoryType =>
  ({
    id: `${uid}-${weekOf}-${code}`,
    weekOf,
    assignment: { code, person: uid, title, dataView: 'main' },
  }) as AssignmentHistoryType;

describe('la rueda de una asignación', () => {
  it('a quien nunca le ha tocado sale el primero — la fila en blanco de la hoja', () => {
    const reparto = construirReparto({
      code: PRESIDENCIA,
      titulo: 'Presidente',
      elegibles: [persona('ana'), persona('bea'), persona('nunca')],
      history: [llevo('ana', '2026/07/06'), llevo('bea', '2026/01/05')],
      hoy: HOY,
    });

    expect(reparto.personas[0].person_uid).toBe('nunca');
    expect(reparto.personas[0].ultima).toBe('');

    // Y después, por antigüedad: bea (enero) antes que ana (julio).
    expect(reparto.personas.map((p) => p.person_uid)).toEqual([
      'nunca',
      'bea',
      'ana',
    ]);
  });

  it('cuenta solo las de la ventana, pero la última vez la dice aunque sea vieja', () => {
    const reparto = construirReparto({
      code: PRESIDENCIA,
      titulo: 'Presidente',
      elegibles: [persona('ana')],
      history: [
        llevo('ana', '2026/07/06'),
        // Fuera de los doce meses: no cuenta, pero tampoco borra el pasado.
        llevo('ana', '2024/03/04'),
      ],
      hoy: HOY,
    });

    expect(reparto.personas[0].veces).toBe(1);
    expect(reparto.personas[0].ultima).toBe('2026/07/06');
  });

  it('el margen entre el que más y el que menos es lo que dice si va equilibrado', () => {
    const equilibrado = construirReparto({
      code: PRESIDENCIA,
      titulo: 'Presidente',
      elegibles: [persona('ana'), persona('bea')],
      history: [
        llevo('ana', '2026/07/06'),
        llevo('ana', '2026/05/04'),
        llevo('bea', '2026/06/01'),
      ],
      hoy: HOY,
    });

    expect(equilibrado.menos).toBe(1);
    expect(equilibrado.mas).toBe(2);
    expect(equilibrado.desigual).toBe(false);

    const torcido = construirReparto({
      code: PRESIDENCIA,
      titulo: 'Presidente',
      elegibles: [persona('ana'), persona('bea')],
      history: [
        llevo('ana', '2026/07/06'),
        llevo('ana', '2026/06/01'),
        llevo('ana', '2026/05/04'),
        llevo('ana', '2026/04/06'),
      ],
      hoy: HOY,
    });

    expect(torcido.menos).toBe(0);
    expect(torcido.mas).toBe(4);
    expect(torcido.desigual).toBe(true);
  });

  it('no mezcla asignaciones: la presidencia no cuenta como oración', () => {
    const reparto = construirReparto({
      code: ORACION,
      titulo: 'Oración',
      elegibles: [persona('ana')],
      history: [llevo('ana', '2026/07/06', PRESIDENCIA)],
      hoy: HOY,
    });

    expect(reparto.personas[0].veces).toBe(0);
    expect(reparto.personas[0].ultima).toBe('');
  });

  it('sin nadie elegible no revienta', () => {
    const reparto = construirReparto({
      code: PRESIDENCIA,
      titulo: 'Presidente',
      elegibles: [],
      history: [],
      hoy: HOY,
    });

    expect(reparto.personas).toEqual([]);
    expect(reparto.desigual).toBe(false);
  });
});

describe('cómo se llama cada asignación', () => {
  it('se queda con el título que más se repite', () => {
    const history = [
      llevo('ana', '2026/07/06', PRESIDENCIA, 'Presidente'),
      llevo('bea', '2026/06/01', PRESIDENCIA, 'Presidente'),
      llevo('ceci', '2026/05/04', PRESIDENCIA, 'Un título raro de una vez'),
    ];

    expect(tituloDeAsignacion(history, PRESIDENCIA)).toBe('Presidente');
  });

  it('salvo que se le dé uno fijo, para las partes que cambian de nombre cada semana', () => {
    const history = [
      llevo(
        'ana',
        '2026/07/06',
        PRESIDENCIA,
        'Empiece conversaciones (4 min.)'
      ),
    ];

    expect(
      tituloDeAsignacion(history, PRESIDENCIA, {
        [PRESIDENCIA]: 'Empiece conversaciones',
      })
    ).toBe('Empiece conversaciones');
  });
});
