import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | unauthenticated
  // One-time API key from signup — memory only, never persisted
  const [pendingApiKey, setPendingApiKey] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMe();
      const profile = data.user || data;
      setUser(profile);
      setStatus('authenticated');
      return profile;
    } catch (err) {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMe();
        if (cancelled) return;
        setUser(data.user || data);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(async ({ email, password }) => {
    const data = await api.signup({ email, password });
    const profile = data.user;
    setUser(profile);
    setStatus('authenticated');
    if (data.apiKey) {
      setPendingApiKey(data.apiKey);
    }
    return data;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await api.login({ email, password });
    const profile = data.user || (await api.getMe()).user;
    setUser(profile);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // still clear local state
    }
    setUser(null);
    setPendingApiKey(null);
    setStatus('unauthenticated');
  }, []);

  const clearPendingApiKey = useCallback(() => {
    setPendingApiKey(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      pendingApiKey,
      signup,
      login,
      logout,
      refresh,
      clearPendingApiKey,
      setPendingApiKey,
    }),
    [user, status, pendingApiKey, signup, login, logout, refresh, clearPendingApiKey]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
