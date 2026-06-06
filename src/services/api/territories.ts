import { apiDefault } from './common';

export const apiSendTerritoryPush = async (
  target_person_uids: string[],
  title: string,
  body: string
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

  const res = await fetch(
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
      }),
    }
  );

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data.message || 'Error sending push notifications');
  }

  return { status: res.status, data };
};
