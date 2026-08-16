import { useState, useEffect, useCallback } from 'react';
import { Role } from '../types';
import { api, setToken, setRefreshToken, clearTokens, fetchCsrfToken, loadTokens, getLoadedTokens, waitForServerAwake } from '../api/client';
import { setFrontendSentryUser } from '../lib/sentry';
import {
  isNativeBiometrics, isBiometricAvailable, isBiometricEnrolled, authenticateBiometric, getBiometricStatus,
  getBiometricCredential, hasBiometricCredential, clearBiometricCredential,
  saveBiometricCredential,
} from '../services/biometricAuth';

export function useAuth() {
  const [role, setRole] = useState<Role | null>(() => {
    return (localStorage.getItem('tele_role') as Role) || null;
  });
  const [username, setUsername] = useState(() => localStorage.getItem('tele_username') || '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tele_dark') === 'true');
  const [token, setAppToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    if (isNativeBiometrics()) {
      isBiometricAvailable().then(ok => {
        if (ok) setBiometricAvailable(true);
      }).catch(() => {});
      isBiometricEnrolled().then(ok => {
        if (ok) setBiometricEnrolled(true);
      }).catch(() => {});
      hasBiometricCredential().then(ok => {
        if (ok) setBiometricEnabled(true);
      }).catch(() => {});
    }
  }, []);

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
    // The biometric credential is intentionally preserved here: an explicit
    // logout or password change must NOT erase the securely stored credential
    // unless the user explicitly unbinds the device (disableBiometricLogin).
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
    // Never fire the login request while the server is still waking up:
    // block until the boot-time warm-up resolves (instant if already done).
    await waitForServerAwake();
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
      if (isNativeBiometrics() && biometricAvailable && !biometricEnabled && localStorage.getItem('tele_biometric_prompt_dismissed') !== '1') {
        setShowBiometricPrompt(true);
      }
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
    api.logout().catch((err) => console.warn('[auth] logout request failed (session cleared locally):', err));
    clearSession();
  }, [clearSession]);

  const enableBiometricLogin = useCallback(async (usernameToSave: string): Promise<boolean> => {
    if (!isNativeBiometrics()) return false;
    const status = await getBiometricStatus();
    if (!status.isAvailable) {
      throw new Error(status.errorMessage || 'التحقق بالبصمة غير متاح على هذا الجهاز');
    }
    if (!status.isEnrolled) {
      throw new Error('لا توجد بصمة مسجلة على هذا الجهاز. سجّل بصمتك من إعدادات جهازك أولاً');
    }
    const authed = await authenticateBiometric('تأكيد بصمتك لتفعيل الدخول السريع');
    if (!authed) return false;
    const { refreshToken: rt } = getLoadedTokens();
    if (!rt) return false;
    await saveBiometricCredential({ username: usernameToSave, refreshToken: rt, savedAt: Date.now() });
    setBiometricEnabled(true);
    return true;
  }, []);

  const disableBiometricLogin = useCallback(async (): Promise<void> => {
    await clearBiometricCredential();
    setBiometricEnabled(false);
  }, []);

  const dismissBiometricPrompt = useCallback(() => {
    setShowBiometricPrompt(false);
    try { localStorage.setItem('tele_biometric_prompt_dismissed', '1'); } catch {}
  }, []);

  const handleBiometricLogin = useCallback(async (): Promise<{ role: Role; commit: () => void } | null> => {
    if (!isNativeBiometrics()) return null;
    const authed = await authenticateBiometric('استخدم بصمتك للدخول السريع');
    if (!authed) throw new Error('Biometric verification failed');
    const credential = await getBiometricCredential();
    if (!credential) return null;
    // Rotate the stored refresh token into a fresh session.
    setRefreshToken(credential.refreshToken);
    const newToken = await api.refresh();
    if (!newToken) {
      await clearBiometricCredential();
      setBiometricEnabled(false);
      return null;
    }
    setTokenWrapper(newToken);
    // Rotate the stored credential to the freshly issued refresh token so the
    // secure keystore entry never goes stale while the account stays active.
    const { refreshToken: rotated } = getLoadedTokens();
    if (rotated && rotated !== credential.refreshToken) {
      await saveBiometricCredential({ username: credential.username, refreshToken: rotated, savedAt: Date.now() }).catch(() => {});
    }
    const user = await api.getMe().catch(() => null);
    if (!user) {
      clearSession();
      return null;
    }
    setFrontendSentryUser({ id: user.id, username: user.displayName, role: user.role });
    const userRole = user.role as Role;
    return {
      role: userRole,
      commit: () => {
        setRole(userRole);
        setUsername(user.displayName);
        localStorage.setItem('tele_role', userRole);
        localStorage.setItem('tele_username', user.displayName);
        fetchCsrfToken();
      },
    };
  }, [clearSession, setTokenWrapper]);

  return {
    role, setRole, username, setUsername,
    darkMode, setDarkMode, token, setTokenWrapper,
    isLoading, handleLogin, handleLogout, clearSession,
    biometricAvailable, biometricEnrolled, biometricEnabled, enableBiometricLogin, disableBiometricLogin, handleBiometricLogin,
    showBiometricPrompt, dismissBiometricPrompt,
  };
}
