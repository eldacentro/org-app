import { describe, expect, it } from 'vitest';
import { PersonType } from '@definition/person';
import { refreshReadOnlyRoles } from './persons';
import {
  currentActivityMonth,
  personWasPublisherBy,
} from './publisher_status';

/**
 * Los roles de solo lectura ('publisher', 'view_schedules') se calculan en DOS
 * sitios: `refreshReadOnlyRoles` (la app, al aceptar una solicitud de acceso,
 * al editar el perfil de un usuario o al desarchivar a alguien) y el
 * sincronizador (`worker/backupUtils.ts`, en cada ciclo).
 *
 * Preguntaban cosas distintas. La app preguntaba "¿tiene un tramo de publicador
 * que cubra este mes?" y el sincronizador "¿tiene la casilla puesta O un tramo
 * que cubra este mes?". Con los datos reales de la congregación discrepaban en
 * CUATRO personas —Andrés Argente, Israel Angioli, Loli Argente y Jesús
 * Martínez—, todas ellas publicadoras con el tramo cerrado. La app les quitaba
 * el rol y el siguiente ciclo del sincronizador se lo devolvía: los permisos
 * iban y venían solos.
 *
 * La pregunta correcta es la de siempre, `personWasPublisherBy`.
 */

const stamp = '2020-01-01T00:00:00Z';

const buildPerson = (opts: {
  baptizedFlag?: boolean;
  unbaptizedFlag?: boolean;
  midweek?: boolean;
  tramos?: { start: string; end?: string | null }[];
}): PersonType =>
  ({
    person_uid: 'p1',
    _deleted: { value: false, updatedAt: stamp },
    person_data: {
      person_firstname: { value: 'A', updatedAt: stamp },
      person_lastname: { value: 'B', updatedAt: stamp },
      person_display_name: { value: 'A B', updatedAt: stamp },
      archived: { value: false, updatedAt: stamp },
      privileges: [],
      enrollments: [],
      midweek_meeting_student: {
        active: { value: opts.midweek ?? false, updatedAt: stamp },
        history: [],
      },
      publisher_unbaptized: {
        active: { value: opts.unbaptizedFlag ?? false, updatedAt: stamp },
        history: [],
      },
      publisher_baptized: {
        active: { value: opts.baptizedFlag ?? false, updatedAt: stamp },
        anointed: { value: false, updatedAt: stamp },
        history: (opts.tramos ?? []).map((t, i) => ({
          id: `h${i}`,
          _deleted: false,
          updatedAt: stamp,
          start_date: t.start,
          end_date: t.end ?? null,
        })),
      },
    },
  }) as never;

describe('refreshReadOnlyRoles pregunta lo mismo que el resto de la app', () => {
  it('un publicador con el TRAMO CERRADO conserva sus roles', () => {
    // El caso real: Andrés Argente. Publicador desde 2015, el tramo se le
    // cerró (6 meses sin informar, o a mano por error) y nunca se reabrió.
    // Sigue siendo publicador: perder el rol le quita además los programas de
    // las reuniones.
    const person = buildPerson({
      baptizedFlag: true,
      tramos: [{ start: '2015-03-01', end: '2020-06-30' }],
    });

    expect(personWasPublisherBy(person, currentActivityMonth())).toBe(true);

    const roles = refreshReadOnlyRoles(person);

    expect(roles).toContain('publisher');
    expect(roles).toContain('view_schedules');
  });

  it('quien nunca ha sido publicador no recibe el rol', () => {
    const person = buildPerson({ midweek: true });

    const roles = refreshReadOnlyRoles(person);

    expect(roles).not.toContain('publisher');
    // Sigue viendo los programas por ser estudiante de entresemana.
    expect(roles).toContain('view_schedules');
  });

  it('un estudiante de entresemana sin casilla de publicador no lo es, aunque arrastre un tramo abierto', () => {
    // Aquí es donde el sincronizador y la app se separaban en el otro sentido:
    // el tramo abierto le daba el rol de publicador a quien la ficha dice que
    // es estudiante. Manda `personWasPublisherBy`.
    const person = buildPerson({
      midweek: true,
      tramos: [{ start: '2015-03-01' }],
    });

    expect(personWasPublisherBy(person, currentActivityMonth())).toBe(false);
    expect(refreshReadOnlyRoles(person)).not.toContain('publisher');
  });

  it('el rol coincide con personWasPublisherBy en todas las formas de ficha', () => {
    const formas = [
      { baptizedFlag: true, tramos: [{ start: '2015-03-01' }] },
      { baptizedFlag: true, tramos: [{ start: '2015-03-01', end: '2020-06-30' }] },
      { baptizedFlag: true, tramos: [] },
      { unbaptizedFlag: true, tramos: [{ start: '2019-01-01' }] },
      { tramos: [{ start: '2015-03-01', end: '2020-06-30' }] },
      { midweek: true, tramos: [] },
      { midweek: true, baptizedFlag: true, tramos: [{ start: '2015-03-01' }] },
      { tramos: [] },
    ];

    for (const forma of formas) {
      const person = buildPerson(forma);
      const esperado = personWasPublisherBy(person, currentActivityMonth());

      expect(
        refreshReadOnlyRoles(person).includes('publisher'),
        JSON.stringify(forma)
      ).toBe(esperado);
    }
  });
});
