import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isBiometricAvailable,
  isBiometricEnrolled,
  getBiometricStatus,
  authenticateBiometric,
  saveBiometricCredential,
  getBiometricCredential,
  clearBiometricCredential,
  hasBiometricCredential,
  isNativeBiometrics,
} from '../services/biometricAuth';

const mockCheckBiometry = vi.fn();
const mockAuthenticate = vi.fn();
const mockEncrypt = vi.fn();
const mockDecrypt = vi.fn();

vi.mock('../plugins/BiometricAuth', () => ({
  default: {
    checkBiometry: (...args: unknown[]) => mockCheckBiometry(...args),
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
    encrypt: (...args: unknown[]) => mockEncrypt(...args),
    decrypt: (...args: unknown[]) => mockDecrypt(...args),
  },
}));

vi.mock('../lib/monitor', () => ({
  captureError: vi.fn(),
}));

const ORIGINAL_CAPACITOR = (window as unknown as { Capacitor?: unknown }).Capacitor;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCheckBiometry.mockResolvedValue({ isAvailable: true, isEnrolled: true, hardwarePresent: true });
  mockAuthenticate.mockResolvedValue({ verified: true });
  mockEncrypt.mockImplementation(async (data: string) => ({
    iv: 'aXZhbGlkLXZhbHVl',
    ciphertext: btoa(data),
  }));
  mockDecrypt.mockImplementation(async (_iv: string, ciphertext: string) => ({
    data: atob(ciphertext),
  }));
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

  it('isBiometricEnrolled returns true when a fingerprint is enrolled', async () => {
    setNative(true);
    expect(await isBiometricEnrolled()).toBe(true);
  });

  it('isBiometricEnrolled returns false when no fingerprint enrolled', async () => {
    setNative(true);
    mockCheckBiometry.mockResolvedValue({ isAvailable: false, isEnrolled: false, hardwarePresent: true });
    expect(await isBiometricEnrolled()).toBe(false);
  });

  it('getBiometricStatus reports no hardware', async () => {
    setNative(true);
    mockCheckBiometry.mockResolvedValue({ isAvailable: false, isEnrolled: false, hardwarePresent: false, errorMessage: 'هذا الجهاز لا يدعم التحقق بالبصمة' });
    const status = await getBiometricStatus();
    expect(status.isAvailable).toBe(false);
    expect(status.isEnrolled).toBe(false);
    expect(status.hardwarePresent).toBe(false);
    expect(status.errorMessage).toContain('لا يدعم');
  });

  it('getBiometricStatus falls back to unavailable on web', async () => {
    setNative(false);
    const status = await getBiometricStatus();
    expect(status.isAvailable).toBe(false);
    expect(status.hardwarePresent).toBe(false);
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

  it('authenticateBiometric returns false when native result is not verified', async () => {
    setNative(true);
    mockAuthenticate.mockResolvedValue(undefined);
    expect(await authenticateBiometric()).toBe(false);
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

  it('native save stores an encrypted envelope, not the raw token', async () => {
    setNative(true);
    await saveBiometricCredential({ username: 'manager1', refreshToken: 'rt-secret-xyz', savedAt: 999 });
    const raw = localStorage.getItem('CapacitorStorage.tele_biometric_credential');
    expect(raw).toContain('"v":1');
    expect(raw).not.toContain('rt-secret-xyz');
    expect(raw).toContain('"data"');
    expect(mockEncrypt).toHaveBeenCalledWith(expect.stringContaining('rt-secret-xyz'));
  });

  it('native get decrypts the envelope back to the credential', async () => {
    setNative(true);
    await saveBiometricCredential({ username: 'manager1', refreshToken: 'rt-secret-xyz', savedAt: 999 });
    const cred = await getBiometricCredential();
    expect(cred).toEqual({ username: 'manager1', refreshToken: 'rt-secret-xyz', savedAt: 999 });
    expect(mockDecrypt).toHaveBeenCalledWith('aXZhbGlkLXZhbHVl', expect.any(String));
  });

  it('native get clears the record and returns null when decrypt fails', async () => {
    setNative(true);
    mockDecrypt.mockRejectedValue(new Error('decryptFailed'));
    await saveBiometricCredential({ username: 'manager1', refreshToken: 'rt-secret-xyz', savedAt: 999 });
    expect(await getBiometricCredential()).toBeNull();
    expect(localStorage.getItem('tele_biometric_credential')).toBeNull();
  });

  it('native get treats legacy plaintext envelope as invalid and clears it', async () => {
    setNative(true);
    localStorage.setItem('CapacitorStorage.tele_biometric_credential', '{"username":"x","refreshToken":"rt-old","savedAt":1}');
    expect(await getBiometricCredential()).toBeNull();
    expect(localStorage.getItem('CapacitorStorage.tele_biometric_credential')).toBeNull();
  });

  it('native save falls back gracefully when encrypt is unavailable', async () => {
    setNative(true);
    mockEncrypt.mockRejectedValue(new Error('encryptFailed'));
    await saveBiometricCredential({ username: 'manager1', refreshToken: 'rt-secret-xyz', savedAt: 999 });
    expect(localStorage.getItem('tele_biometric_credential')).toBeNull();
    expect(await getBiometricCredential()).toBeNull();
  });
});
