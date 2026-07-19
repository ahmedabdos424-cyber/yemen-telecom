// In-app self-update system for the Android APK (no Google Play).
// Flow: on app open -> light GET /api/app-version -> compare with installed version.
// If newer -> show modal -> download via native AppUpdater plugin -> install -> delete APK.

import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

function apiBase(): string {
  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.');
  return isNative
    ? 'https://yemen-telecom.onrender.com/api'
    : import.meta.env.DEV || isLocal
      ? '/api'
      : 'https://yemen-telecom.onrender.com/api';
}

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  size: number;
  notes: string[];
  required: boolean;
  checkedAt: string;
}

// Errors that mean retrying the download is useless (file is corrupt/tampered).
const INTEGRITY_ERRORS = ['ملف التحديث تالف'];

export function isIntegrityError(message: string | null): boolean {
  if (!message) return false;
  return INTEGRITY_ERRORS.some((e) => message.includes(e));
}

export interface UpdateProgress {
  progress: number; // 0..100
  downloaded: number;
  total: number;
  path?: string;
  installed?: boolean;
}

// Read the installed app version + versionCode from build-time constants
// (injected from android/app/build.gradle). This is the source of truth for
// the downgrade guard on the client side.
export function getInstalledVersion(): { version: string; versionCode: number } {
  const version = (import.meta.env.VITE_APP_VERSION as string) || '1.0.0';
  const versionCode = (import.meta.env.VITE_APP_VERSION_CODE as number) || 0;
  return { version, versionCode };
}

export async function fetchLatestVersion(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(`${apiBase()}/app-version`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AppVersionInfo;
  } catch {
    return null;
  }
}

// Semantic-ish compare: returns true if `latest` is newer than `current`.
export function isNewer(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v
      .split('.')
      .map((n) => parseInt(n.replace(/\D/g, ''), 10) || 0)
      .concat([0, 0, 0])
      .slice(0, 3);
  const a = parse(current);
  const b = parse(latest);
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true;
    if (b[i] < a[i]) return false;
  }
  return false;
}

// Downgrade guard: refuse to install an APK whose versionCode is lower than or
// equal to the installed one, even if versionName was spoofed to look newer.
export function isDowngrade(currentCode: number, latestCode: number): boolean {
  if (currentCode <= 0 || latestCode <= 0) return false; // unknown -> don't block
  return latestCode <= currentCode;
}

// Stable per-install device id (stored in Capacitor Preferences when available).
let cachedDeviceId: string | null = null;
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const prefs = (window as any).Capacitor?.Plugins?.Preferences;
    if (prefs) {
      const { value } = await prefs.get({ key: 'yt_device_id' });
      if (value) {
        cachedDeviceId = value;
        return value;
      }
      const id = 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      await prefs.set({ key: 'yt_device_id', value: id });
      cachedDeviceId = id;
      return id;
    }
  } catch {
    /* ignore */
  }
  cachedDeviceId = 'd_' + Math.random().toString(36).slice(2);
  return cachedDeviceId;
}

// Report a successful install to the operator (who updated / who didn't).
export async function reportInstall(installed: AppVersionInfo): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await fetch(`${apiBase()}/app-update-installed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        deviceId,
        version: installed.version,
        versionCode: installed.versionCode,
      }),
      cache: 'no-store',
    });
  } catch {
    /* non-critical */
  }
}

// ---- Native bridge (Capacitor plugin "AppUpdater") ----

async function callNative<T = any>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  // @ts-ignore - dynamic native plugin bridge
  const bridge = (window as any).Capacitor?.Plugins?.AppUpdater;
  if (!bridge) throw new Error('AppUpdater plugin unavailable');
  return bridge[method](payload);
}

export async function canInstallPackages(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await callNative<{ allowed: boolean }>('canRequestPackageInstalls');
    return !!r.allowed;
  } catch {
    return false;
  }
}

export async function openInstallSettings(): Promise<void> {
  if (!isNative) return;
  await callNative('openInstallSettings');
}

// Downloads the APK via the native plugin and streams progress through onProgress.
// The native side verifies size + SHA-256 and rejects with "ملف التحديث تالف"
// (or "انتهت مهلة التنزيل") on failure. On success it launches the install intent.
export function downloadAndInstallApk(
  apkUrl: string,
  options: { sha256?: string; size?: number },
  onProgress: (p: UpdateProgress) => void
): Promise<{ path?: string; installed?: boolean }> {
  return new Promise((resolve, reject) => {
    if (!isNative) {
      reject(new Error('Native update only available on Android'));
      return;
    }
    const bridge = (window as any).Capacitor?.Plugins?.AppUpdater;
    if (!bridge) {
      reject(new Error('AppUpdater plugin unavailable'));
      return;
    }
    let listener: any = null;
    if (bridge.addListener) {
      listener = bridge.addListener('progress', (event: UpdateProgress) => {
        onProgress(event);
      });
    }
    bridge
      .downloadApk({
        url: apkUrl,
        fileName: 'yemen-telecom-update.apk',
        sha256: options.sha256 || '',
        size: options.size || 0,
      })
      .then((res: { path?: string; installed?: boolean }) => {
        if (listener && listener.remove) listener.remove();
        onProgress({ progress: 100, downloaded: 0, total: 0, path: res.path, installed: res.installed });
        resolve(res);
      })
      .catch((err: any) => {
        if (listener && listener.remove) listener.remove();
        reject(err);
      });
  });
}

export async function deleteDownloadedApk(path?: string): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await callNative<{ deleted: boolean }>('deleteApk', path ? { path } : {});
    return !!r.deleted;
  } catch {
    return false;
  }
}

// Cancels an in-progress download (native DownloadManager removal). The required
// update screen stays open — the user can start the download again.
export async function cancelDownloadApk(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await callNative<{ cancelled: boolean }>('cancelDownload');
    return !!r.cancelled;
  } catch {
    return false;
  }
}

export const isNativeApp = isNative;
