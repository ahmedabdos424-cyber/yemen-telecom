import { useState, useEffect, useCallback } from 'react';
import { Role } from '../types';
import { api, setToken, setRefreshToken, clearTokens, fetchCsrfToken, loadTokens, getLoadedTokens } from '../api/client';
import { setFrontendSentryUser } from '../lib/sentry';

export function useAuth() {
  const [role, setRole] = useState<Role | null>(() => {
    return (localStorage.getItem('tele_role') as Role) || null;
  });
  const [username, setUsername] = useState(() => localStorage.getItem('tele_username') || '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tele_dark') === 'true');
  const [token, setAppToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setTokenWrapper = useCallback((t: string | null) => {
    setAppToken(t);
    setToken(t);
  }, []);

  const clearSession = useCallback(() => {
    clearTokens();
    localStorage.removeItem('tele_role');
    localStorage.removeItem('tele_username');
    localStorage.removeItem('tele_role_tab');
    localStorage.removeItem('tele_manager_view');
    setRole(null);
    setUsername('');
    setTokenWrapper(null);
    setFrontendSentryUser(null);
  }, [setTokenWrapper]);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    (async () => {
      await loadTokens();
      if (cancelled) return;
      const { authToken: savedToken } = getLoadedTokens();
      const savedRole = localStorage.getItem('tele_role');
      if (savedToken && savedRole) {
        setAppToken(savedToken);
        try {
          const user = await api.getMe();
          if (cancelled) return;
          if (!user) { clearSession(); return; }
          if (user.role !== savedRole) {
            clearSession();
            return;
          }
          setFrontendSentryUser({ id: user.id, username: user.username, role: user.role });
          fetchCsrfToken();
        } catch {
          if (cancelled) return;
          const newToken = await api.refresh();
          if (newToken) {
            setTokenWrapper(newToken);
            fetchCsrfToken();
          } else {
            clearSession();
          }
        }
      }
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(r => setTimeout(r, 800 - elapsed));
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clearSession, setTokenWrapper]);

  useEffect(() => {
    localStorage.setItem('tele_dark', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleLogin = async (_selectedRole: Role, loggedUser: string, password: string): Promise<{ role: Role; commit: () => void } | null> => {
    const apply = (userRole: Role, displayName: string) => {
      setRole(userRole);
      setUsername(displayName);
      localStorage.setItem('tele_role', userRole);
      localStorage.setItem('tele_username', displayName);
      fetchCsrfToken();
    };
    try {
      const result = await api.login(loggedUser, password);
      if (!result?.user) throw new Error('Login response missing user');
      setTokenWrapper(result.token);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      const userRole = result.user.role as Role;
      setFrontendSentryUser({ id: result.user.id, username: result.user.displayName, role: userRole });
      return {
        role: userRole,
        commit: () => apply(userRole, result.user.displayName),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isAuthError =
        msg.includes('غير صحيح') ||
        msg.includes('invalid') ||
        msg.includes('unauthorized') ||
        msg.includes('incorrect') ||
        msg.includes('401') ||
        msg.includes('credentials');
      if (isAuthError) return null;
      throw err instanceof Error ? err : new Error('Login failed');
    }
  };

  const handleLogout = useCallback(() => {
    api.logout().catch(() => {});
    clearSession();
  }, [clearSession]);

  return {
    role, setRole, username, setUsername,
    darkMode, setDarkMode, token, setTokenWrapper,
    isLoading, handleLogin, handleLogout, clearSession,
  };
}
