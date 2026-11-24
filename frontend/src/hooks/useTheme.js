import { useCallback, useEffect, useState } from 'react';
import { THEME_EVENT, applyTheme, getStoredTheme, resolveTheme, setStoredTheme } from '../utils/theme';

/**
 * Theme preference ('light' | 'dark' | 'system') shared by every control
 * that changes it. Persists to the existing `caas_theme` key.
 */
export function useThemePreference() {
  const [theme, setThemeState] = useState(getStoredTheme);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail || getStoredTheme());
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setStoredTheme(next);
    applyTheme(next);
  }, []);

  return [theme, setTheme];
}

/** True when the dark theme is currently applied to <html>. */
export function useIsDark() {
  const read = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [isDark, setIsDark] = useState(read);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined;
    const obs = new MutationObserver(() => setIsDark(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}

export { resolveTheme };
