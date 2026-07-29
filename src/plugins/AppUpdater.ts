import { registerPlugin } from '@capacitor/core';

export interface AppUpdaterPlugin {
  downloadApk(options: { url: string; fileName?: string; sha256?: string; size?: number }): Promise<{
    progress: number;
    path: string;
    installed: boolean;
    verified: boolean;
  }>;
  cancelDownload(): Promise<{ cancelled: boolean }>;
  deleteApk(options?: { path?: string }): Promise<{ deleted: boolean }>;
  canRequestPackageInstalls(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<{ launched: boolean }>;
  addListener(eventName: 'progress', listenerFunc: (data: { progress: number; downloaded: number; total: number }) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

export default AppUpdater;
