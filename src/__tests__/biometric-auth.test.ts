import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isBiometricAvailable,
  authenticateBiometric,
  saveBiometricCredential,
  getBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  isNativeBiometrics,
} from '../services/biometricAuth';

const mockCheckBiometry = vi.fn();
const mockAuthenticate = vi.fn();

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: {
    checkBiometry: (...args: unknown[]) => mockCheckBiometry(...args),
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  },
}));

vi.mock('../lib/monitor', () => ({
  captureError: vi.fn(),
}));

const ORIGINAL_CAPACITOR = (window as unknown as { Capacitor?: unknown }).Capacitor;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCheckBiometry.mockResolvedValue({ isAvailable: true });
  mockAuthenticate.mockResolvedValue(undefined);
  (window as unknown as { Capacitor?: unknown }).Capacitor = { isNative: true };
});

function setNative(val: boolean) {
  if (val) {
    (window as unknown as { Capacitor?: unknown }).Capacitor = { isNative: true };
  } else {
    (window as unknown as { Capacitor?: unknown }).Capacitor = undefined;
  }
}

describe('biometricAuth', () => {
  it('isNativeBiometrics returns true when Capacitor native', () => {
    setNative(true);
    expect(isNativeBiometrics()).toBe(true);
  });

  it('isNativeBiometrics returns false on web', () => {
    setNative(false);
    expect(isNativeBiometrics()).toBe(false);
  });

  it('isBiometricAvailable returns false when not native', async () => {
    setNative(false);
    expect(await isBiometricAvailable()).toBe(false);
    expect(mockCheckBiometry).not.toHaveBeenCalled();
  });

  it('isBiometricAvailable returns true when biometry available', async () => {
    setNative(true);
    expect(await isBiometricAvailable()).toBe(true);
    expect(mockCheckBiometry).toHaveBeenCalled();
  });

  it('isBiometricAvailable returns false when checkBiometry throws', async () => {
    setNative(true);
    mockCheckBiometry.mockRejectedValue(new Error('no biometry'));
    expect(await isBiometricAvailable()).toBe(false);
  });

  it('authenticateBiometric returns false when not native', async () => {
    setNative(false);
    expect(await authenticateBiometric()).toBe(false);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('authenticateBiometric returns true on success', async () => {
    setNative(true);
    expect(await authenticateBiometric('reason')).toBe(true);
    expect(mockAuthenticate).toHaveBeenCalledWith(expect.objectContaining({ reason: 'reason', allowDeviceCredential: true }));
  });

  it('authenticateBiometric returns false on userCancel', async () => {
    setNative(true);
    mockAuthenticate.mockRejectedValue({ code: 'userCancel' });
    expect(await authenticateBiometric()).toBe(false);
  });

  it('authenticateBiometric returns false on systemCancel', async () => {
    setNative(true);
    mockAuthenticate.mockRejectedValue({ code: 'systemCancel' });
    expect(await authenticateBiometric()).toBe(false);
  });

  it('authenticateBiometric returns false on other errors', async () => {
    setNative(true);
    mockAuthenticate.mockRejectedValue(new Error('hardware error'));
    expect(await authenticateBiometric()).toBe(false);
  });

  it('save/get credential roundtrip', async () => {
    setNative(true);
    await saveBiometricCredential({ username: 'seller1', refreshToken: 'rt-abc', savedAt: 123 });
    const cred = await getBiometricCredential();
    expect(cred).toEqual({ username: 'seller1', refreshToken: 'rt-abc', savedAt: 123 });
  });

  it('hasBiometricCredential false when empty', async () => {
    setNative(true);
    expect(await hasBiometricCredential()).toBe(false);
  });

  it('clearBiometricCredential removes credential', async () => {
    setNative(true);
    await saveBiometricCredential({ username: 'seller1', refreshToken: 'rt-abc', savedAt: 123 });
    await clearBiometricCredential();
    expect(await hasBiometricCredential()).toBe(false);
  });

  it('getBiometricCredential returns null for malformed data', async () => {
    setNative(true);
    localStorage.setItem('tele_biometric_credential', '{"username":"x"}');
    expect(await getBiometricCredential()).toBeNull();
  });

  it('getBiometricCredential returns null for invalid JSON', async () => {
    setNative(true);
    localStorage.setItem('tele_biometric_credential', 'not-json');
    expect(await getBiometricCredential()).toBeNull();
  });

  it('credential stored in localStorage on web fallback', async () => {
    vi.resetModules();
    const fresh = await import('../services/biometricAuth');
    setNative(false);
    await fresh.saveBiometricCredential({ username: 'seller1', refreshToken: 'rt-abc', savedAt: 123 });
    expect(localStorage.getItem('tele_biometric_credential')).toContain('rt-abc');
  });
});
