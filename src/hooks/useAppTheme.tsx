import { isDarkThemeState } from '@states/app';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

const useAppTheme = () => {
  const isDark = useAtomValue(isDarkThemeState);

  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'blue-light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const val = document.documentElement.getAttribute('data-theme');
      setTheme(val || 'blue-light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const themeColor = useMemo(() => {
    if (!theme) return 'blue';
    return theme.split('-')[0] || 'blue';
  }, [theme]);

  const darkValue = isDark ? 'dark' : 'light';

  return {
    theme,
    themeColor,
    darkValue,
  };
};

export default useAppTheme;
