import { useAtomValue } from 'jotai';
import {
  congAccountConnectedState,
  firstSyncDoneState,
  isOnlineState,
} from '@states/app';

/**
 * ¿Está este dispositivo esperando todavía su primera descarga de datos?
 *
 * Existe porque el panel no sabía distinguir "sé que no tienes asignaciones"
 * de "todavía no sé si tienes". Al entrar por primera vez, al volver a abrir
 * sesión o en un móvil nuevo, la tarjeta decía "No tienes asignaciones" con un
 * 0 grande mientras los datos venían de camino, y el hermano cerraba la app
 * creyendo que no le tocaba nada. Las dos cosas se ven idénticas en pantalla,
 * pero significan lo contrario.
 *
 * `pending` solo es cierto cuando de verdad falta información: hay una cuenta
 * conectada (sin cuenta no va a llegar nada nunca, y el aviso se quedaría para
 * siempre) y este dispositivo no ha completado ninguna sincronización.
 *
 * `offline` separa el caso que sí puede eternizarse: sin conexión en el primer
 * arranque no llega nada, y decir "descargando" ahí sería mentir. Quien lo use
 * tiene que dar el otro mensaje.
 */
const useFirstSyncPending = () => {
  const firstSyncDone = useAtomValue(firstSyncDoneState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const isOnline = useAtomValue(isOnlineState);

  const pending = isConnected && !firstSyncDone;

  return { pending, offline: pending && !isOnline };
};

export default useFirstSyncPending;
