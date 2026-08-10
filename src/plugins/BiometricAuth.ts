import { registerPlugin } from '@capacitor/core';

export interface BiometryStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  hardwarePresent: boolean;
  errorMessage?: string;
}

export interface BiometricAuthOptions {
  reason: string;
  androidTitle?: string;
  androidSubtitle?: string;
  cancelTitle?: string;
  allowDeviceCredential?: boolean;
}

export interface BiometricAuthPlugin {
  checkBiometry(): Promise<BiometryStatus>;
  authenticate(options: BiometricAuthOptions): Promise<{ verified: boolean }>;
  encrypt(data: string): Promise<{ iv: string; ciphertext: string }>;
  decrypt(iv: string, ciphertext: string): Promise<{ data: string }>;
}

const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth');

export default BiometricAuth;
