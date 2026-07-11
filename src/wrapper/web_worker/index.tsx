import { PropsWithChildren } from 'react';
import useWebWorker from './useWebWorker';
import useInstantSync from './useInstantSync';

const WebWorker = ({ children }: PropsWithChildren) => {
  useWebWorker();
  useInstantSync();

  return children;
};

export default WebWorker;
