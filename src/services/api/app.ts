import { apiDefault, apiFetch } from './common';

export const apiFeatureFlagsGet = async (
  installation: string,
  user?: string
) => {
  try {
    const { apiHost, appVersion: appversion, idToken } = await apiDefault();

    const res = await apiFetch(`${apiHost}api/v3/public/feature-flags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        appclient: 'organized',
        appversion,
        installation,
        user,
      },
    });

    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data?.message);
    }

    return data as Record<string, boolean>;
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

/**
 * La descripción de un vídeo de jw.org.
 *
 * Va por nuestro servidor y no directa a jw.org, y no por gusto: jw.org publica
 * la descripción en la página del vídeo pero NO manda la cabecera que
 * autorizaría a otro sitio a leerla, así que el navegador corta la petición
 * antes de que salga. Entre servidores esa restricción no existe.
 *
 * Sin descripción se devuelve cadena vacía, que no es un fallo: hay vídeos que
 * no la llevan. Un fallo de verdad —jw.org caído, sin conexión— sube como
 * excepción para poder decirlo con esas palabras.
 */
export const apiJwVideoDescriptionGet = async (lank: string) => {
  const { apiHost, appVersion: appversion, JWLang } = await apiDefault();

  if (apiHost === '') return '';

  const res = await apiFetch(
    `${apiHost}api/v3/public/jw-video-description?lank=${encodeURIComponent(lank)}&language=${encodeURIComponent(JWLang.toUpperCase())}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        appclient: 'organized',
        appversion,
      },
    }
  );

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data?.message || 'JW_FETCH_FAILED');
  }

  return (data?.description as string) || '';
};

/**
 * El número de una congregación, a partir del identificador que da el buscador.
 *
 * El buscador de congregaciones devuelve nombre, dirección, horarios,
 * coordenadas y circuito, pero NO el número — y sin él una congregación del
 * catálogo se queda sin su etiqueta. jw.org sí lo publica, y el identificador
 * que devuelve el buscador es el mismo que usa jw.org, así que no hay que
 * emparejar nombres.
 *
 * Va por nuestro servidor por lo mismo que la descripción de los vídeos: jw.org
 * no deja pedírselo desde el navegador.
 *
 * Cadena vacía = jw.org no lo conoce. No es un fallo: se escribe a mano, que es
 * lo que se hacía siempre.
 */
export const apiJwCongregationNumberGet = async (guid: string) => {
  const { apiHost, appVersion: appversion } = await apiDefault();

  if (apiHost === '' || !guid) return '';

  const res = await apiFetch(
    `${apiHost}api/v3/public/jw-congregation-number?guid=${encodeURIComponent(guid)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        appclient: 'organized',
        appversion,
      },
    }
  );

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data?.message || 'JW_FETCH_FAILED');
  }

  return (data?.number as string) || '';
};
