import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import AppUpdater from '../plugins/AppUpdater';
import { api } from '../api/client';
import { APP_VERSION_CODE } from '../version';
import type { AppVersionResponse } from '../api/types';

export function useAppUpdate() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async (manual = false) => {
    if (checking) return;
    setChecking(true);
    setError(null);
    try {
      const info = await api.getAppVersion();
      if (info.versionCode > APP_VERSION_CODE) {
        setUpdateInfo(info);
        return info;
      } else if (manual) {
        setUpdateInfo(null);
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      if (manual) setError('تعذر التحقق من التحديثات. حاول مرة أخرى لاحقاً.');
    } finally {
      setChecking(false);
    }
    return null;
  }, [checking]);

  const startUpdate = useCallback(async () => {
    if (!updateInfo || !updateInfo.apkUrl || downloading) return;
    
    if (Capacitor.getPlatform() !== 'android') {
      window.open(updateInfo.apkUrl, '_blank');
      return;
    }

    setDownloading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Check permission
      const { allowed } = await AppUpdater.canRequestPackageInstalls();
      if (!allowed) {
        await AppUpdater.openInstallSettings();
        setDownloading(false);
        setError('يرجى السماح بتثبيت التطبيقات من مصادر غير معروفة للمتابعة.');
        return;
      }

      // 2. Add listener
      const listener = await AppUpdater.addListener('progress', (data) => {
        setProgress(data.progress);
      });

      // 3. Download and Install
      await AppUpdater.downloadApk({
        url: updateInfo.apkUrl,
        sha256: updateInfo.sha256,
        size: updateInfo.size,
        fileName: `yemen-telecom-v${updateInfo.version}.apk`
      });

      // If successful, the app will transition to the installer or restart.
      // We don't necessarily need to remove listeners as the process might die,
      // but it's good practice.
      listener.remove();

    } catch (err: any) {
      console.error('Update failed:', err);
      setError(err.message || 'فشل تنزيل أو تثبيت التحديث.');
    } finally {
      setDownloading(false);
    }
  }, [updateInfo, downloading]);

  return {
    checking,
    updateInfo,
    downloading,
    progress,
    error,
    checkForUpdates,
    startUpdate,
    resetError: () => setError(null)
  };
}
