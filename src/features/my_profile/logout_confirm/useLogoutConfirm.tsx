import { useRef, useState } from 'react';
import { handleDeleteDatabase } from '@services/app';
import { apiDeletePushToken, apiUserLogout } from '@services/api/user';
import { revokePushToken } from '@services/firebase/messaging';
import { currentAuthUser } from '@services/firebase/auth';
import { clearKeysSecurely } from '@services/secure_storage';
import { intentarConLimite } from '@utils/con_limite';

/**
 * Cerrar sesión, y que se note que se está cerrando.
 *
 * ANTES: se pulsaba «Cerrar sesión» y no pasaba nada visible durante todo lo
 * que tardaba en avisar al servidor —retirar el aviso del móvil, revocar la
 * sesión—, y cada uno de esos pasos podía no volver NUNCA: pedir el token a
 * Firebase, o retirar el registro del aviso en el iPhone, se quedan colgados
 * cuando el almacén del navegador se atasca. Desde fuera: un botón que no hace
 * nada. La gente acababa borrando la app y volviéndola a instalar.
 *
 * AHORA: el botón dice «Cerrando sesión…» en el acto, no se puede pulsar dos
 * veces, lo del servidor se hace por cortesía con un tope de pocos segundos,
 * y el borrado local llega siempre — deja el dispositivo como recién
 * instalado (ver `handleDeleteDatabase`).
 */
const useLogoutConfirm = () => {
  const [cerrando, setCerrando] = useState(false);
  const enCursoRef = useRef(false);

  const handleLogout = async () => {
    if (enCursoRef.current) return;
    enCursoRef.current = true;
    setCerrando(true);

    // Leer el uid antes de cerrar la sesión de Google, que lo borra.
    const uid = currentAuthUser()?.uid;

    // Avisar al servidor: retirar el aviso del móvil de este dispositivo y
    // revocar su sesión (si no, quedaban sesiones fantasma en la lista). Por
    // cortesía: si no contesta, el cierre local sigue igual.
    await Promise.all([
      intentarConLimite(
        apiDeletePushToken().then(() => apiUserLogout()),
        6_000,
        'cerrar la sesión en el servidor'
      ),
      intentarConLimite(revokePushToken(), 4_000, 'retirar el aviso del móvil'),
    ]);

    // Olvidar las claves guardadas en el dispositivo solo al cerrar sesión a
    // propósito (no en los borrados automáticos). La limpieza completa de
    // abajo borra además su almacén entero.
    if (uid) {
      await intentarConLimite(clearKeysSecurely(uid), 3_000, 'olvidar claves');
    }

    await handleDeleteDatabase({ limpiezaCompleta: true });
  };

  return { handleLogout, cerrando };
};

export default useLogoutConfirm;
