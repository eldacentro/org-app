/*
This file holds the source of the truth from the table "persons".
*/
import { atom } from 'jotai';
import { PersonType, PersonsTab } from '@definition/person';
import {
  applyAssignmentFilters,
  applyGroupFilters,
  applyNameFilters,
  personsSortByName,
} from '@services/app/persons';
import { localStorageGetItem } from '@utils/common';
import { buildTrashEntries } from '@services/app/persons_trash';
import { userDataViewState } from './settings';
import { APRecordType } from '@definition/ministry';
import { fieldServiceGroupsState } from './field_service_groups';
import {
  fieldServiceReportsState,
  ministryMonthsState,
} from './field_service_reports';

export const personsState = atom<PersonType[]>([]);

export const personsAllState = atom((get) => {
  const persons = get(personsState);

  return personsSortByName(persons);
});

export const personsActiveState = atom((get) => {
  const persons = get(personsAllState);

  return persons.filter((person) => {
    if (person._deleted.value) return false;

    const archived = person.person_data.archived?.value ?? false;
    return !archived;
  });
});

/**
 * La papelera: quien tiene la lápida puesta, lo más reciente primero.
 *
 * Sale de `personsState` en crudo —no de `personsAllState`, que ya viene
 * ordenado por nombre— porque aquí el orden que importa es el de cuándo se
 * borró. Los informes entran para poder decir en cada tarjeta qué se recupera.
 *
 * Y respeta la VISTA igual que el resto de la lista: estando en un grupo de
 * idioma se ve la papelera de ese grupo, no la de toda la congregación. Sin
 * esto, un superintendente de grupo —que puede borrar dentro del suyo— veía en
 * la papelera a los borrados de todos, con su fecha y quién los borró: gente
 * que no sale por ninguna otra pantalla suya. Es el mismo filtro de
 * `personsByViewState`, que no se puede reutilizar porque aquél parte de los
 * VIVOS.
 */
export const personsTrashState = atom((get) => {
  const dataView = get(userDataViewState);
  const groups = get(fieldServiceGroupsState);

  const entries = buildTrashEntries(
    get(personsState),
    get(fieldServiceReportsState)
  );

  if (dataView === 'main') return entries;

  const group = groups.find((record) => record.group_id === dataView);

  if (!group) return entries;

  return entries.filter((entry) =>
    group.group_data.members.some(
      (member) => member.person_uid === entry.person.person_uid
    )
  );
});

/**
 * El grupo de predicación que se acaba de elegir en la ficha de una persona.
 *
 * `null` significa «no se ha tocado el selector», que no es lo mismo que
 * «ninguno»: al guardar, sin haberlo tocado, la pertenencia al grupo se queda
 * como estaba.
 *
 * Existe porque el selector de grupo se pinta TRES veces en la misma ficha
 * —dentro de Publicador bautizado, dentro de Publicador no bautizado y, como
 * grupo de idioma, dentro de Estudiante—, cada una con su propio estado local.
 * Al guardar se leía el del DOM con `querySelector`, que devuelve siempre el
 * PRIMERO: el de bautizado. Así que a un publicador no bautizado se le leía un
 * selector que él no había tocado, se salía sin guardar el grupo —en silencio,
 * porque la persona sí se guardaba— y el aviso decía «guardado» igualmente.
 *
 * Las tres escriben aquí, y aquí es donde mira quien guarda.
 */
// Escrito así —y no `atom<string | null>(null)`— porque con esa forma los
// tipos de jotai 2.18 lo dan por atom de SOLO LECTURA y `useSetAtom` no
// compila.
export const personPendingGroupState = atom(null as string | null);

export const isPersonDeleteState = atom(false);

export const selectedPersonState = atom<PersonType>({} as PersonType);

export const personsSearchKeyState = atom('');

export const personsFiltersKeyState = atom<(string | number)[]>([]);

