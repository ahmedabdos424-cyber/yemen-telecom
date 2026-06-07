import { useState, useEffect } from 'react';
import { Role } from '../types';
import { api, setToken, setRefreshToken, clearTokens, fetchCsrfToken } from '../api/client';

export function useAuth() {
  const [role, setRole] = useState<Role | null>(() => {
    return (localStorage.getItem('tele_role') as Role) || null;
  });
  const [username, setUsername] = useState(() => localStorage.getItem('tele_username') || '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tele_dark') === 'true');
  const [token, setAppToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const setTokenWrapper = (t: string | null) => {
    setAppToken(t);
    setToken(t);
  };

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Verify JWT on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedRole = localStorage.getItem('tele_role');
    if (savedToken && savedRole) {
      api.getMe()
        .then((user) => {
          if (user.role !== savedRole) {
            clearSession();
          }
          fetchCsrfToken();
        })
        .catch(async () => {
          const newToken = await api.refresh();
          if (newToken) {
            setTokenWrapper(newToken);
            fetchCsrfToken();
          } else {
            clearSession();
          }
        });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tele_dark', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const clearSession = () => {
    clearTokens();
    localStorage.removeItem('tele_role');
    localStorage.removeItem('tele_username');
    localStorage.removeItem('tele_role_tab');
    localStorage.removeItem('tele_manager_view');
    setRole(null);
    setUsername('');
    setTokenWrapper(null);
  };

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
      setTokenWrapper(result.token);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      const userRole = result.user.role as Role;
      return {
        role: userRole,
        commit: () => apply(userRole, result.user.displayName),
      };
    } catch {
      return null;
    }
    return null;
  };

  const handleLogout = () => {
    api.logout().catch(() => {});
    clearSession();
  };

  return {
    role, setRole, username, setUsername,
    darkMode, setDarkMode, token, setTokenWrapper,
    isLoading, handleLogin, handleLogout, clearSession,
  };
}
