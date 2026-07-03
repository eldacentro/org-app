import { useCallback, useEffect, useState } from 'react';
import { clearCalendarExportTracking } from '@services/calendar_export/tracking';

/**
 * Opt-in preference for the "Añadir al calendario" button in Mis
 * asignaciones. Purely a local/client-side preference — unlike push (which
 * registers an FCM token against the account), there's no permission dance
 * or backend round-trip, so this is a plain synchronous localStorage flag.
 *
 * Disabling clears the export-tracking map (UID/sequence/contentHash per
 * assignment): once the person opts out, comparing future changes against
 * assignments they no longer care about would only produce confusing
 * "phantom" pushes if they opt back in later.
 *
 * Every mounted instance of this hook (the "Mi cuenta" toggle AND the
 * already-open "Mis asignaciones" panel can both be mounted at once) needs
 * to react to the SAME tab flipping the flag — the native `storage` event
 * only fires in OTHER tabs, not the one that made the change — so a small
 * same-tab custom event keeps every instance in sync.
 */
const OPT_IN_KEY = 'organized_calendar-export-enabled';
const CHANGE_EVENT = 'organized:calendar-export-preference-changed';

const readOptIn = () => {
  try {
    return localStorage.getItem(OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeOptIn = (value: boolean) => {
  try {
    localStorage.setItem(OPT_IN_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore storage failures */
  }
};

const useCalendarExportPreference = () => {
  const [enabled, setEnabledState] = useState(readOptIn);

  useEffect(() => {
    const handleChange = () => setEnabledState(readOptIn());
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    writeOptIn(value);
    setEnabledState(value);

    if (!value) clearCalendarExportTracking();

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { enabled, setEnabled };
};

export default useCalendarExportPreference;