export const personCurrentDetailsState = atom<PersonType>({
  _deleted: { value: false, updatedAt: '' },
  person_uid: '',
  person_data: {
    person_firstname: { value: '', updatedAt: '' },
    person_lastname: { value: '', updatedAt: '' },
    person_display_name: { value: '', updatedAt: '' },
    male: { value: true, updatedAt: '' },
    female: { value: false, updatedAt: '' },
    birth_date: { value: null, updatedAt: '' },
    assignments: [{ type: 'main', updatedAt: '', values: [] }],
    timeAway: [],
    archived: { value: false, updatedAt: '' },
    disqualified: { value: false, updatedAt: '' },
    email: { value: '', updatedAt: '' },
    departments: { value: [], updatedAt: '' },
    address: { value: '', updatedAt: '' },
    phone: { value: '', updatedAt: '' },
    publisher_baptized: {
      active: { value: false, updatedAt: '' },
      anointed: { value: false, updatedAt: '' },
      other_sheep: { value: true, updatedAt: '' },
      baptism_date: { value: null, updatedAt: '' },
      history: [],
    },
    publisher_unbaptized: {
      active: { value: false, updatedAt: '' },
      history: [],
    },
    midweek_meeting_student: {
      active: { value: true, updatedAt: '' },
      history: [
        {
          id: crypto.randomUUID(),
          _deleted: false,
          updatedAt: '',
          start_date: new Date().toISOString(),
          end_date: null,
        },
      ],
    },
    privileges: [],
    enrollments: [],
    emergency_contacts: [],
    family_members: {
      head: false,
      members: [],
      updatedAt: '',
    },
  },
});

export const personsByViewState = atom((get) => {
  const languageGroups = get(fieldServiceGroupsState);
  const dataView = get(userDataViewState);
  const persons = get(personsActiveState);

  const group = languageGroups.find((g) => g.group_id === dataView);

  return persons.filter((record) => {
    if (dataView === 'main') return true;

    if (!group) return true;

    return group.group_data.members.some(
      (m) => m.person_uid === record.person_uid
    );
  });
});

export const personsFilteredState = atom((get) => {
  const personsAll = get(personsAllState);
  const searchKey = get(personsSearchKeyState);
  const filtersKey = get(personsFiltersKeyState);
  const personsByView = get(personsByViewState);

  const archived = filtersKey.includes('archived');

  const filteredByName: PersonType[] = applyNameFilters({
    persons: personsByView,
    searchKey,
    archived,
    allPersons: personsAll,
  });

  const filteredByAssignments: PersonType[] = applyAssignmentFilters(
    filteredByName,
    filtersKey as number[]
  );

  const finalResult: PersonType[] = applyGroupFilters(
    filteredByAssignments,
    filtersKey as string[],
    get(ministryMonthsState)
  );

  return finalResult;
});

export const personsRecentState = atom<string[]>(
  localStorageGetItem('personsRecent')
    ? (JSON.parse(localStorageGetItem('personsRecent')) as string[])
    : []
);

export const personsTabState = atom(PersonsTab.ALL);

export const applicationsState = atom<APRecordType[]>([]);

export const applicationsNewState = atom((get) => {
  const applications = get(applicationsState);

  return applications
    .filter((record) => !record.status || record.status === 'waiting')
    .sort((a, b) => b.submitted.localeCompare(a.submitted));
});

export const applicationsCountState = atom((get) => {
  const applications = get(applicationsNewState);

  return applications.length.toString();
});

export const applicationsApprovedState = atom((get) => {
  const applications = get(applicationsState);

  return applications
    .filter((record) => record.status === 'approved')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

export const eldersActiveState = atom((get) => {
  const persons = get(personsActiveState);

  return persons.filter((person) => {
    const privileges = person?.person_data?.privileges || [];
    return privileges.some((p) => {
      const privilegeValue =
        typeof p.privilege === 'object' && p.privilege !== null
          ? (p.privilege as { value: string }).value
          : p.privilege;
      const isElder = privilegeValue === 'elder';
      const isDeleted = p._deleted === true;
      const isActive = p.end_date === null || p.end_date === '';

      return isElder && !isDeleted && isActive;
    });
  });
});

export const personsFilterOpenState = atom(false);
