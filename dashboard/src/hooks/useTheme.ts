import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'lab-dashboard.theme';

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** The current colour theme and a setter that remembers the choice. index.html applies it before the first paint. */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const setTheme = useCallback((nextTheme: Theme) => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      // Storage can be blocked; the theme still applies until the page reloads.
      console.warn('Cannot save the theme', error);
    }
    setThemeState(nextTheme);
  }, []);

  return { theme, setTheme };
}
