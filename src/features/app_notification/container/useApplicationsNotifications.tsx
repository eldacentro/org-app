import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { applicationsNewState } from '@states/persons';
import { notificationsState } from '@states/notification';
import { PioneerApplicationNotificationType } from '@definition/notification';

/**
 * El aviso de solicitudes de precursor auxiliar.
 *
 * Existía la página (`/pioneer-applications`) y llegaban los datos, pero nada
 * avisaba de que había una solicitud firmada esperando: el hermano firmaba y
 * el secretario no se enteraba, porque el único sitio donde se veía era una
 * página a la que no tenía motivo para entrar. Esto es el enganche que
 * faltaba, con el mismo patrón que informes sin verificar o peticiones de
 * territorio.
 */
const useApplicationsNotifications = () => {
  const { t } = useAppTranslation();

  const { isElder } = useCurrentUser();

  const setNotifications = useSetAtom(notificationsState);

  const applications = useAtomValue(applicationsNewState);

  const entries = useMemo(() => {
    return applications.map((record) => ({
      request_id: record.request_id,
      person_uid: record.person_uid,
      months: record.months ?? [],
    }));
  }, [applications]);

  const lastSubmitted = useMemo(() => {
    if (applications.length === 0) return '';

    // applicationsNewState ya viene ordenado por `submitted` descendente, pero
    // no se da por supuesto: la fecha del aviso es la de la solicitud más
    // reciente, y de ahí sale su posición en la lista de avisos.
    return applications.reduce(
      (acc, record) => (record.submitted > acc ? record.submitted : acc),
      applications[0].submitted
    );
  }, [applications]);

  useEffect(() => {
    // Solo los ancianos (los administradores entre ellos) pueden atenderlas.
    if (!isElder || entries.length === 0) {
      setNotifications((prev) =>
        prev.filter((record) => record.id !== 'pioneer-applications')
      );

      return;
    }

    const notification: PioneerApplicationNotificationType = {
      id: 'pioneer-applications',
      title: t('tr_pioneerApplicationsTitle'),
      description: t('tr_pioneerApplicationsDesc'),
      date: lastSubmitted,
      icon: 'pioneer-applications',
      count: entries.length,
      applications: entries,
      enableRead: false,
      read: false,
    };

    setNotifications((prev) => {
      const newValue = prev.filter(
        (record) => record.id !== 'pioneer-applications'
      );
      newValue.push(notification);

      return newValue;
    });
  }, [isElder, entries, lastSubmitted, t, setNotifications]);
};

export default useApplicationsNotifications;
