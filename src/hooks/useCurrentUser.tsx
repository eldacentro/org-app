import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { formatDate } from '@utils/date';
import { personsState } from '@states/persons';
import {
  accountTypeState,
  settingsState,
  userDataViewState,
  userLocalUIDState,
} from '@states/settings';
import { congAccountConnectedState } from '@states/app';
import {
  fieldWithLanguageGroupsState,
  languageGroupsState,
} from '@states/field_service_groups';
import usePerson from '@features/persons/hooks/usePerson';
import {
  currentActivityMonth,
  personWasPublisherBy,
} from '@services/app/publisher_status';
import { personIsPioneerNow } from '@services/app/persons';

const useCurrentUser = () => {
  const { personIsEnrollmentActive, personIsBaptizedPublisher } = usePerson();

  const userUID = useAtomValue(userLocalUIDState);
  const persons = useAtomValue(personsState);
  const settings = useAtomValue(settingsState);
  const connected = useAtomValue(congAccountConnectedState);
  const accountType = useAtomValue(accountTypeState);
  const fieldGroups = useAtomValue(fieldWithLanguageGroupsState);
  const languageGroups = useAtomValue(languageGroupsState);
  const dataView = useAtomValue(userDataViewState);

  const person = useMemo(() => {
    return persons.find((record) => record.person_uid === userUID);
  }, [persons, userUID]);

  const first_report = useMemo(() => {
    if (!person) return;

    if (person.person_data.first_report?.value) {
      return formatDate(
        new Date(person.person_data.first_report.value),
        'yyyy/MM'
      );
    }

    if (
      !person.person_data.publisher_unbaptized &&
      !person.person_data.publisher_baptized
    ) {
      return;
    }

    // get all status history
    let history = [
      ...person.person_data.publisher_unbaptized.history,
      ...person.person_data.publisher_baptized.history,
    ];

    history = history.filter(
      (record) => !record._deleted && record.start_date?.length > 0
    );

    history.sort((a, b) => a.start_date.localeCompare(b.start_date));

    if (history.length === 0) return;

    const firstDate = new Date(history.at(0).start_date);

    return formatDate(firstDate, 'yyyy/MM');
  }, [person]);

  const isPublisher = useMemo(() => {
    if (!person) return false;

    if (
      !person.person_data.publisher_unbaptized &&
      !person.person_data.publisher_baptized
    ) {
      return false;
    }

    // "¿Es publicador?" para darle o no la sección de Predicación. NO puede
    // ser "¿tiene un tramo abierto que cubra este mes?": a quien se le cierra
    // el tramo —porque lleva 6 meses sin informar, o porque se lo cerraron por
    // error— le desaparecía la sección entera, y con ella la única forma de
    // entregar un informe y volver a estar activo. Se quedaba fuera para
    // siempre sin que nadie se enterara.
    return personWasPublisherBy(person, currentActivityMonth());
  }, [person]);

  // ¿Es precursor este mes, del tipo que sea? No es un rol de la cuenta sino
  // un nombramiento de la persona, así que no sale de `cong_role` sino de sus
  // inscripciones. Lo usa lo que se dirige a los precursores como grupo — hoy,
  // qué eventos le tocan en la agenda.
  const isPioneer = useMemo(() => {
    if (!person) return false;

    return personIsPioneerNow(person);
  }, [person]);

  const enable_AP_application = useMemo(() => {
    if (!connected) return false;

    if (!person) return false;

    if (!settings.cong_settings.data_sync.value) return false;

    if (!isPublisher) return false;

    const isBaptized = personIsBaptizedPublisher(person);

    if (!isBaptized) return false;

    const isAP = personIsEnrollmentActive(person, 'AP');
    const isFMF = personIsEnrollmentActive(person, 'FMF');
    const isFR = personIsEnrollmentActive(person, 'FR');
    const isFS = personIsEnrollmentActive(person, 'FS');

    const hasEnrollments = isAP || isFMF || isFR || isFS;

    return !hasEnrollments;
  }, [
    isPublisher,
    connected,
    person,
    personIsBaptizedPublisher,
    personIsEnrollmentActive,
    settings,
  ]);

  const userRole = useMemo(() => {
    return settings.user_settings.cong_role;
  }, [settings]);

  const isAdmin = useMemo(() => {
    return userRole.some(
      (role) =>
        role === 'admin' || role === 'coordinator' || role === 'secretary'
    );
  }, [userRole]);

  const isElder = useMemo(() => {
    if (isAdmin) return true;

    if (accountType === 'pocket') return false;

    return userRole.includes('elder');
  }, [accountType, isAdmin, userRole]);

  const isServiceCommittee = useMemo(() => {
    if (isAdmin) return true;

    // only check for service overseer since coordinator and secretary are already admin
    return userRole.includes('service_overseer');
  }, [isAdmin, userRole]);

  const my_group = useMemo(() => {
    const findGroup = fieldGroups.find((record) =>
      record.group_data.members.some((member) => member.person_uid === userUID)
    );

    return findGroup;
  }, [fieldGroups, userUID]);

  const languageGroup = useMemo(() => {
    return languageGroups.find((record) => record.group_id === dataView);
  }, [languageGroups, dataView]);

  const user_in_group = useMemo(() => {
    return languageGroups.some((record) =>
      record.group_data.members.some((member) => member.person_uid === userUID)
    );
  }, [userUID, languageGroups]);

  const isGroup = useMemo(() => {
    return languageGroups.some((record) => record.group_id === dataView);
  }, [languageGroups, dataView]);

  const isLanguageGroupOverseer = useMemo(() => {
    if (accountType === 'pocket') return false;

    if (isAdmin) return true;

    if (!isGroup) return false;

    return userRole.includes('language_group_overseers');
  }, [accountType, isAdmin, userRole, isGroup]);

  const isPersonEditor = useMemo(() => {
    if (isAdmin) return true;

    const hasRole = userRole.some(
      (role) =>
        role === 'midweek_schedule' ||
        role === 'weekend_schedule' ||
        role === 'public_talk_schedule'
    );

    if (!hasRole) return false;

    if (!isGroup) return true;

    if (isGroup && user_in_group) return true;

    return false;
  }, [isAdmin, userRole, user_in_group, isGroup]);

  const isPersonViewer = useMemo(() => {
    if (accountType === 'pocket') return false;

    if (isPersonEditor) return true;

    return userRole.some((role) => role === 'elder');
  }, [accountType, isPersonEditor, userRole]);

  const isAttendanceEditor = useMemo(() => {
    if (isAdmin) return true;

    if (isGroup && user_in_group && isLanguageGroupOverseer) return true;

    const hasRole = userRole.includes('attendance_tracking');

    if (!hasRole) return false;

    if (!isGroup) return true;

    if (isGroup && user_in_group) return true;

    return false;
  }, [isAdmin, userRole, user_in_group, isGroup, isLanguageGroupOverseer]);

  const isAppointed = useMemo(() => {
    if (accountType === 'pocket') return false;

    if (isAdmin) return true;

    return userRole.some((role) => role === 'elder' || role === 'ms');
  }, [accountType, isAdmin, userRole]);

  const isMidweekEditor = useMemo(() => {
    if (isAdmin) return true;

    if (isGroup && user_in_group && isLanguageGroupOverseer) return true;

    const hasRole = userRole.includes('midweek_schedule');

    if (!hasRole) return false;

    if (!isGroup) return true;

    if (isGroup && user_in_group) return true;

    return false;
  }, [isAdmin, userRole, user_in_group, isGroup, isLanguageGroupOverseer]);

  const isDepartmentsEditor = useMemo(() => {
    if (isAdmin) return true;

    return userRole.includes('departments_schedule');
  }, [isAdmin, userRole]);

  const isWeekendEditor = useMemo(() => {
    if (isAdmin) return true;

    if (isGroup && user_in_group && isLanguageGroupOverseer) return true;

    const hasRole = userRole.includes('weekend_schedule');

    if (!hasRole) return false;

    if (!isGroup) return true;

    if (isGroup && user_in_group) return true;

    return false;
  }, [isAdmin, userRole, user_in_group, isGroup, isLanguageGroupOverseer]);

  const isMeetingEditor = useMemo(() => {
    return isMidweekEditor || isWeekendEditor;
  }, [isMidweekEditor, isWeekendEditor]);

  const isSecretary = useMemo(() => {
    if (isAdmin) return true;

    return userRole.includes('secretary');
  }, [isAdmin, userRole]);

  const isPublicTalkCoordinator = useMemo(() => {
    if (isAdmin) return true;

    if (isGroup && user_in_group && isLanguageGroupOverseer) return true;

    const hasRole = userRole.includes('public_talk_schedule');

    if (!hasRole) return false;

    if (!isGroup) return true;

    if (isGroup && user_in_group) return true;

    return false;
  }, [isAdmin, userRole, user_in_group, isGroup, isLanguageGroupOverseer]);

  const isGroupOverseer = useMemo(() => {
    if (accountType === 'pocket') return false;

    if (isAdmin) return true;

    return userRole.includes('group_overseers');
  }, [accountType, isAdmin, userRole]);

  const isSettingsEditor = useMemo(() => {
    if (!isGroup && isAdmin) return true;

    if (isGroup && (isAdmin || isLanguageGroupOverseer)) return true;

    return false;
  }, [isGroup, isAdmin, isLanguageGroupOverseer]);

  /**
   * ¿Tiene esta cuenta algún documento que exportar?
   *
   * Sirve para no enseñarle a un publicador el interruptor de «exportación a
   * PDF» de Mi cuenta: encenderlo no le haría aparecer ni un botón, porque no
   * llega a ninguna página que exporte.
   *
   * La lista NO está inventada: es exactamente quién pasa el guardia de cada
   * página que tiene botón de exportar (ver los `*Route` de `App.tsx`).
   *
   *   Próximos eventos ............ anciano o administrador
   *   Exhibidores y Salidas ....... comité de servicio
   *   Reunión de entre semana ..... quien la edita
   *   Departamentos ............... quien edita departamentos o la de entre semana
   *   Reunión de fin de semana .... quien la edita o el coordinador de discursos
   *
   * De ahí sale el caso que importa: un siervo ministerial no tiene nada que
   * exportar por serlo, pero si le dan el programa de Departamentos sí, y el
   * interruptor le aparece solo. `isAdmin` cumple todas por dentro.
   */
  const canExportAnySchedule = useMemo(() => {
    return (
      isElder ||
      isServiceCommittee ||
      isMidweekEditor ||
      isWeekendEditor ||
      isDepartmentsEditor ||
      isPublicTalkCoordinator
    );
  }, [
    isElder,
    isServiceCommittee,
    isMidweekEditor,
    isWeekendEditor,
    isDepartmentsEditor,
    isPublicTalkCoordinator,
  ]);

  return {
    canExportAnySchedule,
    person,
    first_report,
    enable_AP_application,
    isAdmin,
    isPublisher,
    isPioneer,
    isServiceCommittee,
    isElder,
    isPersonEditor,
    isAttendanceEditor,
    isAppointed,
    isMidweekEditor,
    isWeekendEditor,
    isDepartmentsEditor,
    accountType,
    isMeetingEditor,
    isSecretary,
    isPersonViewer,
    isPublicTalkCoordinator,
    isGroupOverseer,
    my_group,
    isGroup,
    languageGroup,
    isLanguageGroupOverseer,
    isSettingsEditor,
  };
};

export default useCurrentUser;
