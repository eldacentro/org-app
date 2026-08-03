import { describe, expect, it } from 'vitest';
import { createStore } from 'jotai';
import {
  personsState,
  personsFiltersKeyState,
  personsFilteredState,
} from './persons';
import { fieldServiceReportsState } from './field_service_reports';
import {
  fieldServiceGroupsState,
  fieldWithLanguageGroupsState,
} from './field_service_groups';
import { isElderState, settingsState } from './settings';
import { settingSchema } from '@services/dexie/schema';

/**
 * Que la regla de activo/inactivo llegue de verdad a las pantallas.
 *
 * `publisher_status.test.ts` prueba la regla; esto prueba el CABLEADO: que los
 * atoms que alimentan la lista de Personas y Grupos de predicación la usan, y
 * con los tres casos reales que destaparon el problema —uno al que se marcó
 * inactivo cerrando su tramo con fecha de este mes, uno que nunca fue
 * publicador, y uno inactivo con la casilla de "seguir visible en Grupos".
 *
 * Los tres salían donde no debían, y cada uno por un motivo distinto.
 */

const stamp = '2026-01-01T00:00:00Z';

const person = (
  uid: string,
  name: string,
  opts: {
    tramos: { start: string; end?: string | null }[];
    visibleEnGrupos?: boolean;
  }
) =>
  ({
    person_uid: uid,
    _deleted: { value: false, updatedAt: stamp },
    person_data: {
      person_firstname: { value: name, updatedAt: stamp },
      person_lastname: { value: name, updatedAt: stamp },
      person_display_name: { value: name, updatedAt: stamp },
      male: { value: true, updatedAt: stamp },
      female: { value: false, updatedAt: stamp },
      archived: { value: false, updatedAt: stamp },
      disqualified: { value: false, updatedAt: stamp },
      assignments: [{ type: 'main', updatedAt: stamp, values: [] }],
      privileges: [],
      enrollments: [],
      timeAway: [],
      grupo_visible_inactivo: {
        value: opts.visibleEnGrupos ?? false,
        updatedAt: stamp,
      },
      midweek_meeting_student: {
        active: { value: false, updatedAt: stamp },
        history: [],
      },
      publisher_unbaptized: {
        active: { value: false, updatedAt: stamp },
        history: [],
      },
      publisher_baptized: {
        active: { value: opts.tramos.length > 0, updatedAt: stamp },
        anointed: { value: false, updatedAt: stamp },
        history: opts.tramos.map((t, i) => ({
          id: `${uid}-h${i}`,
          _deleted: false,
          updatedAt: stamp,
          start_date: t.start,
          end_date: t.end ?? null,
        })),
      },
    },
  }) as never;

const report = (uid: string, month: string) =>
  ({
    report_id: `${uid}-${month}`,
    report_data: {
      _deleted: false,
      updatedAt: stamp,
      report_date: month,
      person_uid: uid,
      shared_ministry: true,
      hours: { field_service: 5, credit: { value: 0, approved: 0 } },
      bible_studies: 0,
      comments: '',
      late: { value: false, submitted: '' },
      status: 'confirmed',
    },
  }) as never;

// Los tres casos reales, tal y como están en la congregación.
const ANTONIO = person('antonio', 'Antonio', {
  // marcado inactivo: el tramo se cerró con fecha de este mes
  tramos: [{ start: '2015-03-01', end: '2026-07-15' }],
});
const VICTOR = person('victor', 'Victor', { tramos: [] }); // nunca publicador
const DAVID = person('david', 'David', {
  tramos: [{ start: '2015-03-01' }], // tramo abierto
  visibleEnGrupos: true,
});
const ANA = person('ana', 'Ana', { tramos: [{ start: '2015-03-01' }] }); // informa

const buildStore = (rol: string[] = []) => {
  const store = createStore();

  // El rol decide si este dispositivo tiene los informes de la congregación,
  // y de ahí si la regla de activo/inactivo se puede evaluar siquiera.
  const settings = structuredClone(settingSchema);
  settings.user_settings.cong_role = rol as never;
  store.set(settingsState, settings);

  store.set(personsState, [ANTONIO, VICTOR, DAVID, ANA]);
  store.set(fieldServiceReportsState, [
    report('ana', '2026/07'),
    report('antonio', '2025/11'),
    report('david', '2025/09'),
  ]);
  store.set(fieldServiceGroupsState, [
    {
      group_id: 'g1',
      group_data: {
        _deleted: false,
        updatedAt: stamp,
        name: 'Grupo 1',
        sort_index: 0,
        language_group: false,
        members: [
          {
            person_uid: 'antonio',
            sort_index: 0,
            isOverseer: false,
            isAssistant: false,
          },
          {
            person_uid: 'david',
            sort_index: 1,
            isOverseer: false,
            isAssistant: false,
          },
          {
            person_uid: 'ana',
            sort_index: 2,
            isOverseer: false,
            isAssistant: false,
          },
        ],
      },
    },
  ] as never);

  return store;
};

const names = (persons: { person_uid: string }[]) =>
  persons.map((p) => p.person_uid).sort();

describe('los atoms de verdad, con el grafo de imports real', () => {
  it('el filtro "inactivo" de Personas usa la regla de los informes', () => {
    const store = buildStore();
    store.set(personsFiltersKeyState, ['inactive']);

    expect(names(store.get(personsFilteredState))).toEqual([
      'antonio',
      'david',
    ]);
  });

  it('el filtro "activo" deja fuera a los tres inactivos', () => {
    const store = buildStore();
    store.set(personsFiltersKeyState, ['active']);

    expect(names(store.get(personsFilteredState))).toEqual(['ana']);
  });

  const miembros = (store: ReturnType<typeof buildStore>) =>
    store
      .get(fieldWithLanguageGroupsState)[0]
      .group_data.members.map((m) => m.person_uid)
      .sort();

  it('Grupos: a quien TIENE los informes, el inactivo le desaparece salvo con la concesión', () => {
    // Un superintendente de grupo: no es anciano, pero el servidor sí le manda
    // los informes de la congregación, así que la regla se puede evaluar.
    const store = buildStore(['group_overseers']);
    expect(store.get(isElderState)).toBe(false);

    // david tiene la casilla marcada; antonio no
    expect(miembros(store)).toEqual(['ana', 'david']);
  });

  /**
   * El fallo del 3 de agosto: a una publicadora le salían dos o tres personas
   * en Grupos de predicación y el resto desaparecía.
   *
   * Su dispositivo solo tiene SUS informes —el servidor no le manda los de la
   * congregación—, así que «¿ha informado Fulano?» no era «no», era «no lo sé».
   * Contestando que no, se escondía a todo el mundo menos a aquellos de cuyos
   * informes disponía.
   *
   * Aquí la publicadora tiene los informes de ana, antonio y david, y aun así
   * los cuatro miembros del grupo se ven: cuando no se puede saber, se enseña.
   */
  it('Grupos: a quien NO tiene los informes se le enseñan todos, no se le esconde nadie', () => {
    const store = buildStore(['publisher']);

    expect(store.get(isElderState)).toBe(false);
    expect(miembros(store)).toEqual(['ana', 'antonio', 'david']);
  });
});
