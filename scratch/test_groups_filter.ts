/**
 * Verificación determinista del filtro de visibilidad de la página
 * "Grupos de predicación" (fieldWithLanguageGroupsNoStudentsState) con el
 * nuevo ajuste groups_inactive_visible_to_elders y la concesión
 * grupo_visible_inactivo. Ejercita los atoms REALES con un store de jotai.
 *
 * Uso: npx tsx scratch/test_groups_filter.ts
 */
import { createStore } from 'jotai';
import { settingsState } from '../src/states/settings';
import { personsState } from '../src/states/persons';
import {
  fieldServiceGroupsState,
  fieldWithLanguageGroupsNoStudentsState,
} from '../src/states/field_service_groups';
import { personSchema, settingSchema } from '../src/services/dexie/schema';
import { PersonType } from '../src/definition/person';
import { FieldServiceGroupType } from '../src/definition/field_service_groups';

const UID = 'person-inactive-1';

const makePerson = (opts: {
  inactive: boolean;
  concession: boolean;
}): PersonType => {
  const person: PersonType = structuredClone(personSchema);
  person.person_uid = UID;
  person.person_data.person_firstname.value = 'Prueba';
  person.person_data.person_lastname.value = 'Inactiva';
  person.person_data.midweek_meeting_student.active.value = false;
  person.person_data.midweek_meeting_student.history = [];
  person.person_data.publisher_baptized.active.value = true;
  person.person_data.publisher_baptized.history = [
    {
      id: 'h1',
      _deleted: false,
      updatedAt: '',
      start_date: '2025-09-01T00:00:00.000Z',
      // Inactiva: historial cerrado en un mes pasado. Activa: registro abierto.
      end_date: opts.inactive ? '2026-05-31T00:00:00.000Z' : null,
    },
  ];
  person.person_data.grupo_visible_inactivo = {
    value: opts.concession,
    updatedAt: '',
  };
  return person;
};

const makeGroup = (): FieldServiceGroupType => ({
  group_id: 'group-1',
  group_data: {
    _deleted: false,
    updatedAt: '',
    name: 'Grupo test',
    sort_index: 0,
    members: [
      { person_uid: UID, sort_index: 0, isOverseer: false, isAssistant: false },
    ],
  },
});

const run = (scenario: {
  label: string;
  role: 'elder' | 'publisher';
  settingOn: boolean;
  inactive: boolean;
  concession: boolean;
  expectVisible: boolean;
}) => {
  const store = createStore();

  const settings = structuredClone(settingSchema);
  settings.user_settings.account_type = 'vip';
  settings.user_settings.cong_role =
    scenario.role === 'elder' ? ['elder'] : ['publisher'];
  settings.cong_settings.groups_inactive_visible_to_elders = {
    value: scenario.settingOn,
    updatedAt: '',
  };

  store.set(settingsState, settings);
  store.set(personsState, [
    makePerson({ inactive: scenario.inactive, concession: scenario.concession }),
  ]);
  store.set(fieldServiceGroupsState, [makeGroup()]);

  const groups = store.get(fieldWithLanguageGroupsNoStudentsState);
  const visible = groups[0].group_data.members.some(
    (m) => m.person_uid === UID
  );

  const ok = visible === scenario.expectVisible;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} — ${scenario.label} (visible=${visible}, esperado=${scenario.expectVisible})`
  );
  return ok;
};

const results = [
  run({
    label: 'anciano + ajuste OFF + inactiva sin concesión → oculta',
    role: 'elder',
    settingOn: false,
    inactive: true,
    concession: false,
    expectVisible: false,
  }),
  run({
    label: 'anciano + ajuste ON + inactiva sin concesión → visible',
    role: 'elder',
    settingOn: true,
    inactive: true,
    concession: false,
    expectVisible: true,
  }),
  run({
    label: 'anciano + ajuste OFF + inactiva CON concesión → visible',
    role: 'elder',
    settingOn: false,
    inactive: true,
    concession: true,
    expectVisible: true,
  }),
  run({
    label: 'publicador + inactiva sin concesión → oculta (sin cambios)',
    role: 'publisher',
    settingOn: false,
    inactive: true,
    concession: false,
    expectVisible: false,
  }),
  run({
    label: 'publicador + inactiva CON concesión → visible',
    role: 'publisher',
    settingOn: false,
    inactive: true,
    concession: true,
    expectVisible: true,
  }),
  run({
    label: 'anciano + ajuste OFF + publicadora ACTIVA → visible',
    role: 'elder',
    settingOn: false,
    inactive: false,
    concession: false,
    expectVisible: true,
  }),
];

if (results.every(Boolean)) {
  console.log('\nTodos los escenarios PASAN.');
  process.exit(0);
} else {
  console.error('\nHay escenarios FALLANDO.');
  process.exit(1);
}
