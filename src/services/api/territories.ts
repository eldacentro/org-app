import { apiDefault, apiFetch } from './common';

export const apiSendTerritoryPush = async (
  target_person_uids: string[],
  title: string,
  body: string,
  /** Si se pasa, el backend arma un enlace directo al territorio (en vez de
   *  a la página general de Territorios) para que tocar la notificación
   *  lleve un paso más cerca de "Entregar territorio". */
  territoryId?: string
) => {
  const {
    apiHost,
    appVersion: appversion,
    congID,
    idToken,
  } = await apiDefault();

  if (!congID) {
    throw new Error('No congregation ID found');
  }

  const res = await apiFetch(
    `${apiHost}api/v3/congregations/${congID}/territories/push`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        appclient: 'organized',
        appversion,
      },
      body: JSON.stringify({
        target_person_uids,
        title,
        body,
        ...(territoryId ? { territory_id: territoryId } : {}),
      }),
    }
  );

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data.message || 'Error sending push notifications');
  }

  return { status: res.status, data };
};
