import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { pocketStartup } from '@services/app';
import { isPocketSignUpState } from '@states/app';
import logger from '@services/logger';

const useStartup = () => {
  const isSignUp = useAtomValue(isPocketSignUpState);

  useEffect(() => {
    logger.info('app', 'pocket signup check ran');
    // pocketStartup relanza el error para quien quiera tratarlo; aquí nadie lo
    // hacía y quedaba como promesa rechazada sin manejar (la pantalla se
    // quedaba a medias, sin explicación). El propio pocketStartup ya deja la
    // interfaz en el estado correcto antes de lanzar.
    pocketStartup().catch((error) => {
      logger.error('app', `pocket startup failed: ${error?.message}`);
    });
  }, []);

  return { isSignUp };
};

export default useStartup;
