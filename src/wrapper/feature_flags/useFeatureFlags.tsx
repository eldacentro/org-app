import { useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { getApp } from 'firebase/app';
import { getId, getInstallations } from 'firebase/installations';
import { useQuery } from '@tanstack/react-query';
import { apiFeatureFlagsGet } from '@services/api/app';
import { apiHostState, featureFlagsState, isOnlineState } from '@states/app';
import { settingsState } from '@states/settings';
import worker from '@services/worker/backupWorker';
import logger from '@services/logger';

/**
 * Cuánto se espera como mucho a los interruptores de funciones antes de abrir
 * la app igualmente. Va por encima del aviso de "está tardando" del logotipo
 * (6 s), para que quien mire la pantalla vea primero el aviso y luego entre,
 * en vez de un salto sin explicación.
 */
const STARTUP_GATE_TIMEOUT_MS = 9000;

const useFeatureFlags = () => {
  const [apiHost, setApiHost] = useAtom(apiHostState);

  const setFeatureFlags = useSetAtom(featureFlagsState);

  const isOnline = useAtomValue(isOnlineState);
  const settings = useAtomValue(settingsState);

  const [isLoading, setIsLoading] = useState(true);
  const [installationId, setInstallationId] = useState('');

  const { data: flags, error } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () =>
      apiFeatureFlagsGet(installationId, settings.user_settings.id),
    enabled: installationId.length > 0,
    retry: 2,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: 'always',
  });

  const featureFlagsEnv = useMemo(() => {
    const flags = Object.keys(import.meta.env).filter((record) =>
      record.startsWith('VITE_FLAGS')
    );

    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      const name = flag.replace('VITE_FLAGS_', '');
      result[name] = import.meta.env[flag] === 'true';
    }

    return result;
  }, []);

  useEffect(() => {
    const loadApi = async () => {
      let tmpHost = import.meta.env.VITE_APP_API_URL;

      if (!tmpHost) {
        if (import.meta.env.VITE_BACKEND_API) {
          tmpHost = import.meta.env.VITE_BACKEND_API;
        } else {
          if (
            import.meta.env.DEV ||
            window.location.host.indexOf('localhost') !== -1
          ) {
            tmpHost = 'http://localhost:8000/';
          } else {
            tmpHost = 'https://api.organized-app.com/';
          }
        }
      }

      if (!tmpHost.endsWith('/')) {
        tmpHost += '/';
      }

      setApiHost(tmpHost);
      worker.postMessage({ field: 'apiHost', value: tmpHost });

      logger.info('app', `the client API is set to: ${tmpHost}`);
    };

    loadApi();
  }, [setApiHost]);

  useEffect(() => {
    const handleLoading = async () => {
      try {
        const app = getApp();

        let id: string;

        if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
          id = 'ad00115e-46da-476c-a7bf-d160b4eaa1e6';
        } else {
          const installations = getInstallations(app);

          id = await getId(installations);
        }

        setInstallationId(id);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };

    if (isOnline && apiHost.length > 0) {
      handleLoading();
    }

    if (!isOnline) {
      setFeatureFlags(featureFlagsEnv);
      setIsLoading(false);
      worker.postMessage({ field: 'FEATURE_FLAGS', value: featureFlagsEnv });
    }
  }, [isOnline, apiHost, setFeatureFlags, featureFlagsEnv]);

  // Tope para poder ABRIR LA APP aunque esto no conteste.
  //
  // `navigator.onLine` dice "sí" siempre que haya wifi, aunque esa wifi no
  // llegue a ninguna parte: un portal cautivo de hotel, una red con el pago
  // caducado, el móvil "conectado" sin datos. Con eso, `isOnline` es cierto,
  // se pide el identificador de instalación a Firebase, y esa llamada no
  // rechaza — se queda colgando. `isLoading` no bajaba nunca y la app se
  // quedaba PARA SIEMPRE en el logotipo latiendo.
  //
  // Y es el peor caso posible, porque le pasa justo a quien ya tiene todos sus
  // datos en el dispositivo y solo quería consultar el programa: no necesita
  // la red para nada, y la red le impedía entrar.
  //
  // Pasado el tope se sigue con los interruptores del entorno. No se pierde
  // nada: son los valores por defecto con los que se compiló esta versión, y
  // si la conexión aparece luego, la consulta de arriba los actualiza sola.
  useEffect(() => {
    // El temporizador solo está armado mientras se espera, y se desarma solo
    // en cuanto los interruptores llegan por cualquiera de los otros caminos.
    if (!isLoading) return;

    const id = setTimeout(() => {
      logger.warn(
        'app',
        'los interruptores de funciones no contestaron a tiempo: se abre la aplicación con los del entorno'
      );

      setFeatureFlags(featureFlagsEnv);
      worker.postMessage({ field: 'FEATURE_FLAGS', value: featureFlagsEnv });
      setIsLoading(false);
    }, STARTUP_GATE_TIMEOUT_MS);

    return () => clearTimeout(id);
  }, [isLoading, setFeatureFlags, featureFlagsEnv]);

  useEffect(() => {
    if (isOnline) {
      if (!flags) return;

      const mergedFlags = { ...flags, ...featureFlagsEnv };
      setFeatureFlags(mergedFlags);
      setIsLoading(false);
      worker.postMessage({ field: 'FEATURE_FLAGS', value: mergedFlags });
    }
  }, [isOnline, flags, featureFlagsEnv, setFeatureFlags]);

  useEffect(() => {
    if (error) {
      setFeatureFlags(featureFlagsEnv);
      setIsLoading(false);
      worker.postMessage({ field: 'FEATURE_FLAGS', value: featureFlagsEnv });
    }
  }, [error, featureFlagsEnv, setFeatureFlags]);

  return { isLoading, installationId };
};

export default useFeatureFlags;
