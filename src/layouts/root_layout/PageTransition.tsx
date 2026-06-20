import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';
import { Box } from '@mui/material';

/**
 * Plays a brief fade/slide on the wrapper div whenever the route changes —
 * forward (PUSH) slides in from the right, back (POP, i.e. browser/app back
 * button) slides in from the left, mimicking a native drill-down nav stack
 * instead of the instant cut a route swap normally is.
 *
 * Deliberately does NOT key the wrapper by location — keying would force
 * React to unmount/remount whatever Outlet renders on every navigation,
 * including param-only changes (e.g. /persons/123 -> /persons/456) that
 * previously just re-rendered in place. This only toggles a CSS class on
 * the wrapper itself; nothing about component mount/unmount changes.
 */
const PageTransition = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    const el = containerRef.current;
    if (!el) return;

    const className =
      navigationType === 'POP'
        ? 'page-transition--back'
        : 'page-transition--forward';

    el.classList.remove('page-transition--forward', 'page-transition--back');
    // Force a reflow so the animation restarts even if the same class name
    // would otherwise be re-applied (e.g. two POPs in a row).
    void el.offsetWidth;
    el.classList.add(className);
  }, [location.pathname, navigationType]);

  return (
    <Box ref={containerRef}>
      <Outlet />
    </Box>
  );
};

export default PageTransition;
