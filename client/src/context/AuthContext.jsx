import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth as authApi, ApiError } from '../api/index.js';

const AuthContext = createContext(null);

export const homeFor = (role) =>
  ({
    artisan: '/dashboard/artisan',
    learner: '/dashboard/learner',
    buyer: '/dashboard/buyer',
    reviewer: '/dashboard/reviewer',
    admin: '/admin',
  })[role] || '/';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(authApi.hasToken() ? 'loading' : 'ready');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!authApi.hasToken()) return undefined;
    let alive = true;
    authApi
      .me()
      .then((u) => alive && setUser(u))
      .catch((e) => {
        // Only a definite "no" signs you out; a network hiccup keeps the token for next time.
        if (alive && e instanceof ApiError && [401, 403].includes(e.status)) setUser(null);
      })
      .finally(() => alive && setStatus('ready'));
    return () => {
      alive = false;
    };
  }, []);

  // The API layer announces 401s and paused accounts.
  useEffect(() => {
    const onOut = (e) => {
      setUser(null);
      if (e.detail?.paused) setNotice('paused');
      import('../api/index.js').then(({ tokenStore }) => tokenStore.clear());
    };
    window.addEventListener('vt:signed-out', onOut);
    return () => window.removeEventListener('vt:signed-out', onOut);
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authApi.login(email, password);
    setUser(u);
    setNotice(null);
    return u;
  }, []);
  const register = useCallback(async (body) => {
    const u = await authApi.register(body);
    setUser(u);
    return u;
  }, []);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* already signed out on the server */
    }
    setUser(null);
  }, []);
  const refresh = useCallback(async () => setUser(await authApi.me()), []);

  const value = useMemo(
    () => ({ user, status, notice, login, register, logout, refresh, setUser }),
    [user, status, notice, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
