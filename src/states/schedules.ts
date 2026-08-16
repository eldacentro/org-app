/*
This file holds the source of the truth from the table "sched".
*/

import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import {
  AssignmentHistoryType,
  MidweekMeetingDataType,
  S89DataType,
  S89TemplateType,
  SchedWeekType,
} from '@definition/schedules';
import {
  adminRoleState,
  congRoleState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
  weekendMeetingWTStudyConductorDefaultState,
} from './settings';
import { personsState } from './persons';
import { buildPersonFullname, localStorageGetItem } from '@utils/common';
import { userInLanguageGroupState } from './field_service_groups';

export const schedulesState = atom<SchedWeekType[]>([]);

export const isPublishOpenState = atom(false);

export const dlgAutoFillOpenState = atom(false);

export const isDeleteSchedState = atom(false);

export const dlgAssDeleteOpenState = atom(false);

export const isAutoFillSchedState = atom(false);

export const currentScheduleState = atom('');

export const s89DataState = atom<S89DataType[]>([]);

export const S140DataState = atom<MidweekMeetingDataType[]>([]);

export const S140DownloadOpenState = atom(false);

export const selectedWeekState = atomWithReset('');

export const assignmentsHistoryState = atom<AssignmentHistoryType[]>([]);

export const weekendSongSelectorOpenState = atom(false);

export const outgoingSongSelectorOpenState = atom(false);

// Con `localStorage` a pelo, este módulo no se puede ni CARGAR fuera de un
// navegador: la lectura ocurre al importarlo, no al usarlo. Rompía las pruebas
// automáticas del reparto, que corren en Node, y rompería igual en un Web
// Worker, que tampoco tiene localStorage. El ayudante ya se protege.
export const S89TemplateState = atom<S89TemplateType>(
  (localStorageGetItem('organized_template_S89') as S89TemplateType) ||
    'S89_1x1'
);

/**
 * En qué formato se manda la hojita: el documento o una foto de él.
 *
 * Vive donde la plantilla de S-89 de aquí arriba y por lo mismo: es cómo
 * reparte quien reparte, no una norma de la congregación, y así no se toca el
 * esquema que se sincroniza.
 *
 * Por defecto, IMAGEN. Un PDF que llega por WhatsApp es un adjunto que hay que
 * abrir; una imagen se ve en el propio chat, y para saber qué parte te toca y
 * qué día eso es toda la diferencia. El PDF sigue a un toque: es el formato
 * bueno para imprimir, y la salida si la letra pequeña no aguantara la
 * compresión de WhatsApp.
 */
export const formatoHojitaState = atom<'imagen' | 'pdf'>(
  localStorageGetItem('organized_formato_hojita') === 'pdf' ? 'pdf' : 'imagen'
);

/**
 * Avisar también al AYUDANTE de cada parte al repartir las hojitas.
 *
 * Vive en este dispositivo y no en los ajustes de la congregación a propósito:
 * es la costumbre de quien reparte, no una norma. Y por el camino se ahorra
 * tocar el esquema que se sincroniza, que en este repo es donde han dolido los
 * errores. Mismo patrón que la plantilla de S-89 de aquí arriba, con el mismo
 * cuidado de leer `localStorage` a través del ayudante para que el módulo
 * siga cargando en Node y en un Web Worker.
 *
 * Apagado por defecto: muchas veces el ayudante es del mismo domicilio que el
 * estudiante y ya está enterado, así que su fila sería ruido en la lista.
 */
export const avisarAyudantesState = atom<boolean>(
  localStorageGetItem('organized_avisar_ayudantes') === 'true'
);

export const defaultWTStudyConductorNameState = atom((get) => {
  const value = get(weekendMeetingWTStudyConductorDefaultState);
  const useDisplayName = get(displayNameMeetingsEnableState);
  const persons = get(personsState);
  const fullnameOption = get(fullnameOptionState);

  if (value.length === 0) return '';

  const person = persons.find((record) => record.person_uid === value);

  if (!person) return '';

  let result = '';

  if (useDisplayName) {
    result = person.person_data.person_display_name.value;
  }

  if (!useDisplayName) {
    result = buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }

  return result;
});

export const isPublicTalkCoordinatorState = atom((get) => {
  const isAdmin = get(adminRoleState);
  const userRole = get(congRoleState);
  const user_in_group = get(userInLanguageGroupState);
  const dataView = get(userDataViewState);

  if (isAdmin) return true;

  const hasRole = userRole.includes('public_talk_schedule');

  if (!hasRole) return false;

  if (user_in_group && dataView === 'main') return false;

  return true;
});

export const isWeekendEditorState = atom((get) => {
  const isAdmin = get(adminRoleState);
  const userRole = get(congRoleState);
  const user_in_group = get(userInLanguageGroupState);
  const dataView = get(userDataViewState);

  if (isAdmin) return true;

  const hasRole = userRole.includes('weekend_schedule');

  if (!hasRole) return false;

  if (user_in_group && dataView === 'main') return false;

  return true;
});

/**
 * Semana a la que debe saltar el programa semanal cuando cambie de pestaña.
 *
 * Cada pestaña guarda su propia semana seleccionada, así que ir a "Ver reunión
 * completa" desde la visita del superintendente aterrizaba en la semana que
 * esa pestaña tuviera puesta, no en la de la visita. Quien salta deja aquí la
 * semana; la pestaña que llega la aplica y la borra.
 */
export const jumpToWeekState = atom(null as string | null);
