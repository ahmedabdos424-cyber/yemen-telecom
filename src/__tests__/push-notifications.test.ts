import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';

const mockRequestPermissions = vi.fn();
const mockGetToken = vi.fn();
const mockAddListener = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockApiRegister = vi.fn();
const mockApiUnregister = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

vi.mock('@capacitor-firebase/messaging', () => ({
  FirebaseMessaging: {
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
    getToken: (...args: unknown[]) => mockGetToken(...args),
    addListener: (...args: unknown[]) => mockAddListener(...args),
    subscribeToTopic: (...args: unknown[]) => mockSubscribe(...args),
    unsubscribeFromTopic: (...args: unknown[]) => mockUnsubscribe(...args),
  },
}));

vi.mock('../api/client', () => ({
  api: {
    registerDeviceToken: (...args: unknown[]) => mockApiRegister(...args),
    unregisterDeviceToken: (...args: unknown[]) => mockApiUnregister(...args),
  },
}));

vi.mock('../lib/monitor', () => ({
  captureError: vi.fn(),
}));

import {
  initPushNotifications,
  requestPushPermission,
  getPushToken,
  isPushSupported,
  unregisterPushNotifications,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '../services/pushNotifications';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockRequestPermissions.mockResolvedValue({ receive: 'granted' });
  mockGetToken.mockResolvedValue({ token: 'fcm-token-123' });
  mockAddListener.mockResolvedValue({ remove: vi.fn() });
  mockApiRegister.mockResolvedValue({ success: true });
  mockApiUnregister.mockResolvedValue({ success: true });
  (Capacitor.isNativePlatform as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

describe('pushNotifications', () => {
  it('isPushSupported returns false on web', async () => {
    (Capacitor.isNativePlatform as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(await isPushSupported()).toBe(false);
  });

  it('requestPushPermission returns true when granted', async () => {
    expect(await requestPushPermission()).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it('requestPushPermission returns false when denied', async () => {
    mockRequestPermissions.mockResolvedValue({ receive: 'denied' });
    expect(await requestPushPermission()).toBe(false);
  });

  it('requestPushPermission returns false on web', async () => {
    (Capacitor.isNativePlatform as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(await requestPushPermission()).toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('getPushToken returns token and caches it', async () => {
    expect(await getPushToken()).toBe('fcm-token-123');
    expect(localStorage.getItem('tele_fcm_token')).toBe('fcm-token-123');
  });

  it('getPushToken returns null on error', async () => {
    mockGetToken.mockRejectedValue(new Error('no token'));
    expect(await getPushToken()).toBeNull();
  });

  it('initPushNotifications registers token on server', async () => {
    const onMessage = vi.fn();
    const ok = await initPushNotifications(onMessage);
    expect(ok).toBe(true);
    expect(mockApiRegister).toHaveBeenCalledWith('fcm-token-123', 'android');
    expect(mockAddListener).toHaveBeenCalledWith('notificationReceived', expect.any(Function));
  });

  it('initPushNotifications returns false when permission denied', async () => {
    mockRequestPermissions.mockResolvedValue({ receive: 'denied' });
    expect(await initPushNotifications()).toBe(false);
    expect(mockApiRegister).not.toHaveBeenCalled();
  });

  it('initPushNotifications returns false when no token', async () => {
    mockGetToken.mockResolvedValue({ token: '' });
    expect(await initPushNotifications()).toBe(false);
  });

  it('initPushNotifications returns false on web', async () => {
    (Capacitor.isNativePlatform as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(await initPushNotifications()).toBe(false);
  });

  it('foreground message invokes handler with notification fields', async () => {
    const onMessage = vi.fn();
    await initPushNotifications(onMessage);
    const [, listener] = mockAddListener.mock.calls[0];
    listener({
      notification: { title: 'تنبيه', body: 'نص التنبيه' },
    });
    expect(onMessage).toHaveBeenCalledWith({ title: 'تنبيه', body: 'نص التنبيه', data: undefined });
  });

  it('unregisterPushNotifications removes token from server and local', async () => {
    localStorage.setItem('tele_fcm_token', 'fcm-token-123');
    await unregisterPushNotifications();
    expect(mockApiUnregister).toHaveBeenCalledWith('fcm-token-123');
    expect(localStorage.getItem('tele_fcm_token')).toBeNull();
  });

  it('unregisterPushNotifications no-ops without stored token', async () => {
    await unregisterPushNotifications();
    expect(mockApiUnregister).not.toHaveBeenCalled();
  });

  it('subscribeToTopic calls plugin', async () => {
    await subscribeToTopic('alerts');
    expect(mockSubscribe).toHaveBeenCalledWith({ topic: 'alerts' });
  });

  it('unsubscribeFromTopic calls plugin', async () => {
    await unsubscribeFromTopic('alerts');
    expect(mockUnsubscribe).toHaveBeenCalledWith({ topic: 'alerts' });
  });
});
