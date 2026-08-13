import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { api } from '../api/client';
import { captureError } from '../lib/monitor';

const TOKEN_KEY = 'tele_fcm_token';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

let messageHandler: ((payload: PushNotificationPayload) => void) | null = null;
let notificationListenerHandle: PluginListenerHandle | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function isPushSupported(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await FirebaseMessaging.getToken();
    return true;
  } catch {
    return false;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await FirebaseMessaging.requestPermissions();
    return status.receive === 'granted';
  } catch (err) {
    captureError(err, 'requestPushPermission');
    return false;
  }
}

export async function getPushToken(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { token } = await FirebaseMessaging.getToken();
    if (token) localStorage.setItem(TOKEN_KEY, token);
    return token ?? null;
  } catch (err) {
    captureError(err, 'getPushToken');
    return null;
  }
}

export function getStoredPushToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Full init: permission -> token -> register on server. Safe to call at startup;
// no-ops on web and whenever permission is denied.
export async function initPushNotifications(onMessage?: (payload: PushNotificationPayload) => void): Promise<boolean> {
  if (!isNative()) return false;
  messageHandler = onMessage ?? null;
  try {
    const granted = await requestPushPermission();
    if (!granted) return false;
    const token = await getPushToken();
    if (!token) return false;
    try {
      await api.registerDeviceToken(token, 'android');
    } catch (err) {
      // Token is stored locally; the server registration is retried on next
      // login/startup when connectivity returns.
      captureError(err, 'registerDeviceToken');
    }
    notificationListenerHandle = await FirebaseMessaging.addListener('notificationReceived', (event) => {
      const notif = event.notification as { title?: string; body?: string; data?: unknown } | undefined;
      const payload: PushNotificationPayload = {
        title: notif?.title ?? '',
        body: notif?.body ?? '',
        data: (notif?.data as Record<string, string> | undefined) ?? undefined,
      };
      messageHandler?.(payload);
    });
    return true;
  } catch (err) {
    captureError(err, 'initPushNotifications');
    return false;
  }
}

// Tear down the in-process notification listener and clear the message
// handler. Call this on logout / role change so listeners don't accumulate
// across repeated logins (Capacitor listeners are not auto-removed). It does
// NOT unregister the device token from the server.
export async function removePushListeners(): Promise<void> {
  messageHandler = null;
  if (notificationListenerHandle) {
    try {
      await notificationListenerHandle.remove();
    } catch {
      /* listener may already be detached */
    }
    notificationListenerHandle = null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!isNative()) return;
  await removePushListeners();
  const token = getStoredPushToken();
  if (token) {
    try {
      await api.unregisterDeviceToken(token);
    } catch {
      /* best-effort */
    }
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Topic-based subscription helpers (server pushes to roles, not topics, so these
// are kept for future targeted campaigns).
export async function subscribeToTopic(topic: string): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseMessaging.subscribeToTopic({ topic });
  } catch (err) {
    captureError(err, 'subscribeToTopic');
  }
}

export async function unsubscribeFromTopic(topic: string): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseMessaging.unsubscribeFromTopic({ topic });
  } catch (err) {
    captureError(err, 'unsubscribeFromTopic');
  }
}
