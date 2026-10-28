import { store } from '@states/index';
import { accountTypeState } from '@states/settings';
import { ResultadoReconexion } from '@states/app';
import { apiValidateMe } from '@services/api/user';
import { apiPocketValidateMe } from '@services/api/pocket';
import { currentAuthUser } from '@services/firebase/auth';
import { recoverVipSession } from '@services/app/session_recovery';
import { setCongAccountConnected } from '@services/states/app';
import worker from '@services/worker/backupWorker';
import { conLimite, LimiteDeTiempo } from '@utils/con_limite';

/**
 * Reconectar la cuenta a mano, y decir SIEMPRE cómo ha ido.
 *
 * Esto era el cuerpo del botón «Reconectar cuenta» del menú, y tenía tres
 * salidas que no decían nada: si el servidor contestaba algo que no fuera
 * 200, si algo fallaba, o si la sesión ya no valía, RECARGABA LA APP sin
 * avisar. Al volver, la cuenta seguía igual de desconectada —el motivo no se
 * había ido—, así que para quien lo pulsaba el botón simplemente «no hacía
 * nada». Ahora no recarga a ciegas: devuelve el motivo y quien llama lo
 * cuenta con palabras, y ofrece lo que de verdad lo arregla.
 *
 * Solo recarga en un caso, y avisando: cuando es el propio navegador el que
 * no contesta (`atascada`), que es lo único que una recarga sí cura.
 */

/** Los códigos de Firebase que significan «esta sesión ya no sirve». */
const SESION_MUERTA = [
  'auth/user-token-expired',
  'auth/user-disabled',
  'auth/invalid-user-token',
  'auth/user-not-found',
];

const marcarConectada = () => {
  setCongAccountConnected(true);
  worker.postMessage('startWorker');
};

const porFalloDeRed = (error: unknown): ResultadoReconexion => {
  if (error instanceof LimiteDeTiempo) return 'atascada';
  return navigator.onLine ? 'servidor' : 'sin_red';
};

export const reconectarCuenta = async (): Promise<ResultadoReconexion> => {
  if (!navigator.onLine) return 'sin_red';

  // Cuentas sin Google (pocket): su sesión es la cookie del dispositivo.
  if (store.get(accountTypeState) === 'pocket') {
    try {
      const { status } = await apiPocketValidateMe();

      if (status === 200) {
        marcarConectada();
        return 'conectada';
      }

      // El dispositivo ya no está vinculado a la cuenta.
      if (status === 403) return 'vinculo';

      return 'servidor';
    } catch (error) {
      return porFalloDeRed(error);
    }
  }

  const user = currentAuthUser();

  // Sin sesión de Google en el dispositivo no hay nada que refrescar: solo
  // la repone volver a entrar.
  if (!user) return 'reentrar';

  try {
    const idToken = await conLimite(user.getIdToken(true), 15_000, 'token');
    worker.postMessage({ field: 'idToken', value: idToken });
  } catch (error) {
    if (error instanceof LimiteDeTiempo) return 'atascada';

    const code = (error as { code?: string })?.code ?? '';

    if (SESION_MUERTA.includes(code)) return 'reentrar';
    if (code === 'auth/network-request-failed' || !navigator.onLine) {
      return 'sin_red';
    }

    return 'servidor';
  }

  try {
    let { status, result } = await apiValidateMe();

    // El servidor no reconoce la sesión pero la de Google está viva: casi
    // siempre se repone sola pidiendo sesión otra vez. Ver `session_recovery`.
    if (status === 403 || status === 400) {
      const verdict = await recoverVipSession(
        result?.message ?? String(status),
        {
          force: true,
        }
      );

      if (verdict === 'terminal') return 'reentrar';
      if (verdict === 'retry') return 'servidor';

      ({ status, result } = await apiValidateMe());
    }

    if (status === 200) {
      marcarConectada();
      return 'conectada';
    }

    return 'servidor';
  } catch (error) {
    return porFalloDeRed(error);
  }
};

/**
 * La app se recargó para desatascar la reconexión. Se apunta antes de
 * recargar para que, al volver, se pueda decir cómo ha ido en vez de
 * aparecer sin más en el mismo sitio.
 */
const CLAVE_RECARGA = 'elda_reconexion_recarga';

export const apuntarRecargaPorReconexion = () => {
  try {
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
  } catch {
    // Sin almacén se recarga igual; solo se pierde el aviso de después.
  }
};

/** ¿Se acaba de recargar para reconectar? (en los últimos dos minutos) */
export const leerRecargaPorReconexion = (): boolean => {
  try {
    const valor = Number(sessionStorage.getItem(CLAVE_RECARGA));
    sessionStorage.removeItem(CLAVE_RECARGA);
    return valor > 0 && Date.now() - valor < 120_000;
  } catch {
    return false;
  }
};
