import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { store } from '@states/index';
import { reconexionState, ResultadoReconexion } from '@states/app';
import { accountTypeState } from '@states/settings';
import {
  apuntarRecargaPorReconexion,
  reconectarCuenta,
} from '@services/app/reconectar_cuenta';
import {
  setIsAppLoad,
  setIsSetup,
  setReentrarCuenta,
} from '@services/states/app';
import { userSignOut } from '@services/firebase/auth';
import { intentarConLimite } from '@utils/con_limite';

/**
 * Reconectar la cuenta y volver a entrar, compartido por el aviso de cuenta
 * desconectada y por el menú de la cuenta.
 *
 * El estado vive en un átomo y no en cada componente para que los dos digan
 * lo mismo: si se pulsa en el menú, el aviso de la pantalla enseña que se está
 * reconectando y cómo acaba, en vez de que cada sitio vaya por su lado.
 */
const useReconexionCuenta = () => {
  const queryClient = useQueryClient();
  const estado = useAtomValue(reconexionState);
  const accountType = useAtomValue(accountTypeState);

  const reconectar = useCallback(async (): Promise<ResultadoReconexion> => {
    // Uno a la vez, aunque lo pulsen desde dos sitios.
    const actual = store.get(reconexionState);
    if (actual.intentando) return actual.resultado ?? 'servidor';

    store.set(reconexionState, { ...actual, intentando: true });

    const resultado = await reconectarCuenta();

    if (resultado === 'atascada') {
      // Lo único que desatasca el almacén del navegador es recargar. Se
      // apunta para que al volver se diga cómo ha ido.
      apuntarRecargaPorReconexion();
      window.location.reload();
      return resultado;
    }

    if (resultado === 'conectada') {
      // La validación de fondo es la que sabe de roles y de cambios de
      // congregación: se le pide que mire la respuesta nueva.
      queryClient.invalidateQueries({
        queryKey: [accountType === 'pocket' ? 'whoami-pocket' : 'whoami-vip'],
      });
    }

    store.set(reconexionState, {
      intentando: false,
      resultado,
      fallos:
        resultado === 'conectada' ? 0 : store.get(reconexionState).fallos + 1,
    });

    return resultado;
  }, [queryClient, accountType]);

  /**
   * Llevar a la pantalla de acceso SIN borrar nada.
   *
   * Se cierra la sesión de Google (con tope: si el almacén está atascado, no
   * se espera para siempre) y se marca que se quiere volver a entrar, para que
   * el arranque no devuelva a la app como hacía antes. Los datos y las claves
   * del dispositivo se quedan donde están: al entrar con la misma cuenta, todo
   * sigue igual.
   */
  const volverAEntrar = useCallback(async () => {
    await intentarConLimite(userSignOut(), 5_000, 'signOut');

    store.set(reconexionState, {
      intentando: false,
      resultado: null,
      fallos: 0,
    });
    setReentrarCuenta(true);
    setIsSetup(true);
    setIsAppLoad(true);
  }, []);

  return { ...estado, reconectar, volverAEntrar };
};

export default useReconexionCuenta;
