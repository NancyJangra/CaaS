const STORAGE_KEY = 'caas_theme'; // preference only — never secrets
export const THEME_EVENT = 'caas-theme-change';

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* private mode */
  }
  return 'system';
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  // Let other mounted controls (e.g. sidebar toggle, Settings) stay in sync.
  try {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  } catch {
    /* non-browser env */
  }
}

export function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  try {
    return typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * While the stored preference is "system", follow OS-level changes to
 * prefers-color-scheme live. Returns an unsubscribe function.
 */
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  let mql;
  try {
    mql = window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return () => {};
  }
  const onChange = () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  };
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else if (mql.addListener) mql.addListener(onChange);
  return () => {
    if (mql.removeEventListener) mql.removeEventListener('change', onChange);
    else if (mql.removeListener) mql.removeListener(onChange);
  };
}
