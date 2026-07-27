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
  cancelDownloadApk,
  isNativeApp,
  type AppVersionInfo,
  type UpdateProgress,
} from '../lib/appUpdater';

interface UpdaterState {
  available: AppVersionInfo | null;
  checking: boolean;
  downloading: boolean;
  verifying: boolean;
  progress: number;
  downloaded: number;
  total: number;
  speed: number; // bytes/sec
  etaSeconds: number;
  error: string | null;
  canRetry: boolean;
  needsInstallPermission: boolean;
  showModal: boolean;
}

// Samples used to estimate download speed (bytes/sec).
interface Sample {
  t: number;
  downloaded: number;
}

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({
    available: null,
    checking: false,
    downloading: false,
    verifying: false,
    progress: 0,
    downloaded: 0,
    total: 0,
    speed: 0,
    etaSeconds: 0,
    error: null,
    canRetry: false,
    needsInstallPermission: false,
    showModal: false,
  });
  const checkedRef = useRef(false);
  const downloadingRef = useRef(false);
  const samplesRef = useRef<Sample[]>([]);
  const cancelRef = useRef(false);
  const startUpdateRef = useRef<() => void>(() => {});
  const visibilityGuardRef = useRef(false);

  const estimateSpeed = useCallback((downloaded: number): number => {
    const now = Date.now();
    const samples = samplesRef.current;
    samples.push({ t: now, downloaded });
    while (samples.length > 1 && now - samples[0].t > 10000) samples.shift();
    if (samples.length < 2) return 0;
    const first = samples[0];
    const dt = (now - first.t) / 1000;
    const db = downloaded - first.downloaded;
    if (dt <= 0) return 0;
    return db / dt;
  }, []);

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
          verifying: false,
          progress: 0,
          downloaded: 0,
          total: 0,
          speed: 0,
          etaSeconds: 0,
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
  // screen (where they grant "install from unknown sources"). If the user
  // granted it, we flip needsInstallPermission off AND start the download
  // automatically — the user never has to tap again.
  useEffect(() => {
    if (!isNativeApp) return;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!state.available || downloadingRef.current || state.verifying) return;
      if (visibilityGuardRef.current) return;
      visibilityGuardRef.current = true;
      const allowed = await canInstallPackages();
      if (allowed) {
        setState((s) => (s.needsInstallPermission ? { ...s, needsInstallPermission: false } : s));
        // Auto-resume: begin the download immediately.
        startUpdateRef.current();
      } else {
        setState((s) => (!s.needsInstallPermission ? { ...s, needsInstallPermission: true } : s));
      }
      setTimeout(() => { visibilityGuardRef.current = false; }, 1000);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [state.available, state.verifying]);

  const startUpdate = useCallback(async () => {
    if (!state.available || downloadingRef.current) return;
    // Re-check install permission in case the user just granted it.
    const allowed = await canInstallPackages();
    if (!allowed) {
      const launched = await openInstallSettings();
      if (!launched) {
        // No settings screen could be opened (restricted device). Tell the user
        // clearly instead of leaving them stuck on the modal with no path forward.
        setState((s) => ({
          ...s,
          needsInstallPermission: true,
          error: 'تعذّر فتح إعدادات التثبيت تلقائياً. يرجى فتح إعدادات جهازك > التطبيقات > يمن تيليكوم، ثم فعّل «تثبيت التطبيقات غير المعروفة» يدوياً.',
          canRetry: false,
        }));
        return;
      }
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
    cancelRef.current = false;
    samplesRef.current = [];
    setState((s) => ({
      ...s,
      downloading: true,
      verifying: false,
      progress: 0,
      downloaded: 0,
      total: 0,
      speed: 0,
      etaSeconds: 0,
      error: null,
      canRetry: false,
    }));
    try {
      const res = await downloadAndInstallApk(
        state.available.apkUrl,
        { sha256: state.available.sha256, size: state.available.size },
        (p: UpdateProgress) => {
          const dl = p.downloaded || 0;
          const total = p.total || 0;
          const speed = estimateSpeed(dl);
          const remaining = speed > 0 && total > 0 ? (total - dl) / speed : 0;
          setState((s) => ({
            ...s,
            progress: typeof p.progress === 'number' ? p.progress : s.progress,
            downloaded: dl,
            total,
            speed,
            etaSeconds: remaining > 0 ? remaining : 0,
          }));
        }
      );
      // Native side verified SHA-256 + signature and launched the install intent.
      // Show the verification stage briefly before closing the modal.
      setState((s) => ({ ...s, downloading: false, verifying: true, progress: 100 }));
      await new Promise((r) => setTimeout(r, 1400));
      if (res.installed) {
        await reportInstall(state.available);
      }
      setState((s) => ({ ...s, verifying: false, showModal: false, canRetry: false }));
    } catch (err: any) {
      downloadingRef.current = false;
      if (cancelRef.current) {
        // User cancelled — keep the (required) modal open, allow restart.
        setState((s) => ({
          ...s,
          downloading: false,
          verifying: false,
          progress: 0,
          downloaded: 0,
          total: 0,
          speed: 0,
          etaSeconds: 0,
          error: null,
          canRetry: false,
        }));
        return;
      }
      const message = err?.message || 'فشل تنزيل التحديث. حاول مرة أخرى.';
      // Integrity errors (tampered/corrupt) must NOT offer a retry.
      const retry = !isIntegrityError(message);
      setState((s) => ({
        ...s,
        downloading: false,
        verifying: false,
        error: message,
        canRetry: retry,
      }));
    } finally {
      downloadingRef.current = false;
    }
  }, [state.available, state.needsInstallPermission, estimateSpeed]);

  // Keep a stable ref so the visibilitychange auto-resume always calls the
  // latest startUpdate without re-subscribing the listener.
  useEffect(() => {
    startUpdateRef.current = startUpdate;
  }, [startUpdate]);

  const cancel = useCallback(async () => {
    cancelRef.current = true;
    downloadingRef.current = false;
    await cancelDownloadApk();
  }, []);

  const dismiss = useCallback(() => {
    if (state.available?.required) return; // required updates cannot be dismissed
    setState((s) => ({ ...s, showModal: false }));
  }, [state.available]);

  return {
    ...state,
    startUpdate,
    cancel,
    dismiss,
    recheckPermission: check,
  };
}
