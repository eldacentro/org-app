import { PropsWithChildren } from 'react';
import useWebWorker from './useWebWorker';
import useInstantSync from './useInstantSync';
import useSpeakerOverrides from './useSpeakerOverrides';
import useForceUpdate from './useForceUpdate';

const WebWorker = ({ children }: PropsWithChildren) => {
  useWebWorker();
  useInstantSync();
  useSpeakerOverrides();
  useForceUpdate();

  return children;
};

export default WebWorker;
