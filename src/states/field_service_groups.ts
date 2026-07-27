/*
This file holds the source of the truth from the table "fieldServiceGroup".
*/

import { atom } from 'jotai';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { personsActiveState } from './persons';
import {
  congNameState,
  isElderState,
  publishersSortState,
  settingsState,
  userDataViewState,
  userLocalUIDState,
} from './settings';
import { personIsMidweekStudent } from '@services/app/persons';
import { personIsActivePublisher } from '@services/app/publisher_status';
import { ministryMonthsState } from './field_service_reports';
import { PublishersSortOption } from '@definition/settings';
import { fieldGroupsSortMembersByName } from '@services/app/field_service_groups';

export const fieldServiceGroupsState = atom<FieldServiceGroupType[]>([]);

export const fieldWithLanguageGroupsState = atom((get) => {
  const groups = get(fieldServiceGroupsState);
  const persons = get(personsActiveState);
  const isElder = get(isElderState);
  const sortMethod = get(publishersSortState);
  const ministryMonths = get(ministryMonthsState);

  const validGroups = groups
    .filter((record) => !record.group_data._deleted)
    .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);

  // remove deleted persons and add elder filter
  const result = validGroups.map((record) => {
    const group = structuredClone(record);

    group.group_data.members = group.group_data.members
      .sort((a, b) => a.sort_index - b.sort_index)
      .filter((member) => {
        if (isElder) return true;

        const person = persons.find(
          (person) => person.person_uid === member.person_uid
        );

        if (!person) return false;

        // Concesión para inactivos: seguir visible en el grupo para toda la
        // congregación aunque ya no cuente como publicador activo.
        if (person.person_data.grupo_visible_inactivo?.value) return true;

        return personIsActivePublisher(person, ministryMonths);
      });

    if (sortMethod === PublishersSortOption.ALPHABETICAL) {
      group.group_data.members = fieldGroupsSortMembersByName(
        group.group_data.members
      );
    }

    return group;
  });

  return result;
});

export const fieldWithLanguageGroupsNoStudentsState = atom((get) => {
  const groups = get(fieldWithLanguageGroupsState);
  const persons = get(personsActiveState);
  const isElder = get(isElderState);
  const settings = get(settingsState);
  const ministryMonths = get(ministryMonthsState);

  // Ajuste de congregación: por defecto los ancianos ven en la página de
  // grupos la MISMA vista pública que los publicadores (así saben qué ve el
  // resto). Solo si se activa este ajuste ven además a los miembros ocultos
  // (inactivos sin concesión). Este atom alimenta ÚNICAMENTE la página
  // "Grupos de predicación" — los flujos administrativos (editar miembros,
  // informes, S-21, contactos de emergencia) usan los atoms de pertenencia
  // completa y NO se ven afectados.
  const inactiveVisibleToElders =
    settings.cong_settings.groups_inactive_visible_to_elders?.value ?? false;

  const dataGroup = structuredClone(groups);

  return dataGroup.map((group) => {
    group.group_data.members = group.group_data.members.filter((member) => {
      const person = persons.find(
        (person) => person.person_uid === member.person_uid
      );

      if (!person) return false;

      if (personIsMidweekStudent(person)) return false;

      if (isElder && !inactiveVisibleToElders) {
        // Igualar la vista del anciano a la de un publicador: mismos
        // criterios que el filtro de fieldWithLanguageGroupsState.
        if (person.person_data.grupo_visible_inactivo?.value) return true;

        return personIsActivePublisher(person, ministryMonths);
      }

      return true;
    });

    return group;
  });
});

export const fieldGroupsState = atom((get) => {
  const groups = get(fieldWithLanguageGroupsState);

  return groups.filter((record) => !record.group_data.language_group);
});

export const languageGroupsState = atom((get) => {
  const groups = get(fieldWithLanguageGroupsState);

  return groups.filter((record) => record.group_data.language_group);
});

export const headerForScheduleState = atom((get) => {
  const congName = get(congNameState);
  const dataView = get(userDataViewState);
  const groups = get(languageGroupsState);

  if (dataView === 'main') return congName;

  const group = groups.find((record) => record.group_id === dataView);

  return group?.group_data.name ?? '';
});

export const userInLanguageGroupState = atom((get) => {
  const userUID = get(userLocalUIDState);
  const languageGroups = get(languageGroupsState);

  return languageGroups.some((group) =>
    group.group_data.members.some((record) => record.person_uid === userUID)
  );
});
