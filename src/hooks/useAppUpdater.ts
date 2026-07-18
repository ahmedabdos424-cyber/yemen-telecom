import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchLatestVersion,
  getInstalledVersion,
  isNewer,
  isDowngrade,
  isIntegrityError,
  downloadAndInstallApk,
  reportInstall,
  canInstallPackages,
  openInstallSettings,
  isNativeApp,
  type AppVersionInfo,
  type UpdateProgress,
} from '../lib/appUpdater';

interface UpdaterState {
  available: AppVersionInfo | null;
  checking: boolean;
  downloading: boolean;
  progress: number;
  error: string | null;
  canRetry: boolean;
  needsInstallPermission: boolean;
  showModal: boolean;
}

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({
    available: null,
    checking: false,
    downloading: false,
    progress: 0,
    error: null,
    canRetry: false,
    needsInstallPermission: false,
    showModal: false,
  });
  const checkedRef = useRef(false);
  const downloadingRef = useRef(false);

  const check = useCallback(async () => {
    if (!isNativeApp || checkedRef.current) return;
    checkedRef.current = true;
    setState((s) => ({ ...s, checking: true }));
    try {
      const installed = getInstalledVersion();
      const latest = await fetchLatestVersion();
      if (
        latest &&
        latest.apkUrl &&
        isNewer(installed.version, latest.version) &&
        !isDowngrade(installed.versionCode, latest.versionCode)
      ) {
        const allowed = await canInstallPackages();
        setState({
          available: latest,
          checking: false,
          downloading: false,
          progress: 0,
          error: null,
          canRetry: false,
          needsInstallPermission: !allowed,
          showModal: true,
        });
      } else {
        setState((s) => ({ ...s, checking: false }));
      }
    } catch {
      setState((s) => ({ ...s, checking: false }));
    }
  }, []);

  // Light check on app open (once).
  useEffect(() => {
    check();
  }, [check]);

  // Re-verify install permission when the user returns from the OS settings
  // screen (where they grant "install from unknown sources"). This flips
  // needsInstallPermission off so the modal's main button starts the download.
  useEffect(() => {
    if (!isNativeApp) return;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!state.available || downloadingRef.current) return;
      const allowed = await canInstallPackages();
      setState((s) => (s.needsInstallPermission === !allowed ? s : { ...s, needsInstallPermission: !allowed }));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [state.available]);

  const startUpdate = useCallback(async () => {
    if (!state.available || downloadingRef.current) return;
    // Re-check install permission in case the user just granted it.
    const allowed = await canInstallPackages();
    if (!allowed) {
      await openInstallSettings();
      // Re-verify after the user returns from settings; if they granted it,
      // proceed straight to download instead of looping back to settings.
      const reAllowed = await canInstallPackages();
      if (!reAllowed) {
        setState((s) => ({ ...s, needsInstallPermission: true }));
        return;
      }
    }
    setState((s) => ({ ...s, needsInstallPermission: false }));
    downloadingRef.current = true;
    setState((s) => ({ ...s, downloading: true, progress: 0, error: null, canRetry: false }));
    try {
      const res = await downloadAndInstallApk(
        state.available.apkUrl,
        { sha256: state.available.sha256, size: state.available.size },
        (p: UpdateProgress) => {
          setState((s) => ({ ...s, progress: Math.max(0, p.progress) }));
        }
      );
      // Install intent launched by the native side. The APK is intentionally
      // NOT deleted here: deleting too early can fail the install on some
      // devices. Stale APKs are cleaned on next app launch instead.
      // Report the successful install to the operator (who updated / who didn't).
      if (res.installed) {
        await reportInstall(state.available);
      }
      setState((s) => ({ ...s, downloading: false, showModal: false, canRetry: false }));
    } catch (err: any) {
      downloadingRef.current = false;
      const message = err?.message || 'فشل تنزيل التحديث. حاول مرة أخرى.';
      // Integrity errors (tampered/corrupt) must NOT offer a retry.
      const retry = !isIntegrityError(message);
      setState((s) => ({
        ...s,
        downloading: false,
        error: message,
        canRetry: retry,
      }));
    } finally {
      downloadingRef.current = false;
    }
  }, [state.available, state.needsInstallPermission]);

  const dismiss = useCallback(() => {
    if (state.available?.required) return; // required updates cannot be dismissed
    setState((s) => ({ ...s, showModal: false }));
  }, [state.available]);

  return {
    ...state,
    startUpdate,
    dismiss,
    recheckPermission: check,
  };
}
