import { PropsWithChildren, useMemo } from 'react';
import { MeetingRunScopeContext } from './scope_context';

export const MeetingRunScope = ({
  week,
  dataView,
  children,
}: PropsWithChildren<{ week: string; dataView: string }>) => {
  const value = useMemo(() => ({ week, dataView }), [week, dataView]);

  return (
    <MeetingRunScopeContext.Provider value={value}>
      {children}
    </MeetingRunScopeContext.Provider>
  );
};
