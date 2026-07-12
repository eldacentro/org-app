import { PropsWithChildren } from 'react';
import useWebWorker from './useWebWorker';
import useInstantSync from './useInstantSync';
import useForceUpdate from './useForceUpdate';

const WebWorker = ({ children }: PropsWithChildren) => {
  useWebWorker();
  useInstantSync();
  useForceUpdate();

  return children;
};

export default WebWorker;
