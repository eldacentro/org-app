import { useEffect, useRef } from 'react';

const useUnauthorizedRole = () => {
  const anchorRef = useRef<HTMLElement | null>(null);

  const reloadApp = () => {
    window.location.reload();
  };

  useEffect(() => {
    const tryAgain = anchorRef.current;

    tryAgain?.addEventListener('click', reloadApp);

    return () => {
      if (tryAgain) tryAgain?.removeEventListener('click', reloadApp);
    };
  }, [anchorRef]);

  return { anchorRef, reloadApp };
};

export default useUnauthorizedRole;
