import { useEffect, useState } from 'react';

/**
 * Captures env(safe-area-inset-bottom) ONCE, on mount, instead of reading
 * the live CSS env() value continuously while the page scrolls.
 *
 * Why: in Safari (browser tab), env(safe-area-inset-bottom) is meant to
 * shrink/grow as the bottom toolbar collapses/expands on scroll — that's
 * correct there, because there really is a toolbar occupying that space.
 * In an installed PWA (display: standalone) there's no toolbar at all, but
 * WebKit still runs the same scroll-direction-driven chrome state machine
 * under the hood, so the live env() value keeps fluctuating as if a
 * toolbar were showing/hiding — except nothing is actually there, so a
 * `position: fixed` element anchored with the live env() value visibly
 * shifts for no reason a PWA user can see. Freezing the value at mount
 * (before any scroll has happened) sidesteps that phantom recalculation.
 */
const useStaticSafeAreaInsetBottom = () => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.bottom = '0';
    probe.style.height = '0';
    probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);

    const measured = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    setInset(measured);

    document.body.removeChild(probe);
  }, []);

  return inset;
};

export default useStaticSafeAreaInsetBottom;
