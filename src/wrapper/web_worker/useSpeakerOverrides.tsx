import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { congIDState } from '@states/settings';
import { congAccountConnectedState } from '@states/app';
import { speakerOverridesState } from '@states/speaker_overrides';
import { subscribeCorreccionesOradores } from '@services/firebase/speaker_overrides';

/**
 * Escucha las correcciones a los discursos del circuito.
 *
 * Va aquí, junto al resto de lo que la aplicación mantiene vivo de fondo, y no
 * en la pantalla del catálogo: quien programa el fin de semana también tiene que
 * ver los discursos buenos, y esa pantalla es otra.
 */
const useSpeakerOverrides = () => {
  const congId = useAtomValue(congIDState);
  const conectado = useAtomValue(congAccountConnectedState);

  const setCorrecciones = useSetAtom(speakerOverridesState);

  useEffect(() => {
    if (!conectado || !congId) return;

    return subscribeCorreccionesOradores(congId, setCorrecciones);
  }, [conectado, congId, setCorrecciones]);
};

export default useSpeakerOverrides;
