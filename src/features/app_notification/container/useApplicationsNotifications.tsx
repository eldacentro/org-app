import { useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { applicationsNewState } from '@states/persons';
import {
  applicationsSeenState,
  notificationsState,
} from '@states/notification';
import { pruneSeenApplications } from '@services/app/applications_seen';
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
 *
 * Dos límites, los dos a propósito:
 *
 * - Solo al COMITÉ DE SERVICIO (coordinador, secretario y superintendente de
 *   servicio), que son los tres que firman la aprobación. Un anciano que no
 *   está en el comité ve la página, pero no puede hacer nada con la
 *   solicitud, así que el aviso solo sería ruido.
 * - El aviso se retira en cuanto se ABRE la solicitud, aunque siga pendiente
 *   de aprobar: ya está vista, y sigue en su página, que es donde se atiende.
 */
const useApplicationsNotifications = () => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const setNotifications = useSetAtom(notificationsState);

  const applications = useAtomValue(applicationsNewState);
  const [seen, setSeen] = useAtom(applicationsSeenState);

  const pendingIds = useMemo(() => {
    return applications.map((record) => record.request_id);
  }, [applications]);

  // El registro de "ya vistas" se limpia de lo que ya no está pendiente, para
  // que no crezca sin fin y para que una solicitud nueva vuelva a avisar.
  // Mientras no haya pendientes no se toca (ver pruneSeenApplications): al
  // arrancar la aplicación están vacías por no haber bajado todavía.
  useEffect(() => {
    setSeen((prev) => pruneSeenApplications(prev, pendingIds));
  }, [pendingIds, setSeen]);

  const entries = useMemo(() => {
    const seenIds = new Set(seen);

    return applications
      .filter((record) => !seenIds.has(record.request_id))
      .map((record) => ({
        request_id: record.request_id,
        person_uid: record.person_uid,
        months: record.months ?? [],
      }));
  }, [applications, seen]);

  const lastSubmitted = useMemo(() => {
    if (entries.length === 0) return '';

    const pending = applications.filter((record) =>
      entries.some((entry) => entry.request_id === record.request_id)
    );

    // La fecha del aviso es la de la solicitud sin ver más reciente, y de ahí
    // sale su posición en la lista de avisos.
    return pending.reduce(
      (acc, record) => (record.submitted > acc ? record.submitted : acc),
      pending[0].submitted
    );
  }, [applications, entries]);

  useEffect(() => {
    if (!isServiceCommittee || entries.length === 0) {
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
  }, [isServiceCommittee, entries, lastSubmitted, t, setNotifications]);
};

export default useApplicationsNotifications;
